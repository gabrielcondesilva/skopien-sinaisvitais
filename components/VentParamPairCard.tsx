"use client";

interface PairValue {
  label: string;
  unit: string;
  value: number | string;
  // Cor fixa do valor, convenção de fabricante de ventilador (pedido do
  // usuário) — substitui a cor por severidade usada nos demais cards do app
  // (VitalCard/VitalsChart), já que as faixas de Atenção/Crítico da
  // Ventilação ainda não foram clinicamente validadas.
  color: string;
}

interface Props {
  groupLabel: string;
  titleColor?: string;
  left: PairValue;
  right: PairValue;
}

// Mesmo par clínico que antes ocupava dois VitalCard's, agora unido num único
// card com os dois valores lado a lado separados por uma linha vertical — fica
// visualmente mais compacto sem perder a cor de severidade por valor.
export function VentParamPairCard({ groupLabel, titleColor, left, right }: Props) {
  const values = [left, right];

  return (
    <div
      className="rounded-lg p-2.5 flex flex-col gap-1.5 flex-1 min-w-0"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
    >
      <span className="text-sm text-center font-semibold" style={{ color: titleColor ?? "var(--muted)" }}>{groupLabel}</span>
      <div className="flex items-stretch gap-3">
        {values.map((v, i) => (
          <div key={v.label} className="flex-1 flex items-stretch gap-3 min-w-0">
            {i > 0 && <span style={{ width: 1, background: "var(--border)" }} />}
            <div className="flex-1 flex flex-col items-center min-w-0">
              <span className="text-[11px] font-semibold" style={{ color: v.color }}>{v.label}</span>
              <span className="text-2xl font-bold tabular-nums leading-none" style={{ color: v.color }}>{v.value}</span>
              <span className="text-[11px]" style={{ color: "var(--muted)" }}>{v.unit}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
