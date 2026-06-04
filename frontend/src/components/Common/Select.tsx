import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";

export interface SelectOption {
  value: string;
  label: string;
  meta?: React.ReactNode; // e.g. a difficulty badge
}

interface SelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function Select({
  options,
  value,
  onChange,
  placeholder = "Select…",
  className = "",
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selected = options.find((o) => o.value === value);

  return (
    <div ref={ref} className={`relative ${className}`}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg border text-sm transition-all cursor-pointer ${
          open
            ? "bg-slate-800 border-indigo-500/60 ring-2 ring-indigo-500/20"
            : "bg-slate-800 border-slate-700 hover:border-slate-600"
        }`}
      >
        <span className={selected ? "text-slate-100" : "text-slate-500"}>
          {selected ? selected.label : placeholder}
        </span>
        {selected?.meta && <span className="ml-auto mr-2">{selected.meta}</span>}
        <ChevronDown
          className={`w-4 h-4 text-slate-400 flex-shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute z-50 mt-1.5 w-full bg-slate-900 border border-slate-700 rounded-xl shadow-2xl shadow-black/50 overflow-hidden py-1">
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 text-sm transition-colors cursor-pointer ${
                  isSelected
                    ? "bg-indigo-950/60 text-indigo-300"
                    : "text-slate-300 hover:bg-slate-800 hover:text-slate-100"
                }`}
              >
                <span className="flex items-center gap-2.5">
                  {opt.meta && <span>{opt.meta}</span>}
                  {opt.label}
                </span>
                {isSelected && <Check className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
