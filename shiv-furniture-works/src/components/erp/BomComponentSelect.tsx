import React, { useState, useMemo, useRef, useEffect } from "react";
import type { Product, BoM } from "@/lib/erp/types";
import { Search, ChevronDown, Check, Star, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface BomComponentSelectProps {
  value: string;
  onChange: (productId: string) => void;
  products: Product[];
  boms: BoM[];
  finishedProductId: string;
  rawMaterials: Product[];
}

export const BomComponentSelect: React.FC<BomComponentSelectProps> = ({
  value,
  onChange,
  products,
  boms,
  finishedProductId,
  rawMaterials,
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [showFinishedGoods, setShowFinishedGoods] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Selected item detail
  const selectedProduct = useMemo(() => products.find(p => p.id === value), [products, value]);

  // Finished Product details
  const finishedProduct = useMemo(() => products.find(p => p.id === finishedProductId), [products, finishedProductId]);

  // Determine free stock
  const getFreeQty = (p: Product) => (p.onHand || 0) - (p.reserved || 0);

  // 1. Scoring & Suggestion Logic
  const scoredSuggestions = useMemo(() => {
    if (!finishedProduct) return [];

    // Consider all active products (excluding finished product itself)
    const candidates = rawMaterials.filter(p => p.id !== finishedProductId);

    const scored = candidates
      .map(p => {
        let score = 0;
        const reasons: string[] = [];

        // Signal: Free stock level
        const freeStock = getFreeQty(p);
        if (freeStock <= 0) {
          score -= 15;
          reasons.push("No free stock available");
        }

        // Signal: Category Match & Historical Usage
        if (finishedProduct.category && p.category === finishedProduct.category) {
          const otherSameCatProducts = products.filter(
            prod => prod.category === finishedProduct.category && prod.id !== finishedProductId
          );
          const otherCatIds = new Set(otherSameCatProducts.map(prod => prod.id));
          const catBoms = boms.filter(bom => bom.isActive && otherCatIds.has(bom.productId));
          
          const usageCount = catBoms.filter(bom =>
            bom.components.some(comp => comp.productId === p.id)
          ).length;

          if (usageCount > 0) {
            score += 25 * usageCount;
            reasons.push(`Matches category: ${finishedProduct.category} (used in ${usageCount} similar BoMs)`);
          }
        }

        // Signal: Historical Co-occurrence / Frequency across all active BoMs
        const coOccurrenceCount = boms.filter(bom =>
          bom.isActive && bom.components.some(comp => comp.productId === p.id)
        ).length;

        if (coOccurrenceCount > 0) {
          score += 5 * coOccurrenceCount;
          reasons.push(`Used in ${coOccurrenceCount} active BoMs`);
        }

        // Signal: Name keyword match
        const fpKeywords = finishedProduct.name.toLowerCase().split(/\s+/).filter(k => k.length > 2);
        const cpKeywords = p.name.toLowerCase().split(/\s+/).filter(k => k.length > 2);
        const overlaps = fpKeywords.filter(k => cpKeywords.some(ck => ck.includes(k) || k.includes(ck)));

        if (overlaps.length > 0) {
          score += 15 * overlaps.length;
          reasons.push(`Name matches: "${overlaps.join(", ")}"`);
        }

        // Signal: Finished Good check (deprioritize sub-assemblies/finished products)
        if (p.procurementType === "Manufacturing") {
          score -= 30;
          reasons.push("Finished goods (assembly)");
        }

        return { product: p, score, reasons };
      })
      // Only suggest items with a positive score
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score);

    return scored;
  }, [products, boms, finishedProduct, finishedProductId, rawMaterials]);

  // Suggestion Fallback list (top in-stock components)
  const finalSuggestions = useMemo(() => {
    if (scoredSuggestions.length > 0) return scoredSuggestions.slice(0, 8);

    // Fallback logic
    return rawMaterials
      .filter(p => p.procurementType !== "Manufacturing")
      .map(p => ({
        product: p,
        score: getFreeQty(p),
        reasons: ["Available in stock"]
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 6);
  }, [scoredSuggestions, rawMaterials]);

  // Filter list based on search and "showFinishedGoods" toggle
  const filteredCandidates = useMemo(() => {
    return rawMaterials.filter(p => {
      // Exclude selected Finished Product
      if (p.id === finishedProductId) return false;

      // Filter by search query
      if (search.trim()) {
        const q = search.toLowerCase();
        if (!p.name.toLowerCase().includes(q) && !p.sku.toLowerCase().includes(q)) {
          return false;
        }
      }

      // Filter by Finished Goods toggle
      if (p.procurementType === "Manufacturing" && !showFinishedGoods) {
        // Allow it if it is the currently selected value for the row
        if (p.id !== value) return false;
      }

      return true;
    });
  }, [rawMaterials, finishedProductId, search, showFinishedGoods, value]);

  // Split filtered list into suggestions vs other products
  const suggestionsSet = useMemo(() => new Set(finalSuggestions.map(s => s.product.id)), [finalSuggestions]);
  
  const otherProducts = useMemo(() => {
    return filteredCandidates.filter(p => !suggestionsSet.has(p.id));
  }, [filteredCandidates, suggestionsSet]);

  const toggleDropdown = () => setOpen(!open);

  const selectProduct = (id: string) => {
    onChange(id);
    setOpen(false);
  };

  return (
    <div className="relative w-full text-left" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={toggleDropdown}
        className="flex h-8 w-full items-center justify-between rounded-md border border-input bg-background px-3 text-sm hover:bg-muted/30 focus:outline-none focus:ring-1 focus:ring-ring text-left"
      >
        <span className={cn("truncate", !selectedProduct && "text-muted-foreground")}>
          {selectedProduct ? (
            `${selectedProduct.name} (Free: ${getFreeQty(selectedProduct)} ${selectedProduct.sku || ""})`
          ) : (
            "-- Select Component Product --"
          )}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
      </button>

      {/* Dropdown Menu Panel */}
      {open && (
        <div className="absolute left-0 right-0 z-50 mt-1 max-h-[380px] min-w-[320px] overflow-y-auto rounded-md border border-border bg-popover p-2.5 text-popover-foreground shadow-lg space-y-2.5">
          {/* Search Box */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search components..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="h-8 w-full rounded-md border border-input bg-background pl-8 pr-2.5 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              autoFocus
            />
          </div>

          {/* Toggle option */}
          <div className="flex items-center gap-1.5 text-xs">
            <input
              type="checkbox"
              id="includeFG"
              checked={showFinishedGoods}
              onChange={e => setShowFinishedGoods(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-gray-300 text-accent focus:ring-accent"
            />
            <label htmlFor="includeFG" className="text-muted-foreground cursor-pointer select-none">
              Include Finished Goods as components
            </label>
          </div>

          <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
            {/* 1. Smart Suggestions Section */}
            {finalSuggestions.length > 0 && !search.trim() && (
              <div className="space-y-1">
                <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-accent px-1">
                  <Star className="h-3 w-3 fill-accent text-accent" />
                  Suggested Components
                </div>
                <div className="space-y-0.5">
                  {finalSuggestions
                    // Filter based on finished goods toggle
                    .filter(s => showFinishedGoods || s.product.procurementType !== "Manufacturing")
                    .map(({ product: p, reasons }) => {
                      const isSelected = p.id === value;
                      const freeStock = getFreeQty(p);
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => selectProduct(p.id)}
                          className={cn(
                            "w-full flex flex-col items-start gap-0.5 rounded px-2.5 py-1.5 text-left text-xs transition-colors hover:bg-muted/60",
                            isSelected && "bg-accent/10 hover:bg-accent/15"
                          )}
                        >
                          <div className="flex w-full items-center justify-between gap-2">
                            <span className="font-medium text-foreground truncate">{p.name}</span>
                            <span className="text-[10px] text-muted-foreground shrink-0 font-mono">
                              Free: {freeStock}
                            </span>
                          </div>
                          {reasons.length > 0 && (
                            <div className="flex w-full items-center justify-between text-[9px] text-muted-foreground mt-0.5">
                              <span className="text-accent bg-accent/5 px-1.5 py-0.25 rounded-full border border-accent/15">
                                {reasons[0]}
                              </span>
                              {isSelected && <Check className="h-3 w-3 text-accent shrink-0" />}
                            </div>
                          )}
                        </button>
                      );
                    })}
                </div>
              </div>
            )}

            {/* 2. Show All Products Collapsible Trigger */}
            <div className="border-t pt-1.5">
              {!showAll && otherProducts.length > 0 && !search.trim() ? (
                <button
                  type="button"
                  onClick={() => setShowAll(true)}
                  className="w-full text-center text-[10px] font-semibold text-accent hover:underline py-1.5"
                >
                  Show all products ({otherProducts.length} more)
                </button>
              ) : (
                <div className="space-y-1">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-1 py-0.5">
                    {search.trim() ? "Search Results" : "All Components"}
                  </div>
                  <div className="space-y-0.5">
                    {(showAll || search.trim() ? filteredCandidates : []).map(p => {
                      const isSelected = p.id === value;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => selectProduct(p.id)}
                          className={cn(
                            "w-full flex items-center justify-between gap-2 rounded px-2.5 py-1 text-left text-xs transition-colors hover:bg-muted/60",
                            isSelected && "bg-accent/10 hover:bg-accent/15"
                          )}
                        >
                          <span className="text-foreground truncate">{p.name}</span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-[10px] font-mono text-muted-foreground">
                              Free: {getFreeQty(p)}
                            </span>
                            {isSelected && <Check className="h-3 w-3 text-accent" />}
                          </div>
                        </button>
                      );
                    })}
                    {filteredCandidates.length === 0 && (
                      <div className="flex items-center gap-1.5 justify-center py-4 text-xs text-muted-foreground">
                        <AlertCircle className="h-4 w-4" />
                        No components match search
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
