import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import { useERP } from "@/lib/erp/store";
import { Button, Field, Input, Select, Textarea, Modal } from "@/components/erp/ui";
import { Plus, Trash2, ArrowUp, ArrowDown, ArrowLeft, AlertCircle, Check, ShieldAlert, History } from "lucide-react";
import type { BomComponent, BomOperation } from "@/lib/erp/types";

export const Route = createFileRoute("/_app/bom/$id")({
  head: () => ({ meta: [{ title: "Edit Bill of Materials — Shiv Furniture ERP" }] }),
  component: BomDetailEditPage,
});

function BomDetailEditPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { boms, products, workCenters, upsertBom, deactivateBom, createWorkCenter, audit } = useERP();

  const originalBom = useMemo(() => {
    return boms.find(b => b.id === id);
  }, [boms, id]);

  // If not found, redirect or show message
  if (!originalBom) {
    return (
      <div className="p-6 text-center space-y-3">
        <AlertCircle className="h-10 w-10 text-destructive mx-auto" />
        <h2 className="font-serif text-lg font-semibold">Bill of Materials Not Found</h2>
        <p className="text-sm text-muted-foreground">The requested BoM record does not exist or has been deleted.</p>
        <Link to="/bom" className="inline-block text-accent hover:underline text-sm font-medium">Back to List</Link>
      </div>
    );
  }

  // State fields
  const [qtyProduced, setQtyProduced] = useState(originalBom.qtyProduced || 1.0);
  const [version, setVersion] = useState(originalBom.version || 1);
  const [isActive, setIsActive] = useState(originalBom.isActive ?? true);
  const [notes, setNotes] = useState(originalBom.notes || "");
  
  const [components, setComponents] = useState<BomComponent[]>([]);
  const [operations, setOperations] = useState<BomOperation[]>([]);

  // Initialize fields on load
  useEffect(() => {
    if (originalBom) {
      setQtyProduced(originalBom.qtyProduced || 1.0);
      setVersion(originalBom.version || 1);
      setIsActive(originalBom.isActive ?? true);
      setNotes(originalBom.notes || "");
      setComponents(originalBom.components || []);
      setOperations(originalBom.operations || []);
    }
  }, [originalBom]);

  // Work Center modal state
  const [wcModalOpen, setWcModalOpen] = useState(false);
  const [newWcName, setNewWcName] = useState("");
  const [newWcDesc, setNewWcDesc] = useState("");
  const [newWcCapacity, setNewWcCapacity] = useState(8);
  const [wcError, setWcError] = useState("");

  // Validation / Warnings
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Check for unsaved changes
  const hasUnsavedChanges = useMemo(() => {
    if (!originalBom) return false;
    const sameHeader = 
      qtyProduced === originalBom.qtyProduced &&
      version === originalBom.version &&
      isActive === originalBom.isActive &&
      notes === originalBom.notes;

    const sameComponents = JSON.stringify(components) === JSON.stringify(originalBom.components);
    const sameOperations = JSON.stringify(operations) === JSON.stringify(originalBom.operations);

    return !sameHeader || !sameComponents || !sameOperations;
  }, [originalBom, qtyProduced, version, isActive, notes, components, operations]);

  // Product helpers
  const productName = (pid: string) => products.find(p => p.id === pid)?.name || pid;
  const productSku = (pid: string) => products.find(p => p.id === pid)?.sku || "";

  const rawMaterials = useMemo(() => {
    return products.filter(p => p.procurementType !== "Manufacturing" || p.id !== originalBom.productId);
  }, [products, originalBom.productId]);

  const getProductFreeQty = (pid: string) => {
    const p = products.find(x => x.id === pid);
    if (!p) return 0;
    return (p.onHand || 0) - (p.reserved || 0);
  };

  const getProductUnit = (pid: string) => {
    const p = products.find(x => x.id === pid);
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

  // Add Operation step
  const addOperation = () => {
    const firstWc = workCenters[0];
    const newSeq = (operations.length + 1) * 10;
    setOperations(prev => [
      ...prev,
      {
        id: `op-new-${Math.random().toString(36).substring(2, 6)}`,
        sequence: newSeq,
        name: "",
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

      return nextList.map((op, i) => ({ ...op, sequence: (i + 1) * 10 }));
    });
  };

  // Remove Operation step
  const removeOperation = (index: number) => {
    setOperations(prev => {
      const nextList = prev.filter((_, i) => i !== index);
      return nextList.map((op, i) => ({ ...op, sequence: (i + 1) * 10 }));
    });
  };

  // Live Summary metrics
  const summary = useMemo(() => {
    const totalDuration = operations.reduce((acc, op) => acc + (op.durationMinutes || 0), 0);

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

  // Audit Logs for this specific BOM
  const bomAudits = useMemo(() => {
    return audit
      .filter(a => a.recordId === id)
      .sort((a, b) => new Date(b.ts || "").getTime() - new Date(a.ts || "").getTime());
  }, [audit, id]);

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

    if (components.length === 0) {
      setErrorMsg("Please add at least one component raw material.");
      return;
    }

    // Check circular dependency
    const hasCircular = components.some(c => c.productId === originalBom.productId);
    if (hasCircular) {
      setErrorMsg("A finished product cannot be a component of its own Bill of Materials.");
      return;
    }

    // Auto-sequence operations
    const formattedOps = operations.map((op, idx) => ({
      ...op,
      sequence: (idx + 1) * 10
    }));

    try {
      await upsertBom({
        ...originalBom,
        qtyProduced,
        version,
        isActive,
        notes,
        components,
        operations: formattedOps
      });
      setSuccessMsg("Bill of Materials updated successfully!");
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to update Bill of Materials");
    }
  };

  const handleDeactivate = async () => {
    setErrorMsg("");
    setSuccessMsg("");
    try {
      await deactivateBom(id);
      setIsActive(false);
      setSuccessMsg("Bill of Materials has been deactivated.");
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to deactivate Bill of Materials");
    }
  };

  return (
    <div className="space-y-5">
      {/* Top Warning Banner for Unsaved Changes */}
      {hasUnsavedChanges && (
        <div className="flex items-center justify-between gap-2 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning animate-pulse shadow-sm">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4.5 w-4.5 shrink-0" />
            <span>You have unsaved changes on this Bill of Materials. Make sure to click <strong>Save Changes</strong> to submit.</span>
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3.5 text-sm text-destructive">
          <AlertCircle className="h-4.5 w-4.5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="flex items-center gap-2 rounded-lg border border-success/30 bg-success/10 p-3.5 text-sm text-success">
          <Check className="h-4.5 w-4.5 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      <div>
        <Link to="/bom" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Bill of Materials
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-3 mt-1">
          <div>
            <h1 className="font-serif text-2xl font-semibold text-foreground flex items-center gap-2">
              {originalBom.bomReference || "BOM-RECORD"}
              <span className="text-xs bg-muted px-2 py-0.5 rounded text-muted-foreground font-mono font-normal">v{version}</span>
            </h1>
            <p className="text-sm text-muted-foreground">
              Recipe for finished goods: <strong>{productName(originalBom.productId)}</strong> ({productSku(originalBom.productId)})
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            {isActive ? (
              <Button type="button" variant="ghost" onClick={handleDeactivate} className="text-destructive hover:bg-destructive/10 border-destructive/20 border">
                Deactivate
              </Button>
            ) : (
              <span className="rounded-md border border-border bg-muted/30 px-2.5 py-1 text-xs text-muted-foreground font-medium">Inactive</span>
            )}
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Main form settings */}
        <div className="lg:col-span-2 space-y-5">
          {/* Header Card */}
          <div className="rounded-lg border bg-card p-4 shadow-sm space-y-4">
            <h2 className="font-serif text-base font-semibold border-b pb-2 text-foreground">Header Details</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Finished Product (Read-only)">
                <Input
                  value={`${productName(originalBom.productId)} (${productSku(originalBom.productId)})`}
                  disabled
                  className="bg-muted text-muted-foreground font-medium cursor-not-allowed"
                />
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
                            <Select
                              value={c.productId}
                              onChange={e => updateComponent(idx, { productId: e.target.value })}
                              className="w-full"
                            >
                              {rawMaterials.map(rm => (
                                <option key={rm.id} value={rm.id}>
                                  {rm.name} (Free: {getProductFreeQty(rm.id)} {getProductUnit(rm.id)})
                                </option>
                              ))}
                            </Select>
                          </td>
                          <td className="py-2.5 pr-2 text-right">
                            <div className="relative inline-block w-full">
                              <Input
                                type="number"
                                min={0.0001}
                                step={0.0001}
                                value={c.qty}
                                onChange={e => updateComponent(idx, { qty: parseFloat(e.target.value) || 0 })}
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
                              placeholder="e.g. Panel backing"
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
                    className="flex flex-wrap items-center gap-2 rounded-lg border bg-card p-3 shadow-sm align-middle"
                  >
                    <div className="flex items-center gap-1.5">
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

                    <div className="flex-1 min-w-[200px]">
                      <Input
                        placeholder="Operation Name (e.g. Cut boards to length)"
                        value={op.name}
                        onChange={e => updateOperation(idx, { name: e.target.value })}
                        required
                        className="w-full"
                      />
                    </div>

                    <div className="w-44">
                      <Select
                        value={op.workCenterId}
                        onChange={e => updateOperation(idx, { workCenterId: e.target.value })}
                        required
                      >
                        {workCenters.map(wc => (
                          <option key={wc.id} value={wc.id}>
                            {wc.name}
                          </option>
                        ))}
                      </Select>
                    </div>

                    <div className="w-28 flex items-center gap-1">
                      <Input
                        type="number"
                        min={1}
                        step={1}
                        value={op.durationMinutes}
                        onChange={e => updateOperation(idx, { durationMinutes: parseInt(e.target.value) || 0 })}
                        required
                        className="text-right w-full"
                      />
                      <span className="text-xs text-muted-foreground">min</span>
                    </div>

                    <div>
                      <button
                        type="button"
                        onClick={() => removeOperation(idx)}
                        className="text-muted-foreground hover:text-destructive p-1.5 rounded hover:bg-muted"
                      >
                        <Trash2 className="h-4.5 w-4.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Summary & Audit Card */}
        <div className="space-y-4">
          <div className="rounded-lg border bg-card p-4 shadow-sm space-y-4 sticky top-5">
            <h2 className="font-serif text-base font-semibold border-b pb-2 text-foreground">Summary & Diagnostics</h2>
            
            <div className="space-y-3.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Finished Product:</span>
                <span className="font-medium text-foreground text-right truncate max-w-[150px]">
                  {productName(originalBom.productId)}
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
              <Button
                type="submit"
                variant="primary"
                className="w-full py-2 bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                disabled={!hasUnsavedChanges}
              >
                Save Changes
              </Button>
              <Link to="/bom" className="block text-center mt-2 text-xs text-muted-foreground hover:underline">
                Back to List
              </Link>
            </div>
          </div>

          {/* Audit Trail Card */}
          {bomAudits.length > 0 && (
            <div className="rounded-lg border bg-card p-4 shadow-sm space-y-3">
              <h2 className="font-serif text-sm font-semibold border-b pb-1.5 flex items-center gap-1.5 text-foreground">
                <History className="h-4 w-4 text-muted-foreground" />
                Audit Log History
              </h2>
              
              <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
                {bomAudits.map(log => (
                  <div key={log.id} className="text-xs space-y-0.5 border-l-2 border-accent/30 pl-2">
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span className="font-medium text-foreground">{log.action}</span>
                      <span>{new Date(log.ts || "").toLocaleDateString()}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate" title={log.newValue || log.oldValue}>
                      {log.newValue ? `Updated details` : `No extra values`}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
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
