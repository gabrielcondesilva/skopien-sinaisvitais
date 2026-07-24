export type IconName = "monitor" | "ventilador" | "medicacao" | "predicao_alta" | "bomba_infusao";

// Emojis cinza (public/emojis/) — ainda sem critério de cor definido para os
// demais estados, por enquanto todo alerta usa a variante cinza. predicao_alta
// não tem emoji ainda, segue no SVG antigo. Ver CONTEXT.md § Alertas.
const ICON_SRC: Record<IconName, string> = {
  monitor: "/emojis/monitor-cinza.png",
  ventilador: "/emojis/ventilador-cinza.png",
  medicacao: "/emojis/medicacao.png",
  bomba_infusao: "/emojis/bomba-cinza.png",
  predicao_alta: "/icons/predicao_alta.svg",
};

interface Props {
  name: IconName;
  size?: number;
  className?: string;
}

export function StreamlineIcon({ name, size = 20, className }: Props) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={ICON_SRC[name]}
      width={size}
      height={size}
      alt=""
      aria-hidden
      className={className}
      style={{ display: "inline-block", flexShrink: 0 }}
    />
  );
}
