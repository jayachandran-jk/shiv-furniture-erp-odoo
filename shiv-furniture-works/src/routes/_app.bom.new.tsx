import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useERP } from "@/lib/erp/store";
import { Button, Field, Input, Select, Textarea, Modal } from "@/components/erp/ui";
import { Plus, Trash2, ArrowUp, ArrowDown, ArrowLeft, AlertCircle, Check, Wrench, Lightbulb } from "lucide-react";
import type { BomComponent, BomOperation } from "@/lib/erp/types";
import { BomComponentSelect } from "@/components/erp/BomComponentSelect";

export const Route = createFileRoute("/_app/bom/new")({
  head: () => ({ meta: [{ title: "New Bill of Materials — Shiv Furniture ERP" }] }),
  component: NewBomPage,
});

function NewBomPage() {
  const navigate = useNavigate();
  const { products, workCenters, upsertBom, createWorkCenter, boms } = useERP();

  // State fields
  const [productId, setProductId] = useState("");
  const [qtyProduced, setQtyProduced] = useState(1.0);
  const [version, setVersion] = useState(1);
  const [isActive, setIsActive] = useState(true);
  const [notes, setNotes] = useState("");
  
  const [components, setComponents] = useState<BomComponent[]>([]);
  const [operations, setOperations] = useState<BomOperation[]>([]);

  // Work Center modal state
  const [wcModalOpen, setWcModalOpen] = useState(false);
  const [newWcName, setNewWcName] = useState("");
  const [newWcDesc, setNewWcDesc] = useState("");
  const [newWcCapacity, setNewWcCapacity] = useState(8);
  const [wcError, setWcError] = useState("");

  // Validation / Warnings
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Template states
  const [selectedTemplateBomId, setSelectedTemplateBomId] = useState("");

  const selectedProduct = useMemo(() => products.find(p => p.id === productId), [products, productId]);

  const templateBoms = useMemo(() => {
    if (!selectedProduct) return [];
    const otherProductsInSameCat = products.filter(
      p => p.category === selectedProduct.category && p.id !== selectedProduct.id
    );
    const otherCatIds = new Set(otherProductsInSameCat.map(p => p.id));
    return boms.filter(b => b.isActive && otherCatIds.has(b.productId));
  }, [boms, products, selectedProduct]);

  const handleCopyTemplate = () => {
    const templateBom = boms.find(b => b.id === selectedTemplateBomId);
    if (templateBom && templateBom.components) {
      setComponents(
        templateBom.components.map(c => ({
          productId: c.productId,
          qty: c.qty,
          unitOfMeasure: c.unitOfMeasure || "pcs",
          notes: c.notes || `Copied from ${productName(templateBom.productId)}'s BoM`
        }))
      );
      setSuccessMsg("Components successfully copied from template!");
      setTimeout(() => setSuccessMsg(""), 3000);
    }
  };

  // Product helpers
  const finishedProducts = useMemo(() => {
    return products.filter(p => p.procurementType === "Manufacturing" && p.isActive !== false);
  }, [products]);

  const rawMaterials = useMemo(() => {
    return products.filter(p => (p.procurementType !== "Manufacturing" || p.id !== productId) && (p.isActive !== false || components.some(c => c.productId === p.id)));
  }, [products, productId, components]);

  const productName = (id: string) => products.find(p => p.id === id)?.name || id;

  const getProductFreeQty = (id: string) => {
    const p = products.find(x => x.id === id);
    if (!p) return 0;
    return (p.onHand || 0) - (p.reserved || 0);
  };

  const getProductUnit = (id: string) => {
    const p = products.find(x => x.id === id);
    return p?.sku || "";
  };

  // Add Component row
  const addComponent = () => {
    const firstMat = rawMaterials[0];
    if (!firstMat) return;
    setComponents(prev => [
      ...prev,
      { productId: firstMat.id, qty: 1.0, unitOfMeasure: "pcs", notes: "" }
    ]);
  };

  // Update Component row
  const updateComponent = (index: number, patch: Partial<BomComponent>) => {
    setComponents(prev => prev.map((c, i) => i === index ? { ...c, ...patch } as BomComponent : c));
  };

  // Remove Component row
  const removeComponent = (index: number) => {
    setComponents(prev => prev.filter((_, i) => i !== index));
  };

  // Add Operation row — name is auto-derived from the work center
  const addOperation = () => {
    const firstWc = workCenters[0];
    const newSeq = (operations.length + 1) * 10;
    setOperations(prev => [
      ...prev,
      {
        id: `op-new-${Math.random().toString(36).substring(2, 6)}`,
        sequence: newSeq,
        name: firstWc?.name || "",
        workCenterId: firstWc?.id || "",
        durationMinutes: 30,
        notes: ""
      }
    ]);
  };

  // Update Operation row
  const updateOperation = (index: number, patch: Partial<BomOperation>) => {
    setOperations(prev => prev.map((o, i) => i === index ? { ...o, ...patch } as BomOperation : o));
  };

  // Move Operation row (Up/Down) for sequence sorting
  const moveOperation = (index: number, direction: "up" | "down") => {
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === operations.length - 1) return;

    setOperations(prev => {
      const nextList = [...prev];
      const targetIdx = direction === "up" ? index - 1 : index + 1;
      const temp = nextList[index];
      nextList[index] = nextList[targetIdx];
      nextList[targetIdx] = temp;

      // Re-assign sequences: 10, 20, 30...
      return nextList.map((op, i) => ({ ...op, sequence: (i + 1) * 10 }));
    });
  };

  // Remove Operation row
  const removeOperation = (index: number) => {
    setOperations(prev => {
      const nextList = prev.filter((_, i) => i !== index);
      // Re-sequence
      return nextList.map((op, i) => ({ ...op, sequence: (i + 1) * 10 }));
    });
  };

  // Live Summary metrics
  const summary = useMemo(() => {
    const totalDuration = operations.reduce((acc, op) => acc + (op.durationMinutes || 0), 0);

    // Compute max production runs based on components free stock coverage
    let maxRuns = Infinity;
    if (components.length === 0) {
      maxRuns = 0;
    } else {
      components.forEach(c => {
        const freeStock = getProductFreeQty(c.productId);
        const reqPerRun = c.qty || 0;
        if (reqPerRun <= 0) return;
        const runs = Math.floor(freeStock / reqPerRun);
        if (runs < maxRuns) {
          maxRuns = runs;
        }
      });
    }

    if (maxRuns === Infinity) maxRuns = 0;

    return {
      totalDuration,
      maxRuns: Math.max(0, maxRuns)
    };
  }, [components, operations, products]);

  // Quick Create Work Center handler
  const handleCreateWorkCenter = async (e: React.FormEvent) => {
    e.preventDefault();
    setWcError("");
    try {
      if (!newWcName.trim()) {
        setWcError("Work Center name is required");
        return;
      }
      const newWc = await createWorkCenter({
        name: newWcName,
        description: newWcDesc,
        capacityPerDay: newWcCapacity
      });
      
      // Auto-assign the newly created workcenter to the last operation if editing one
      if (operations.length > 0) {
        setOperations(prev => prev.map((op, i) => i === prev.length - 1 ? { ...op, workCenterId: newWc.id } : op));
      }

      setWcModalOpen(false);
      setNewWcName("");
      setNewWcDesc("");
      setNewWcCapacity(8);
    } catch (err: any) {
      setWcError(err.message || "Failed to create work center");
    }
  };

  // Main Save changes
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!productId) {
      setErrorMsg("Please select a finished product.");
      return;
    }

    if (components.length === 0) {
      setErrorMsg("Please add at least one component raw material.");
      return;
    }

    // Check circular dependency (Component cannot be the finished product)
    const hasCircular = components.some(c => c.productId === productId);
    if (hasCircular) {
      setErrorMsg("A finished product cannot be a component of its own Bill of Materials.");
      return;
    }

    // Auto-sequence operations and ensure name is populated from work center if blank
    const formattedOps = operations.map((op, idx) => {
      const wc = workCenters.find(w => w.id === op.workCenterId);
      return {
        ...op,
        sequence: (idx + 1) * 10,
        name: op.name || wc?.name || `Step ${idx + 1}`
      };
    });

    try {
      await upsertBom({
        id: "bom-new",
        bomReference: "", // Generated by backend
        productId,
        qtyProduced,
        version,
        isActive,
        notes,
        components,
        operations: formattedOps
      });
      navigate({ to: "/bom" });
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to create Bill of Materials");
    }
  };
  
  return (
    <div className="space-y-5">
      <div>
        <Link to="/bom" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Bill of Materials
        </Link>
        <h1 className="mt-1 font-serif text-2xl font-semibold text-foreground">New Bill of Materials</h1>
      </div>

      {errorMsg && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3.5 text-sm text-destructive">
          <AlertCircle className="h-4.5 w-4.5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="flex items-center gap-2 rounded-lg border border-success/30 bg-success/10 p-3.5 text-sm text-success font-medium">
          <Check className="h-4.5 w-4.5 shrink-0 text-success" />
          <span>{successMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Main form settings */}
        <div className="lg:col-span-2 space-y-5">
          {/* Header Card */}
          <div className="rounded-lg border bg-card p-4 shadow-sm space-y-4">
            <h2 className="font-serif text-base font-semibold border-b pb-2 text-foreground">Header Details</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Finished Product">
                <Select value={productId} onChange={e => setProductId(e.target.value)} required>
                  <option value="">-- Choose Finished Product --</option>
                  {finishedProducts.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.sku})
                    </option>
                  ))}
                </Select>
              </Field>

              <div className="grid grid-cols-2 gap-2">
                <Field label="Produced Qty">
                  <Input
                    type="number"
                    min={0.01}
                    step={0.01}
                    value={qtyProduced}
                    onChange={e => setQtyProduced(parseFloat(e.target.value) || 1)}
                    required
                  />
                </Field>
                <Field label="Version">
                  <Input
                    type="number"
                    min={1}
                    step={1}
                    value={version}
                    onChange={e => setVersion(parseInt(e.target.value) || 1)}
                    required
                  />
                </Field>
              </div>
            </div>

            {selectedProduct && (
              <div className="rounded-md bg-muted/30 px-3 py-2 text-xs grid grid-cols-2 gap-2 text-muted-foreground border">
                <div>
                  <strong>Category:</strong> {selectedProduct.category}
                </div>
                <div>
                  <strong>Free Stock:</strong> {getProductFreeQty(selectedProduct.id)} pcs
                </div>
                <div>
                  <strong>SKU:</strong> {selectedProduct.sku}
                </div>
                <div>
                  <strong>Reorder Level:</strong> {selectedProduct.reorderThreshold} pcs
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="isActive"
                checked={isActive}
                onChange={e => setIsActive(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-accent focus:ring-accent"
              />
              <label htmlFor="isActive" className="text-sm font-medium text-foreground cursor-pointer select-none">
                Set as Active Version (Only one active BOM version allowed per product)
              </label>
            </div>

            <Field label="Notes / Specifications">
              <Textarea
                placeholder="Describe options, custom steps or quality parameters..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={2}
              />
            </Field>
          </div>

            {/* Quick Template Copy Banner */}
            {selectedProduct && templateBoms.length > 0 && (
              <div className="rounded-lg border border-accent/20 bg-accent/5 p-3.5 flex flex-wrap items-center justify-between gap-3 text-sm">
                <div className="flex items-center gap-2 text-accent">
                  <Lightbulb className="h-5 w-5 text-accent shrink-0" />
                  <div>
                    <span className="font-semibold text-foreground">Quick Start:</span> Copy components from a similar product in category <span className="font-semibold">"{selectedProduct.category}"</span>.
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Select
                    value={selectedTemplateBomId}
                    onChange={e => setSelectedTemplateBomId(e.target.value)}
                    className="h-8 py-0.5 text-xs w-44"
                  >
                    <option value="">-- Choose Template BoM --</option>
                    {templateBoms.map(tb => {
                      const p = products.find(x => x.id === tb.productId);
                      return (
                        <option key={tb.id} value={tb.id}>
                          {p?.name || tb.productId} (v{tb.version})
                        </option>
                      );
                    })}
                  </Select>
                  <Button
                    type="button"
                    variant="primary"
                    disabled={!selectedTemplateBomId}
                    onClick={handleCopyTemplate}
                    className="h-8 text-xs font-semibold px-3.5"
                  >
                    Copy Components
                  </Button>
                </div>
              </div>
            )}

            {/* Components Card */}
            <div className="rounded-lg border bg-card p-4 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h2 className="font-serif text-base font-semibold text-foreground">Components & Materials</h2>
              <Button type="button" variant="ghost" onClick={addComponent}>
                <Plus className="mr-1 h-3.5 w-3.5" /> Add Row
              </Button>
            </div>

            {components.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                No components added. Click "Add Row" to start adding raw materials.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      <th className="pb-2 w-[45%]">Raw Material Product</th>
                      <th className="pb-2 text-right w-[15%]">Qty Required</th>
                      <th className="pb-2 w-[15%] pl-4">UoM</th>
                      <th className="pb-2 w-[20%]">Notes</th>
                      <th className="pb-2 text-right w-[5%]"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {components.map((c, idx) => {
                      const freeStock = getProductFreeQty(c.productId);
                      const isStockLow = freeStock < c.qty;

                      return (
                        <tr key={idx} className="border-b last:border-0 align-middle">
                          <td className="py-2.5 pr-2">
                            <BomComponentSelect
                              value={c.productId}
                              onChange={val => updateComponent(idx, { productId: val })}
                              products={products}
                              boms={boms}
                              finishedProductId={productId}
                              rawMaterials={rawMaterials}
                            />
                          </td>
                          <td className="py-2.5 pr-2 text-right">
                            <div className="relative inline-block w-full">
                              <Input
                                type="number"
                                min={1}
                                step={1}
                                value={c.qty}
                                onChange={e => {
                                  // Parse and round to 2dp to prevent floating-point drift
                                  const raw = parseFloat(e.target.value);
                                  const rounded = isNaN(raw) ? 1 : Math.round(raw * 100) / 100;
                                  updateComponent(idx, { qty: rounded });
                                }}
                                className={`text-right w-full ${isStockLow ? "border-warning bg-warning/5 pr-7" : ""}`}
                              />
                              {isStockLow && (
                                <span
                                  className="absolute right-2 top-1/2 -translate-y-1/2 text-warning"
                                  title={`Low stock alert: requires ${c.qty} pcs but only ${freeStock} pcs available.`}
                                >
                                  <AlertCircle className="h-4 w-4" />
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-2.5 pl-4 pr-2">
                            <Input
                              value={c.unitOfMeasure || "pcs"}
                              onChange={e => updateComponent(idx, { unitOfMeasure: e.target.value })}
                              placeholder="pcs"
                            />
                          </td>
                          <td className="py-2.5 pr-2">
                            <Input
                              value={c.notes || ""}
                              onChange={e => updateComponent(idx, { notes: e.target.value })}
                              placeholder="e.g. Back panel"
                            />
                          </td>
                          <td className="py-2.5 text-right">
                            <button
                              type="button"
                              onClick={() => removeComponent(idx)}
                              className="text-muted-foreground hover:text-destructive p-1 rounded hover:bg-muted"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Operations Card */}
          <div className="rounded-lg border bg-card p-4 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h2 className="font-serif text-base font-semibold text-foreground">Operations & Production Steps</h2>
              <div className="flex items-center gap-2">
                <Button type="button" variant="ghost" onClick={() => setWcModalOpen(true)}>
                  <Plus className="mr-1 h-3.5 w-3.5" /> + New Work Center
                </Button>
                <Button type="button" variant="ghost" onClick={addOperation}>
                  <Plus className="mr-1 h-3.5 w-3.5" /> Add Step
                </Button>
              </div>
            </div>

            {operations.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                No operations added. Add steps in order of execution.
              </div>
            ) : (
              <div className="space-y-2">
                {operations.map((op, idx) => (
                  <div
                    key={op.id}
                    className="flex flex-wrap items-center gap-2 rounded-lg border bg-card p-3 shadow-sm"
                  >
                    {/* Sequence badge + reorder arrows */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="font-mono text-xs font-semibold bg-muted px-2 py-1 rounded text-muted-foreground">
                        {op.sequence}
                      </span>
                      <div className="flex flex-col gap-0.5">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => moveOperation(idx, "up")}
                          className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                          title="Move step up"
                        >
                          <ArrowUp className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === operations.length - 1}
                          onClick={() => moveOperation(idx, "down")}
                          className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                          title="Move step down"
                        >
                          <ArrowDown className="h-3 w-3" />
                        </button>
                      </div>
                    </div>

                    {/* Work Center dropdown — name auto-derived from selection */}
                    <div className="flex-1 min-w-[180px]">
                      <Select
                        value={op.workCenterId}
                        onChange={e => {
                          const wc = workCenters.find(w => w.id === e.target.value);
                          updateOperation(idx, {
                            workCenterId: e.target.value,
                            name: wc?.name || op.name  // auto-set name from work center
                          });
                        }}
                        required
                      >
                        {workCenters.map(wc => (
                          <option key={wc.id} value={wc.id}>{wc.name}</option>
                        ))}
                      </Select>
                    </div>

                    {/* Duration input */}
                    <div className="w-28 flex items-center gap-1 shrink-0">
                      <Input
                        type="number"
                        min={1}
                        step={1}
                        value={op.durationMinutes}
                        onChange={e => updateOperation(idx, { durationMinutes: parseInt(e.target.value) || 1 })}
                        required
                        className="text-right w-full"
                      />
                      <span className="text-xs text-muted-foreground shrink-0">min</span>
                    </div>

                    {/* Delete */}
                    <div className="shrink-0">
                      <button
                        type="button"
                        onClick={() => removeOperation(idx)}
                        className="text-muted-foreground hover:text-destructive p-1.5 rounded hover:bg-muted"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Summary Card */}
        <div className="space-y-4">
          <div className="rounded-lg border bg-card p-4 shadow-sm space-y-4 sticky top-5">
            <h2 className="font-serif text-base font-semibold border-b pb-2 text-foreground">Summary & Diagnostics</h2>
            
            <div className="space-y-3.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Finished Product:</span>
                <span className="font-medium text-foreground text-right truncate max-w-[150px]">
                  {productId ? productName(productId) : "None Selected"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Produced Batch size:</span>
                <span className="font-mono font-medium">{qtyProduced} units</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Component Items:</span>
                <span className="font-mono font-medium">{components.length} items</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Est. Total Time:</span>
                <span className="font-mono font-medium text-accent">{summary.totalDuration} minutes</span>
              </div>

              <div className="border-t pt-3 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">Stock Coverage</span>
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border ${
                    summary.maxRuns > 5 ? "bg-success/15 text-success border-success/30" : 
                    summary.maxRuns > 0 ? "bg-warning/15 text-warning border-warning/30" : 
                    "bg-destructive/10 text-destructive border-destructive/30"
                  }`}>
                    {summary.maxRuns} runs max
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Based on current component inventory, you have enough free stock to run this BoM <strong>{summary.maxRuns}</strong> times (producing <strong>{summary.maxRuns * qtyProduced}</strong> units).
                </p>
              </div>
            </div>

            <div className="pt-2">
              <Button type="submit" variant="primary" className="w-full py-2 bg-primary text-primary-foreground hover:bg-primary/90">
                Create Bill of Materials
              </Button>
              <Link to="/bom" className="block text-center mt-2 text-xs text-muted-foreground hover:underline">
                Cancel & Discard
              </Link>
            </div>
          </div>
        </div>
      </form>

      {/* Quick Create Work Center Modal */}
      <Modal open={wcModalOpen} onClose={() => setWcModalOpen(false)} title="Quick Create Work Center">
        <form onSubmit={handleCreateWorkCenter} className="space-y-4">
          {wcError && <p className="text-xs text-destructive">{wcError}</p>}
          
          <Field label="Work Center Name">
            <Input
              placeholder="e.g. Polishing Station"
              value={newWcName}
              onChange={e => setNewWcName(e.target.value)}
              required
            />
          </Field>

          <Field label="Description">
            <Textarea
              placeholder="Describe work center functions..."
              value={newWcDesc}
              onChange={e => setNewWcDesc(e.target.value)}
              rows={2}
            />
          </Field>

          <Field label="Daily Capacity (Hours)">
            <Input
              type="number"
              min={1}
              max={24}
              value={newWcCapacity}
              onChange={e => setNewWcCapacity(parseInt(e.target.value) || 8)}
              required
            />
          </Field>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button type="button" variant="ghost" onClick={() => setWcModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Create Work Center
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
