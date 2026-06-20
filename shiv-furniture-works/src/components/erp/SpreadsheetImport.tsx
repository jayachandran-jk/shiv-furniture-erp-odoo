import { useState, useRef, useCallback } from "react";
import * as XLSX from "xlsx";
import { Button, Select } from "@/components/erp/ui";
import { Upload, FileSpreadsheet, X, Check, AlertCircle } from "lucide-react";

interface MappedRow {
  productName: string;
  qty: number;
  unitPrice: number;
}

type FieldKey = "productName" | "qty" | "unitPrice" | "__skip__";

const FIELD_OPTIONS: { value: FieldKey; label: string }[] = [
  { value: "__skip__", label: "— Skip —" },
  { value: "productName", label: "Product Name" },
  { value: "qty", label: "Ordered Qty" },
  { value: "unitPrice", label: "Sales Price" },
];

const PRODUCT_PATTERNS = /^(product|item|description|name|product[\s_-]?name|material)$/i;
const QTY_PATTERNS = /^(qty|quantity|ordered[\s_-]?qty|units|count|nos|pcs|pieces)$/i;
const PRICE_PATTERNS = /^(price|rate|unit[\s_-]?price|sales[\s_-]?price|amount|cost|mrp)$/i;

function autoMapColumn(header: string): FieldKey {
  const h = header.trim();
  if (PRODUCT_PATTERNS.test(h)) return "productName";
  if (QTY_PATTERNS.test(h)) return "qty";
  if (PRICE_PATTERNS.test(h)) return "unitPrice";
  return "__skip__";
}

export function SpreadsheetImportButton({
  onImport,
}: {
  onImport: (rows: MappedRow[]) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md border px-3 text-sm font-medium transition-colors"
        style={{
          borderColor: "#C2623F",
          color: "#C2623F",
          background: "transparent",
        }}
        onMouseEnter={e => (e.currentTarget.style.background = "#FAF0EB")}
        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
      >
        <Upload className="h-3.5 w-3.5" /> Import from Spreadsheet
      </button>
      {open && (
        <ImportModal
          onClose={() => setOpen(false)}
          onImport={(rows) => {
            onImport(rows);
            setOpen(false);
          }}
        />
      )}
    </>
  );
}

function ImportModal({
  onClose,
  onImport,
}: {
  onClose: () => void;
  onImport: (rows: MappedRow[]) => void;
}) {
  const [step, setStep] = useState<"upload" | "preview">("upload");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Record<number, FieldKey>>({});
  const [fileName, setFileName] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback((file: File) => {
    setError("");
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!ext || !["xlsx", "xls", "csv"].includes(ext)) {
      setError("Unsupported file format. Please use .xlsx, .xls, or .csv");
      return;
    }
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array" });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const json: string[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
        if (json.length < 2) {
          setError("File must have at least a header row and one data row.");
          return;
        }
        const hdrs = json[0].map(String);
        const rows = json.slice(1).filter(r => r.some(c => String(c).trim() !== ""));
        if (rows.length === 0) {
          setError("No data rows found in the file.");
          return;
        }
        setHeaders(hdrs);
        setRawRows(rows.map(r => r.map(String)));
        const autoMap: Record<number, FieldKey> = {};
        hdrs.forEach((h, i) => { autoMap[i] = autoMapColumn(h); });
        setMapping(autoMap);
        setStep("preview");
      } catch {
        setError("Failed to parse the file. Please check the format.");
      }
    };
    reader.readAsArrayBuffer(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleConfirm = () => {
    const pCol = Object.entries(mapping).find(([, v]) => v === "productName")?.[0];
    const qCol = Object.entries(mapping).find(([, v]) => v === "qty")?.[0];
    const prCol = Object.entries(mapping).find(([, v]) => v === "unitPrice")?.[0];
    if (pCol === undefined) {
      setError("Please map at least the Product Name column.");
      return;
    }
    const rows: MappedRow[] = rawRows.map(r => ({
      productName: r[+pCol]?.trim() || "",
      qty: qCol !== undefined ? Math.max(1, Math.round(parseFloat(r[+qCol]) || 1)) : 1,
      unitPrice: prCol !== undefined ? Math.max(0, parseFloat(r[+prCol]) || 0) : 0,
    })).filter(r => r.productName !== "");
    onImport(rows);
  };

  const mappedCount = rawRows.filter(r => {
    const pCol = Object.entries(mapping).find(([, v]) => v === "productName")?.[0];
    return pCol !== undefined && r[+pCol]?.trim();
  }).length;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4">
      <div className="absolute inset-0 bg-foreground/30" onClick={onClose} />
      <div className="relative w-full rounded-lg border shadow-xl" style={{ maxWidth: step === "preview" ? 720 : 480, background: "#F0EBE3" }}>
        {/* Header */}
        <div className="flex items-center justify-between border-b px-5 py-3" style={{ background: "#C2623F" }}>
          <h2 className="flex items-center gap-2 font-serif text-base font-semibold text-white">
            <FileSpreadsheet className="h-4 w-4" /> Import from Spreadsheet
          </h2>
          <button onClick={onClose} className="text-white/80 hover:text-white"><X className="h-4 w-4" /></button>
        </div>

        <div className="p-5">
          {error && (
            <div className="mb-4 flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
            </div>
          )}

          {step === "upload" && (
            <div
              className={`flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-10 text-center transition-colors ${dragOver ? "border-[#C2623F] bg-[#FAF0EB]" : "border-[#C2623F]/30 bg-white"}`}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
            >
              <Upload className="h-8 w-8" style={{ color: "#C2623F" }} />
              <div>
                <p className="text-sm font-medium" style={{ color: "#2C2C2C" }}>Drag & drop your file here</p>
                <p className="mt-1 text-xs text-muted-foreground">or</p>
              </div>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border px-4 text-sm font-medium transition-colors"
                style={{ borderColor: "#C2623F", color: "#C2623F" }}
              >
                Browse File
              </button>
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) processFile(f); }}
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                Supported formats: .xlsx, .xls, .csv
              </p>
            </div>
          )}

          {step === "preview" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium" style={{ color: "#2C2C2C" }}>
                  <FileSpreadsheet className="mr-1.5 inline h-3.5 w-3.5" style={{ color: "#C2623F" }} />
                  {fileName} — {rawRows.length} rows detected
                </p>
                <button onClick={() => { setStep("upload"); setError(""); }} className="text-xs text-muted-foreground hover:text-foreground">
                  Change file
                </button>
              </div>

              {/* Column mapping */}
              <div className="flex flex-wrap gap-2">
                {headers.map((h, i) => (
                  <div key={i} className="rounded-md border bg-white p-2 text-xs" style={{ minWidth: 140 }}>
                    <div className="mb-1 truncate font-medium" style={{ color: "#2C2C2C" }} title={h}>{h}</div>
                    <select
                      value={mapping[i] || "__skip__"}
                      onChange={e => setMapping(m => ({ ...m, [i]: e.target.value as FieldKey }))}
                      className="h-7 w-full rounded border border-[#C2623F]/30 bg-[#FAF0EB] px-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#C2623F]"
                    >
                      {FIELD_OPTIONS.map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              {/* Preview table */}
              <div className="max-h-[240px] overflow-auto rounded-lg border bg-white">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-[#FAF0EB] text-left">
                    <tr>
                      {headers.map((h, i) => (
                        <th key={i} className="whitespace-nowrap px-3 py-2 font-medium" style={{ color: mapping[i] !== "__skip__" ? "#C2623F" : "#999" }}>
                          {mapping[i] !== "__skip__" ? FIELD_OPTIONS.find(o => o.value === mapping[i])?.label : h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rawRows.slice(0, 20).map((row, ri) => (
                      <tr key={ri} className="border-b last:border-b-0">
                        {row.map((cell, ci) => (
                          <td key={ci} className={`whitespace-nowrap px-3 py-1.5 ${mapping[ci] === "__skip__" ? "text-muted-foreground/50" : ""}`}>
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                    {rawRows.length > 20 && (
                      <tr><td colSpan={headers.length} className="px-3 py-2 text-center text-muted-foreground">… {rawRows.length - 20} more rows</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {step === "preview" && (
          <div className="flex items-center justify-between border-t px-5 py-3" style={{ background: "#FAF0EB" }}>
            <span className="text-xs text-muted-foreground">{mappedCount} item{mappedCount !== 1 ? "s" : ""} will be imported</span>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="inline-flex h-8 items-center rounded-md border px-3 text-sm font-medium transition-colors hover:bg-white"
                style={{ borderColor: "#ccc", color: "#2C2C2C" }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                className="inline-flex h-8 items-center gap-1.5 rounded-md px-4 text-sm font-medium text-white transition-colors hover:opacity-90"
                style={{ background: "#C2623F" }}
              >
                <Check className="h-3.5 w-3.5" /> Import {mappedCount} Items
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
