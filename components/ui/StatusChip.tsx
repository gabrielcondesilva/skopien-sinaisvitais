import { Badge } from "./Badge";

const STATUS_COLOR: Record<string, string> = {
  "Estável":       "var(--sk-stable)",
  "Atenção":       "var(--sk-warn)",
  "Risco Elevado": "var(--sk-high)",
  "Crítico":       "var(--sk-crit)",
};

interface StatusChipProps {
  status: string;
  pulse?: boolean;
}

export function StatusChip({ status, pulse }: StatusChipProps) {
  const color = STATUS_COLOR[status] ?? "var(--sk-text-muted)";
  return (
    <Badge color={color} pulse={pulse ?? status === "Crítico"}>
      {status}
    </Badge>
  );
}
