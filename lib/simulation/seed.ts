import { buildHistory, currentSlotValues, CARD_SLOT_MINUTES } from "./vitals";
import type {
  Bed, Internacao, SurgicalInternacao, Patient,
  UnitId, VitalsBaseline, ManchesterClass, Gender,
} from "./types";
import { calculateEWS } from "@/lib/ews";

const NOW = () => Date.now();

let _idCounter = 1;
const uid = () => `id-${_idCounter++}`;

function makePatient(
  name: string, age: number, gender: Gender,
  admissionReason: string, hoursAgo: number
): Patient {
  return {
    id: uid(),
    name, age, gender, admissionReason,
    admittedAt: NOW() - hoursAgo * 3_600_000,
  };
}

function makeInternacao(
  patient: Patient,
  bedId: string,
  unit: UnitId,
  baseline: VitalsBaseline,
  opts: {
    hasPump?: boolean;
    admissionProbability?: number;
    manchesterClass?: ManchesterClass;
  } = {}
): Internacao {
  const now = NOW();
  const windowMs = 62 * 3_600_000; // cobre a maior Janela selecionável (62h)
  const rawHistory = buildHistory(baseline, now, windowMs);
  const ews = calculateEWS(currentSlotValues(rawHistory, CARD_SLOT_MINUTES, now));

  const forecastSteps = 36; // 36 × 5min = 3h
  const ewsForecast = Array.from({ length: forecastSteps }, (_, i) => ({
    t: now + (i + 1) * 5 * 60_000,
    ews: Math.max(0, ews.total + Math.round((Math.random() - 0.4) * i * 0.15)),
  }));

  return {
    id: uid(),
    patient,
    bedId,
    unit,
    baseline,
    rawHistory,
    currentEws: ews.total,
    currentStatus: ews.status,
    hasPump: opts.hasPump ?? false,
    ewsForecast,
    admissionProbability: opts.admissionProbability ?? Math.floor(Math.random() * 40 + 10),
    manchesterClass: opts.manchesterClass ?? "Amarelo",
  };
}

function makeBed(label: string, unit: UnitId, internacaoId: string | null): Bed {
  return { id: uid(), label, unit, internacaoId };
}

// ─── Baselines ────────────────────────────────────────────────────────────────

const STABLE: VitalsBaseline       = { fr: 15, spo2: 98, pas: 122, fc: 72, temp: 36.8, nc: "Alerta" };
const MILD_CONCERN: VitalsBaseline  = { fr: 19, spo2: 96, pas: 105, fc: 92, temp: 37.4, nc: "Alerta" };
const ATTENTION: VitalsBaseline     = { fr: 22, spo2: 95, pas: 99,  fc: 96, temp: 37.9, nc: "Alerta" };
// UTI-01 starts em Moderado — will deteriorate in Cena 1
const UTI_CENA1: VitalsBaseline     = { fr: 23, spo2: 95, pas: 102, fc: 98, temp: 37.6, nc: "Alerta" };
const UTI_STABLE: VitalsBaseline    = { fr: 14, spo2: 97, pas: 118, fc: 68, temp: 36.9, nc: "Alerta" };
// UTI-02 starts already critical — seeds the initial sinal-vital demo alert
const UTI_CRITICAL: VitalsBaseline  = { fr: 27, spo2: 88, pas: 84, fc: 120, temp: 38.8, nc: "Confuso" };

// ─── Build units ──────────────────────────────────────────────────────────────

export function buildSeed(): {
  beds: Bed[];
  internacoes: Record<string, Internacao | SurgicalInternacao>;
} {
  const beds: Bed[] = [];
  const internacoes: Record<string, Internacao | SurgicalInternacao> = {};

  function addOccupied(
    label: string,
    unit: UnitId,
    patient: Patient,
    baseline: VitalsBaseline,
    opts?: Parameters<typeof makeInternacao>[4]
  ) {
    const bed = makeBed(label, unit, "TBD");
    const internacao = makeInternacao(patient, bed.id, unit, baseline, opts);
    bed.internacaoId = internacao.id;
    beds.push(bed);
    internacoes[internacao.id] = internacao;
    return internacao;
  }

  function addEmpty(label: string, unit: UnitId) {
    beds.push(makeBed(label, unit, null));
  }

  function addInoperante(label: string, unit: UnitId) {
    beds.push({ ...makeBed(label, unit, null), inoperante: true });
  }

  // ── Pronto Socorro ──────────────────────────────────────────────────────────
  // PS-01: câmera + alta probabilidade de alta (Cena 3 ~12min)
  addOccupied("PS-01", "pronto-socorro",
    makePatient("Carlos Eduardo Souza", 58, "M", "Dor Torácica Atípica", 6),
    MILD_CONCERN,
    { admissionProbability: 72, manchesterClass: "Laranja" }
  );
  addOccupied("PS-02", "pronto-socorro",
    makePatient("Ana Paula Lima", 34, "F", "Crise Hipertensiva", 3),
    ATTENTION, { admissionProbability: 65, manchesterClass: "Laranja" }
  );
  addOccupied("PS-03", "pronto-socorro",
    makePatient("Roberto Alves Martins", 72, "M", "Dispneia", 8),
    MILD_CONCERN, { admissionProbability: 61, manchesterClass: "Laranja" }
  );
  addOccupied("PS-04", "pronto-socorro",
    makePatient("Fernanda Costa Ribeiro", 28, "F", "Cólica Renal", 2),
    STABLE, { admissionProbability: 22, manchesterClass: "Amarelo" }
  );
  addOccupied("PS-05", "pronto-socorro",
    makePatient("José Antônio Silva", 65, "M", "Fraqueza Muscular", 5),
    STABLE, { admissionProbability: 47, manchesterClass: "Amarelo" }
  );
  addOccupied("PS-06", "pronto-socorro",
    makePatient("Patrícia Oliveira Santos", 45, "F", "Arritmia", 4),
    MILD_CONCERN, { admissionProbability: 55, manchesterClass: "Laranja" }
  );
  addOccupied("PS-07", "pronto-socorro",
    makePatient("Marcos Vinicius Pereira", 52, "M", "Síncope", 3),
    STABLE, { admissionProbability: 38, manchesterClass: "Amarelo" }
  );
  addOccupied("PS-08", "pronto-socorro",
    makePatient("Luciana Ferreira Gomes", 38, "F", "Cefaleia Intensa", 1),
    STABLE, { admissionProbability: 18, manchesterClass: "Verde" }
  );
  addOccupied("PS-09", "pronto-socorro",
    makePatient("Antônio Carlos Barbosa", 81, "M", "Queda com Trauma", 7),
    MILD_CONCERN, { admissionProbability: 68, manchesterClass: "Laranja" }
  );
  addOccupied("PS-10", "pronto-socorro",
    makePatient("Camila Rodrigues Nunes", 23, "F", "Reação Alérgica", 2),
    STABLE, { admissionProbability: 33, manchesterClass: "Amarelo" }
  );
  addEmpty("PS-11", "pronto-socorro");
  addInoperante("PS-12", "pronto-socorro");

  // ── Enfermaria ──────────────────────────────────────────────────────────────
  // ENF-01: medicação atrasada (Cena 2 ~8min)
  addOccupied("ENF-01", "enfermaria",
    makePatient("Maria das Graças Souza", 68, "F", "Insuficiência Cardíaca", 48),
    MILD_CONCERN, { manchesterClass: "Amarelo" }
  );
  addOccupied("ENF-02", "enfermaria",
    makePatient("Pedro Henrique Costa", 55, "M", "Pneumonia Bacteriana", 36),
    ATTENTION
  );
  addOccupied("ENF-03", "enfermaria",
    makePatient("Sandra Aparecida Lima", 47, "F", "Diabetes Descompensada", 24),
    STABLE
  );
  addOccupied("ENF-04", "enfermaria",
    makePatient("Rogério Matos Fonseca", 63, "M", "DPOC Exacerbada", 72),
    MILD_CONCERN
  );
  addOccupied("ENF-05", "enfermaria",
    makePatient("Eliane Cristina Borges", 39, "F", "Pielonefrite", 18),
    STABLE
  );
  addOccupied("ENF-06", "enfermaria",
    makePatient("Wilson Roberto Dias", 74, "M", "Fratura de Colo de Fêmur", 60),
    STABLE
  );
  addOccupied("ENF-07", "enfermaria",
    makePatient("Cláudia Aparecida Ramos", 51, "F", "Pancreatite Aguda", 42),
    MILD_CONCERN
  );
  addOccupied("ENF-08", "enfermaria",
    makePatient("Leonardo Andrade Silva", 44, "M", "Herpes Zoster", 30),
    STABLE
  );
  addOccupied("ENF-09", "enfermaria",
    makePatient("Vera Lúcia Nascimento", 79, "F", "AVC Isquêmico", 96),
    MILD_CONCERN
  );
  addOccupied("ENF-10", "enfermaria",
    makePatient("Fábio Alexandre Teixeira", 36, "M", "Celulite Infecciosa", 24),
    STABLE
  );
  addOccupied("ENF-11", "enfermaria",
    makePatient("Rosana Pereira Almeida", 58, "F", "Fibrilação Atrial", 48),
    MILD_CONCERN
  );
  addOccupied("ENF-12", "enfermaria",
    makePatient("Hélio Gomes de Carvalho", 67, "M", "Insuficiência Renal Aguda", 54),
    MILD_CONCERN
  );
  addOccupied("ENF-13", "enfermaria",
    makePatient("Denise Cristina Moura", 42, "F", "Gastroenterite Grave", 18),
    STABLE
  );
  addOccupied("ENF-14", "enfermaria",
    makePatient("Gilberto Santos Freire", 71, "M", "Infecção Urinária Complicada", 36),
    STABLE
  );
  addOccupied("ENF-15", "enfermaria",
    makePatient("Adriana Lopes Cavalcanti", 49, "F", "Anemia Grave", 48),
    MILD_CONCERN
  );

  // ── UTI ─────────────────────────────────────────────────────────────────────
  // UTI-01: vai deteriorar na Cena 1 (~5min)
  addOccupied("UTI-01", "uti",
    makePatient("Francisco das Chagas Moreira", 76, "M", "Sepse por Pneumonia", 120),
    UTI_CENA1, { hasPump: true, manchesterClass: "Vermelho" }
  );
  addOccupied("UTI-02", "uti",
    makePatient("Beatriz Helena Cardoso", 62, "F", "Choque Séptico", 96),
    UTI_CRITICAL, { hasPump: true }
  );
  addOccupied("UTI-03", "uti",
    makePatient("Manoel Augusto Vieira", 83, "M", "Insuficiência Respiratória", 72),
    { fr: 20, spo2: 96, pas: 108, fc: 94, temp: 37.8, nc: "Alerta" }, { hasPump: false }
  );
  addOccupied("UTI-04", "uti",
    makePatient("Teresa Cristina Andrade", 55, "F", "Pós-op Cirurgia Cardíaca", 48),
    UTI_STABLE, { hasPump: true }
  );
  addOccupied("UTI-05", "uti",
    makePatient("Raimundo Nonato Pinheiro", 69, "M", "Infarto Agudo do Miocárdio", 60),
    { fr: 18, spo2: 97, pas: 112, fc: 88, temp: 37.1, nc: "Alerta" }, { hasPump: false }
  );
  addOccupied("UTI-06", "uti",
    makePatient("Zélia Fátima Corrêa", 78, "F", "AVC Hemorrágico", 84),
    UTI_STABLE, { hasPump: false }
  );
  addOccupied("UTI-07", "uti",
    makePatient("Benedito Alves Machado", 71, "M", "Insuficiência Hepática", 108),
    MILD_CONCERN, { hasPump: true }
  );
  addOccupied("UTI-08", "uti",
    makePatient("Conceição Maria Rocha", 64, "F", "Diabetes + IAM", 72),
    { fr: 17, spo2: 97, pas: 115, fc: 82, temp: 37.0, nc: "Alerta" }, { hasPump: false }
  );
  addOccupied("UTI-09", "uti",
    makePatient("Armando Luiz Tavares", 58, "M", "Politrauma", 36),
    MILD_CONCERN, { hasPump: true }
  );
  addInoperante("UTI-10", "uti");

  // ── Centro Cirúrgico ─────────────────────────────────────────────────────────
  const now = NOW();
  const surgeries: Array<{
    label: string;
    patient: Patient;
    procedure: string;
    surgeon: string;
    stepStarted: number; // minutes ago when current step started
    currentStep: number;
    hasPump: boolean;
  }> = [
    {
      label: "CC01",
      patient: makePatient("Maurício Pinto Azevedo", 47, "M", "Colecistectomia Laparoscópica", 0),
      procedure: "Colecistectomia Laparoscópica",
      surgeon: "Dr. Fernando Castro",
      stepStarted: 45,
      currentStep: 1, // Procedimento — vai avançar na Cena 4
      hasPump: false,
    },
    {
      label: "CC02",
      patient: makePatient("Juliana Mendes Freitas", 32, "F", "Cesariana Eletiva", 0),
      procedure: "Cesariana Eletiva",
      surgeon: "Dra. Renata Campos",
      stepStarted: 20,
      currentStep: 1,
      hasPump: false,
    },
    {
      label: "CC03",
      patient: makePatient("Gustavo Henrique Leal", 54, "M", "Herniorrafia Inguinal", 0),
      procedure: "Herniorrafia Inguinal",
      surgeon: "Dr. Paulo Silveira",
      stepStarted: 30,
      currentStep: 2, // RA
      hasPump: false,
    },
    {
      label: "CC04",
      patient: makePatient("Neide Aparecida Cunha", 61, "F", "Tireoidectomia Total", 0),
      procedure: "Tireoidectomia Total",
      surgeon: "Dr. Ricardo Nogueira",
      stepStarted: 10,
      currentStep: 0, // Admissão
      hasPump: true,
    },
  ];

  const SURGICAL_STEP_NAMES = ["Admissão", "Procedimento", "RA", "Quarto"];

  for (const s of surgeries) {
    const bed = makeBed(s.label, "centro-cirurgico", "TBD");
    const rawHistory = buildHistory(STABLE, now, 62 * 3_600_000);
    const ews = calculateEWS(currentSlotValues(rawHistory, CARD_SLOT_MINUTES, now));

    const surgicalFlow = SURGICAL_STEP_NAMES.map((name, i) => {
      if (i < s.currentStep) {
        const start = now - (s.stepStarted + (s.currentStep - i) * 30) * 60_000;
        return { name, startedAt: start, completedAt: start + 28 * 60_000 };
      }
      if (i === s.currentStep) {
        return { name, startedAt: now - s.stepStarted * 60_000, completedAt: null };
      }
      return { name, startedAt: null, completedAt: null };
    });

    const internacao: SurgicalInternacao = {
      id: uid(),
      patient: s.patient,
      bedId: bed.id,
      unit: "centro-cirurgico",
      hasPump: s.hasPump,
      baseline: STABLE,
      rawHistory,
      currentEws: ews.total,
      currentStatus: ews.status,
      ewsForecast: [],
      admissionProbability: 0,
      manchesterClass: "Amarelo",
      procedureName: s.procedure,
      surgeonName: s.surgeon,
      surgicalFlow,
      currentStep: s.currentStep,
    };

    bed.internacaoId = internacao.id;
    beds.push(bed);
    internacoes[internacao.id] = internacao;
  }

  addEmpty("CC05", "centro-cirurgico");
  addInoperante("CC06", "centro-cirurgico");

  return { beds, internacoes };
}
