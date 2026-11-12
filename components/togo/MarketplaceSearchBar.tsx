import { Search } from "lucide-react";

export function MarketplaceSearchBar({
  placeholder,
  value,
  onChange,
}: {
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div style={{ margin: "12px 16px" }}>
      <div
        className="flex items-center"
        style={{
          height: 44,
          backgroundColor: "#FFFFFF",
          border: "1px solid #E2E8F0",
          borderRadius: 12,
          padding: "0 14px",
        }}
      >
        <Search size={16} color="#CBD5E1" />
        <input
          type="search"
          className="togo-search"
          placeholder={placeholder}
          aria-label={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{
            flex: 1,
            marginLeft: 8,
            border: "none",
            outline: "none",
            fontSize: 13,
            color: "#111827",
            backgroundColor: "transparent",
          }}
        />
      </div>
    </div>
  );
}
