export type IconName = "monitor" | "ventilador" | "medicacao" | "predicao_alta" | "bomba_infusao";

// Emojis cinza (public/emojis/) — ainda sem critério de cor definido para os
// demais estados, por enquanto todo alerta usa a variante cinza. Ver CONTEXT.md § Alertas.
const ICON_SRC: Record<IconName, string> = {
  monitor: "/emojis/monitor-cinza.png",
  ventilador: "/emojis/ventilador-cinza.png",
  medicacao: "/emojis/medicacao.png",
  bomba_infusao: "/emojis/bomba-cinza.png",
  predicao_alta: "/emojis/predicao-alta.png",
};

// Alguns emojis renderizam visualmente menores que os demais no mesmo tamanho de
// caixa — compensa só esses ícones, sem mexer no `size` pedido por quem chama.
const SIZE_SCALE: Partial<Record<IconName, number>> = {
  medicacao: 1.25,
  predicao_alta: 1.35,
  bomba_infusao: 2.3,
};

// bomba-cinza.png é bem mais larga que alta (661×360) — depois do object-fit:
// contain, o conteúdo visível fica centralizado na caixa maior e sobra mais
// embaixo do que os outros ícones (quase quadrados). Empurra só a parte visual
// pra cima (transform não mexe no tamanho da caixa/card), só pra alinhar a base.
const Y_NUDGE: Partial<Record<IconName, number>> = {
  bomba_infusao: -3,
};

interface Props {
  name: IconName;
  size?: number;
  className?: string;
}

export function StreamlineIcon({ name, size = 20, className }: Props) {
  const scale = SIZE_SCALE[name] ?? 1;
  const renderSize = Math.round(size * scale);
  const yNudge = Y_NUDGE[name] ?? 0;

  // Caixa fica do tamanho pedido (`size`) — igual aos outros ícones pra alinhamento
  // e espaçamento no flex do chamador não mudarem. A imagem por dentro é maior
  // (compensa o padding interno do PNG) e "vaza" pra fora da caixa sem ser cortada
  // (overflow visible) — assim o vizinho não é empurrado, mas o emoji aparece no
  // tamanho visual maior.
  if (scale === 1) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={ICON_SRC[name]}
        width={size}
        height={size}
        alt=""
        aria-hidden
        className={className}
        style={{ display: "inline-block", width: size, height: size, maxWidth: "none", objectFit: "contain", flexShrink: 0 }}
      />
    );
  }

  return (
    <span
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        overflow: "visible",
        flexShrink: 0,
      }}
    >
      {/* Preflight do Tailwind aplica "img { max-width: 100%; height: auto }", que
          prevalece sobre os atributos width/height do HTML e encolhia a imagem de
          volta pro tamanho da caixa — força tudo via style inline pra vencer isso.
          object-fit: contain porque bomba-cinza.png (661×360) e medicacao.png
          (576×384) não são quadradas — sem isso, width=height esticava a imagem. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={ICON_SRC[name]}
        width={renderSize}
        height={renderSize}
        alt=""
        aria-hidden
        style={{
          width: renderSize,
          height: renderSize,
          maxWidth: "none",
          objectFit: "contain",
          flexShrink: 0,
          transform: yNudge ? `translateY(${yNudge}px)` : undefined,
        }}
      />
    </span>
  );
}
