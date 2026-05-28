type IconName = "sinal_vital" | "medicacao" | "predicao_alta" | "bomba_infusao";

interface Props {
  name: IconName;
  size?: number;
  className?: string;
}

export function StreamlineIcon({ name, size = 20, className }: Props) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/icons/${name}.svg`}
      width={size}
      height={size}
      alt=""
      aria-hidden
      className={className}
      style={{ display: "inline-block", flexShrink: 0 }}
    />
  );
}
