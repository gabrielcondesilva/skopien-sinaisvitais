import { Badge } from "./Badge";

const STATUS_COLOR: Record<string, string> = {
  "Baixo":    "var(--sk-stable)",
  "Moderado": "var(--sk-warn)",
  "Alto":     "var(--sk-crit)",
};

interface StatusChipProps {
  status: string;
  pulse?: boolean;
}

export function StatusChip({ status, pulse }: StatusChipProps) {
  const color = STATUS_COLOR[status] ?? "var(--sk-text-muted)";
  return (
    <Badge color={color} pulse={pulse ?? status === "Alto"}>
      {status}
    </Badge>
  );
}
