import type { ReactNode } from "react";

interface Props {
  title: string;
  icon?: ReactNode;
  badge?: ReactNode;
  children: ReactNode;
  className?: string;
}

// Painel com cabeçalho (título + badge opcional) usado quando várias categorias
// de cards (Monitor/Ventilador/Bomba) ficam visíveis ao mesmo tempo na página de
// Monitor — cada categoria fica contida numa caixa própria, ao invés de uma
// grade solta sem separação visual.
export function SectionPanel({ title, icon, badge, children, className }: Props) {
  return (
    <div
      className={`rounded-lg flex flex-col ${className ?? ""}`}
      style={{ border: "1px solid var(--border)" }}
    >
      {/* Sem overflow-hidden no container: dropdowns dos cards (ex.: editar Nível
          de Consciência) abrem position:absolute abaixo do card e não podem ser
          cortados pela moldura do painel. Só o cabeçalho precisa do canto
          arredondado explícito, já que é ele que tem fundo próprio. */}
      <div
        className="flex items-center justify-between gap-3 px-3 py-2 shrink-0 rounded-t-lg"
        style={{ borderBottom: "1px solid var(--border)", background: "rgba(255,255,255,0.03)" }}
      >
        <span className="flex items-center gap-1.5 text-xs font-semibold tracking-wide" style={{ color: "var(--foreground)" }}>
          {icon}
          {title}
        </span>
        {badge}
      </div>
      <div className="p-3 flex-1">{children}</div>
    </div>
  );
}
