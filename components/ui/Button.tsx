import type { ReactNode, MouseEventHandler } from "react";
import { Icon } from "./Icon";

type Variant = "primary" | "secondary" | "danger" | "ghost";
type Size = "sm" | "md";

interface ButtonProps {
  children?: ReactNode;
  variant?: Variant;
  size?: Size;
  icon?: string;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
  className?: string;
}

const VARIANTS: Record<Variant, React.CSSProperties> = {
  primary:   { background: "var(--sk-accent)",    color: "#1A171C", border: "none" },
  secondary: { background: "var(--sk-s2)",         color: "var(--sk-text-primary)", border: "1px solid var(--sk-b-default)" },
  danger:    { background: "rgba(240,62,62,.10)",  color: "var(--sk-crit)",         border: "1px solid var(--sk-crit)" },
  ghost:     { background: "transparent",          color: "var(--sk-text-secondary)", border: "none" },
};

export function Button({
  children,
  variant = "secondary",
  size = "md",
  icon,
  onClick,
  disabled,
  type = "button",
  className,
}: ButtonProps) {
  const base: React.CSSProperties = {
    height:       size === "sm" ? 30 : 36,
    padding:      size === "sm" ? "0 12px" : "0 16px",
    borderRadius: size === "sm" ? 6 : "var(--sk-r-md)",
    font:         `600 ${size === "sm" ? 13 : 14}px var(--sk-font-sans)`,
    display:      "inline-flex",
    alignItems:   "center",
    gap:          8,
    cursor:       disabled ? "not-allowed" : "pointer",
    transition:   "all .15s",
    opacity:      disabled ? 0.5 : 1,
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={className}
      style={{ ...base, ...VARIANTS[variant] }}
    >
      {icon && <Icon name={icon} size={size === "sm" ? 14 : 16} />}
      {children}
    </button>
  );
}
