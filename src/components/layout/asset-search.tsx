import * as React from "react";
import { MagnifyingGlassIcon, XIcon } from "@phosphor-icons/react";

export interface AssetSearchProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function AssetSearch({
  value,
  onChange,
  className = "",
}: AssetSearchProps): React.JSX.Element {
  return (
    <div className={`relative flex items-center w-full ${className}`}>
      <MagnifyingGlassIcon
        size={13}
        className="absolute left-2.5 text-[color:var(--muted-foreground)] pointer-events-none shrink-0"
      />
      <input
        type="text"
        placeholder="Search assets..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Search assets"
        className="w-full h-7 pl-7 pr-7 text-xs bg-[color:color-mix(in_oklab,var(--foreground)_3%,transparent)] border border-[color:color-mix(in_oklab,var(--border)_30%,transparent)] hover:border-[color:color-mix(in_oklab,var(--border)_60%,transparent)] focus:border-[color:var(--primary)] focus:bg-[color:var(--background)] focus:outline-none focus:ring-1 focus:ring-[color:var(--primary)] rounded-md text-[color:var(--foreground)] placeholder:text-[color:var(--muted-foreground)] transition-all duration-150"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Clear search"
          className="absolute right-1.5 size-4 flex items-center justify-center rounded text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)] hover:bg-[color:color-mix(in_oklab,var(--foreground)_10%,transparent)] transition-colors"
        >
          <XIcon size={11} />
        </button>
      )}
    </div>
  );
}
