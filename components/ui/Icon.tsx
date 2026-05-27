interface IconProps {
  name: string;
  size?: number;
  color?: string;
  className?: string;
}

export function Icon({ name, size = 16, color, className }: IconProps) {
  return (
    <i
      className={`ti ti-${name}${className ? ` ${className}` : ""}`}
      style={{ fontSize: size, color, lineHeight: 1, display: "inline-flex" }}
    />
  );
}
