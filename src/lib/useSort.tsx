import { useState, useMemo } from "react";
import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";

export type SortDir = "asc" | "desc";

export function useSort<T extends Record<string, unknown>>(
  data: T[],
  defaultKey: keyof T & string,
  defaultDir: SortDir = "desc"
) {
  const [sortKey, setSortKey] = useState<keyof T & string>(defaultKey);
  const [sortDir, setSortDir] = useState<SortDir>(defaultDir);

  function toggleSort(key: keyof T & string) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const sorted = useMemo(() => {
    return [...data].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      let cmp: number;
      if (typeof av === "number" && typeof bv === "number") {
        cmp = av - bv;
      } else {
        cmp = String(av ?? "").localeCompare(String(bv ?? ""), undefined, { numeric: true, sensitivity: "base" });
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [data, sortKey, sortDir]);

  return { sortKey, sortDir, sorted, toggleSort };
}

export function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <ChevronsUpDown className="ml-1 inline h-3 w-3 opacity-35" />;
  return dir === "asc" ? (
    <ChevronUp className="ml-1 inline h-3 w-3 text-emerald-500" />
  ) : (
    <ChevronDown className="ml-1 inline h-3 w-3 text-emerald-500" />
  );
}

// Reusable sortable <th> element
export function Th({
  label,
  sortKey,
  currentKey,
  dir,
  onSort,
  className = "",
  right = false,
}: {
  label: string;
  sortKey: string;
  currentKey: string;
  dir: SortDir;
  onSort: (key: string) => void;
  className?: string;
  right?: boolean;
}) {
  return (
    <th
      className={`px-4 py-3 font-semibold ac-text-muted cursor-pointer select-none whitespace-nowrap hover:ac-text-secondary transition-colors ${right ? "text-right" : "text-left"} ${className}`}
      onClick={() => onSort(sortKey)}
    >
      {label}
      <SortIcon active={currentKey === sortKey} dir={dir} />
    </th>
  );
}
