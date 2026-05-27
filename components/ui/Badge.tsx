import type { ReactNode } from "react";

interface BadgeProps {
  children: ReactNode;
  color?: string;
  bg?: string;
  pulse?: boolean;
  dot?: boolean;
}

export function Badge({
  children,
  color = "var(--sk-text-muted)",
  bg,
  pulse = false,
  dot = true,
}: BadgeProps) {
  const fill = bg ?? `${color}1F`;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "2px 10px",
        borderRadius: "var(--sk-r-sm)",
        font: "600 11px var(--sk-font-sans)",
        letterSpacing: ".03em",
        background: fill,
        color,
      }}
    >
      {dot && (
        <span
          className={pulse ? "sk-pulse" : ""}
          style={{ width: 6, height: 6, borderRadius: "50%", background: "currentColor" }}
        />
      )}
      {children}
    </span>
  );
}
