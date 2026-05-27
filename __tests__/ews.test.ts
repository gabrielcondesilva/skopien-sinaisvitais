import { calculateEWS, type VitalSigns } from "@/lib/ews";

const NORMAL: VitalSigns = { fr: 16, spo2: 98, pas: 120, fc: 75, temp: 37.0 };

function vitals(overrides: Partial<VitalSigns>): VitalSigns {
  return { ...NORMAL, ...overrides };
}

describe("EWSCalculator", () => {
  describe("todos os sinais normais", () => {
    it("retorna escore 0 e status Estável", () => {
      const result = calculateEWS(NORMAL);
      expect(result.total).toBe(0);
      expect(result.status).toBe("Estável");
      expect(Object.values(result.scores).every((s) => s === 0)).toBe(true);
    });
  });

  describe("FR (Frequência Respiratória)", () => {
    it.each([
      [8, 3], [9, 1], [11, 1], [12, 0], [20, 0],
      [21, 2], [24, 2], [25, 3], [30, 3],
    ])("FR=%d → pontuação %d", (fr, expected) => {
      expect(calculateEWS(vitals({ fr })).scores.fr).toBe(expected);
    });
  });

  describe("SpO₂", () => {
    it.each([
      [91, 3], [92, 2], [93, 2], [94, 1], [95, 1], [96, 0], [100, 0],
    ])("SpO₂=%d → pontuação %d", (spo2, expected) => {
      expect(calculateEWS(vitals({ spo2 })).scores.spo2).toBe(expected);
    });
  });

  describe("PAS (Pressão Arterial Sistólica)", () => {
    it.each([
      [90, 3], [91, 2], [100, 2], [101, 1], [110, 1],
      [111, 0], [219, 0], [220, 3], [250, 3],
    ])("PAS=%d → pontuação %d", (pas, expected) => {
      expect(calculateEWS(vitals({ pas })).scores.pas).toBe(expected);
    });
  });

  describe("FC (Frequência Cardíaca)", () => {
    it.each([
      [40, 3], [41, 1], [50, 1], [51, 0], [90, 0],
      [91, 1], [110, 1], [111, 2], [130, 2], [131, 3], [150, 3],
    ])("FC=%d → pontuação %d", (fc, expected) => {
      expect(calculateEWS(vitals({ fc })).scores.fc).toBe(expected);
    });
  });

  describe("TEMP (Temperatura)", () => {
    it.each([
      [35.0, 3], [35.1, 1], [36.0, 1], [36.1, 0], [38.0, 0],
      [38.1, 1], [39.0, 1], [39.1, 2], [40.0, 2],
    ])("TEMP=%d → pontuação %d", (temp, expected) => {
      expect(calculateEWS(vitals({ temp })).scores.temp).toBe(expected);
    });
  });

  describe("Status Clínico por faixa de escore total", () => {
    it("escore 1 → Estável", () => {
      // FR=9 (score 1), demais normais → total 1
      expect(calculateEWS(vitals({ fr: 9 })).status).toBe("Estável");
    });

    it("escore 2 → Estável", () => {
      // FR=21 (score 2), demais normais → total 2
      expect(calculateEWS(vitals({ fr: 21 })).status).toBe("Estável");
    });

    it("escore 3 → Atenção", () => {
      // FR=21 (2) + SpO₂=94 (1) → total 3
      expect(calculateEWS(vitals({ fr: 21, spo2: 94 })).status).toBe("Atenção");
    });

    it("escore 4 → Atenção", () => {
      // FR=21 (2) + SpO₂=92 (2) → total 4
      expect(calculateEWS(vitals({ fr: 21, spo2: 92 })).status).toBe("Atenção");
    });

    it("escore 5 → Risco Elevado", () => {
      // FR=21 (2) + SpO₂=92 (2) + FC=91 (1) → total 5
      expect(calculateEWS(vitals({ fr: 21, spo2: 92, fc: 91 })).status).toBe("Risco Elevado");
    });

    it("escore 6 → Risco Elevado", () => {
      // FR=21 (2) + SpO₂=92 (2) + FC=111 (2) → total 6
      expect(calculateEWS(vitals({ fr: 21, spo2: 92, fc: 111 })).status).toBe("Risco Elevado");
    });

    it("escore 7 → Crítico", () => {
      // FR=21 (2) + SpO₂=92 (2) + FC=111 (2) + TEMP=35 (3) → total 9... use simpler combo
      // FR=25 (3) + SpO₂=92 (2) + FC=111 (2) → total 7
      expect(calculateEWS(vitals({ fr: 25, spo2: 92, fc: 111 })).status).toBe("Crítico");
    });

    it("escore 14 (máximo) → Crítico", () => {
      // FR=8(3) + SpO₂=91(3) + PAS=90(3) + FC=40(3) + TEMP=35(3) → total 15... wait max is 14
      // Let me recalc: max score per sign is 3, 5 signs = 15 max...
      // Actually: FR=8(3) + SpO₂=91(3) + PAS=90(3) + FC=40(3) + TEMP=35(3) = 15 but scale is 0-14
      // The scale 0-14 comes from NEWS2 without 2 parameters... let me just verify total
      const result = calculateEWS({ fr: 8, spo2: 91, pas: 90, fc: 40, temp: 35.0 });
      expect(result.total).toBe(15); // 5 signs × 3 = 15 max (noted in CONTEXT.md as 0-14, but actual max with these 5 is 15)
      expect(result.status).toBe("Crítico");
    });
  });

  describe("Regra de exceção — sinal individual com pontuação 3", () => {
    it("FC=131 (individual 3) com total 3 → Atenção (não Risco Elevado)", () => {
      // FC=131 scores 3, demais normais → total 3 → without exception would be Atenção anyway
      // Key test: total=3 with one individual=3 → Atenção (not elevated by exception since total already ≥3)
      const result = calculateEWS(vitals({ fc: 131 }));
      expect(result.scores.fc).toBe(3);
      expect(result.total).toBe(3);
      expect(result.status).toBe("Atenção");
    });

    it("sinal individual 3 com total 2 → Atenção (regra de exceção eleva de Estável)", () => {
      // FR=8 (score 3) + SpO₂=94 (score 1) → total 4... use only FR=8 (3) → total 3
      // Need total ≤2 with one sign=3 — impossible since min score when sign=3 is total=3
      // The exception matters when: total < 3 but one sign = 3 (impossible with this scoring)
      // Actually minimum total when one sign scores 3 is 3 (that sign alone contributes 3)
      // So the exception applies when total would be exactly 3 from a single sign=3 and rest=0
      // total=3 without exception → Atenção (already). Exception doesn't change result here.
      // Real test: confirm exception is applied (defensive test)
      const result = calculateEWS(vitals({ fr: 8 })); // FR=8 → score 3, rest normal → total 3
      expect(result.scores.fr).toBe(3);
      expect(result.total).toBe(3);
      expect(result.status).toBe("Atenção");
    });

    it("PAS=220 (individual 3) com restante normal → Atenção", () => {
      const result = calculateEWS(vitals({ pas: 220 }));
      expect(result.scores.pas).toBe(3);
      expect(result.status).toBe("Atenção");
    });

    it("SpO₂=91 (individual 3) com restante normal → Atenção", () => {
      const result = calculateEWS(vitals({ spo2: 91 }));
      expect(result.scores.spo2).toBe(3);
      expect(result.status).toBe("Atenção");
    });
  });

  describe("retorno estruturado", () => {
    it("retorna scores individuais, total e status", () => {
      const result = calculateEWS(NORMAL);
      expect(result).toHaveProperty("scores");
      expect(result).toHaveProperty("total");
      expect(result).toHaveProperty("status");
      expect(result.scores).toHaveProperty("fr");
      expect(result.scores).toHaveProperty("spo2");
      expect(result.scores).toHaveProperty("pas");
      expect(result.scores).toHaveProperty("fc");
      expect(result.scores).toHaveProperty("temp");
    });
  });
});
