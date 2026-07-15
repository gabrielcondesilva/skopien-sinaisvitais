import { calculateEWS, type VitalSigns } from "@/lib/ews";

const NORMAL: VitalSigns = { fr: 16, spo2: 98, pas: 120, fc: 75, temp: 37.0, nc: "Alerta" };

function vitals(overrides: Partial<VitalSigns>): VitalSigns {
  return { ...NORMAL, ...overrides };
}

describe("EWSCalculator (tabela MEWS)", () => {
  describe("valores fisiológicos comuns", () => {
    it("NORMAL (FR=16→1, PAS=120→0, FC=75→1, TEMP=37.0→2, NC=Alerta→0) soma 4 e status Atenção", () => {
      // FR e TEMP nunca pontuam 0 nesta tabela — mesmo vitais "comuns" não zeram o total
      const result = calculateEWS(NORMAL);
      expect(result.total).toBe(4);
      expect(result.status).toBe("Atenção");
    });
  });

  describe("SpO₂ não entra no cálculo do Escore", () => {
    it.each([100, 95, 88, 70])("SpO₂=%d não altera total nem status", (spo2) => {
      const base = calculateEWS(NORMAL);
      const result = calculateEWS(vitals({ spo2 }));
      expect(result.total).toBe(base.total);
      expect(result.status).toBe(base.status);
    });

    it("scores não contém a chave spo2", () => {
      const result = calculateEWS(NORMAL);
      expect(result.scores).not.toHaveProperty("spo2");
    });
  });

  describe("FR (Frequência Respiratória) — nunca pontua 0", () => {
    it.each([
      [8, 3], [9, 2], [14, 2], [15, 1], [20, 1],
      [21, 1], [29, 1], [30, 2], [35, 2],
    ])("FR=%d → pontuação %d", (fr, expected) => {
      expect(calculateEWS(vitals({ fr })).scores.fr).toBe(expected);
    });
  });

  describe("PAS (Pressão Arterial Sistólica)", () => {
    it.each([
      [70, 3], [71, 2], [80, 2], [81, 1], [100, 1],
      [101, 0], [199, 0], [200, 1], [250, 1],
    ])("PAS=%d → pontuação %d", (pas, expected) => {
      expect(calculateEWS(vitals({ pas })).scores.pas).toBe(expected);
    });
  });

  describe("FC (Frequência Cardíaca)", () => {
    it.each([
      [40, 3], [41, 2], [50, 2], [51, 1], [100, 1],
      [101, 0], [110, 0], [111, 1], [120, 1], [121, 2], [150, 2],
    ])("FC=%d → pontuação %d", (fc, expected) => {
      expect(calculateEWS(vitals({ fc })).scores.fc).toBe(expected);
    });
  });

  describe("TEMP (Temperatura) — nunca pontua 0", () => {
    it.each([
      [35.0, 3], [35.1, 2], [37.8, 2], [37.9, 1], [40.0, 1],
    ])("TEMP=%d → pontuação %d", (temp, expected) => {
      expect(calculateEWS(vitals({ temp })).scores.temp).toBe(expected);
    });
  });

  describe("NC (Nível de Consciência — escala AVPU)", () => {
    it.each([
      ["Alerta", 0], ["Confuso", 1], ["Responde à Dor", 2], ["Inconsciente", 3],
    ] as const)("NC=%s → pontuação %d", (nc, expected) => {
      expect(calculateEWS(vitals({ nc })).scores.nc).toBe(expected);
    });
  });

  describe("Status Clínico por faixa de escore total", () => {
    // Base fixa: FR=16(1) + PAS=120(0) + FC=105(0) + TEMP=38.0(1) = 2 — só o NC varia a seguir
    const base = { fr: 16, pas: 120, fc: 105, temp: 38.0 } as const;

    it("escore 2 (NC=Alerta) → Estável", () => {
      const result = calculateEWS(vitals({ ...base, nc: "Alerta" }));
      expect(result.total).toBe(2);
      expect(result.status).toBe("Estável");
    });

    it("escore 3 (NC=Confuso) → Estável", () => {
      const result = calculateEWS(vitals({ ...base, nc: "Confuso" }));
      expect(result.total).toBe(3);
      expect(result.status).toBe("Estável");
    });

    it("escore 4 (NC=Responde à Dor) → Atenção", () => {
      const result = calculateEWS(vitals({ ...base, nc: "Responde à Dor" }));
      expect(result.total).toBe(4);
      expect(result.status).toBe("Atenção");
    });

    it("escore 5 (NC=Inconsciente) → Risco Elevado", () => {
      const result = calculateEWS(vitals({ ...base, nc: "Inconsciente" }));
      expect(result.total).toBe(5);
      expect(result.status).toBe("Risco Elevado");
    });

    it("escore máximo (15) → Crítico", () => {
      const result = calculateEWS({
        fr: 8, spo2: 98, pas: 70, fc: 40, temp: 35.0, nc: "Inconsciente",
      });
      expect(result.total).toBe(15);
      expect(result.status).toBe("Crítico");
    });
  });

  describe("retorno estruturado", () => {
    it("retorna scores individuais, total e status", () => {
      const result = calculateEWS(NORMAL);
      expect(result).toHaveProperty("scores");
      expect(result).toHaveProperty("total");
      expect(result).toHaveProperty("status");
      expect(result.scores).toHaveProperty("fr");
      expect(result.scores).toHaveProperty("pas");
      expect(result.scores).toHaveProperty("fc");
      expect(result.scores).toHaveProperty("temp");
      expect(result.scores).toHaveProperty("nc");
    });
  });
});
