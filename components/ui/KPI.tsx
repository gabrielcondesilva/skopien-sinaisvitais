interface KPIProps {
  label: string;
  value: string | number;
  valueColor?: string;
  delta?: string;
  deltaColor?: string;
}

export function KPI({
  label,
  value,
  valueColor = "var(--sk-text-primary)",
  delta,
  deltaColor = "var(--sk-text-secondary)",
}: KPIProps) {
  return (
    <div
      style={{
        background:    "var(--sk-s1)",
        border:        "1px solid var(--sk-b-subtle)",
        borderRadius:  "var(--sk-r-md)",
        padding:       "18px 20px",
      }}
    >
      <div style={{ fontSize: 13, color: "var(--sk-text-secondary)", marginBottom: 6 }}>
        {label}
      </div>
      <div
        className="sk-num"
        style={{ fontSize: 32, fontWeight: 700, lineHeight: 1, color: valueColor }}
      >
        {value}
      </div>
      {delta && (
        <div style={{ fontSize: 13, marginTop: 6, color: deltaColor }}>{delta}</div>
      )}
    </div>
  );
}
