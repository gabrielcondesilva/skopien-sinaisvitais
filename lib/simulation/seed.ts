import { buildHistory, currentScoreVitals } from "./vitals";
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
  const ews = calculateEWS(currentScoreVitals(rawHistory, now));

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

// EWS 3 (Estável): FR e TEMP nunca pontuam 0 nesta tabela, então vitais "de livro" (FR 15-29,
// PAS 101-199, FC 51-100, TEMP 35.1-37.8) já somam 4 (Atenção). Para render Estável de fato,
// usamos a faixa FC 101-110, que pontua 0 nesta tabela institucional.
const STABLE: VitalsBaseline       = { fr: 16, spo2: 98, pas: 118, fc: 104, temp: 36.8, nc: "Alerta" };
const MILD_CONCERN: VitalsBaseline  = { fr: 19, spo2: 96, pas: 105, fc: 92, temp: 37.4, nc: "Alerta" };
const ATTENTION: VitalsBaseline     = { fr: 24, spo2: 94, pas: 95,  fc: 125, temp: 38.3, nc: "Alerta" };
// UTI-01 starts em Atenção — will deteriorate in Cena 1
const UTI_CENA1: VitalsBaseline     = { fr: 23, spo2: 95, pas: 102, fc: 98, temp: 37.6, nc: "Alerta" };
// UTI-02 starts already critical — seeds the initial sinal-vital demo alert
const UTI_CRITICAL: VitalsBaseline  = { fr: 27, spo2: 88, pas: 84, fc: 120, temp: 38.8, nc: "Confuso" };
// Pronto Socorro concentra os quadros mais graves do hospital — pacientes aguardando vaga
const CRITICAL_PS: VitalsBaseline   = { fr: 32, spo2: 85, pas: 78, fc: 128, temp: 39.2, nc: "Confuso" };

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

  // ── Pronto Socorro ───────────────────────────────────────────────────────────
  // PS concentra os quadros mais graves do hospital — pacientes agudos aguardando vaga.
  // PS-01: câmera + alta probabilidade de alta (Cena 3 ~12min)
  addOccupied("PS-01", "pronto-socorro",
    makePatient("Carlos Eduardo Souza", 58, "M", "Dor Torácica Atípica", 6),
    CRITICAL_PS,
    { admissionProbability: 72, manchesterClass: "Vermelho" }
  );
  addOccupied("PS-02", "pronto-socorro",
    makePatient("Ana Paula Lima", 34, "F", "Crise Hipertensiva", 3),
    ATTENTION, { admissionProbability: 65, manchesterClass: "Laranja" }
  );
  addOccupied("PS-03", "pronto-socorro",
    makePatient("Roberto Alves Martins", 72, "M", "Dispneia", 8),
    CRITICAL_PS, { admissionProbability: 61, manchesterClass: "Vermelho" }
  );
  addOccupied("PS-04", "pronto-socorro",
    makePatient("Fernanda Costa Ribeiro", 28, "F", "Cólica Renal", 2),
    STABLE, { admissionProbability: 22, manchesterClass: "Verde" }
  );
  addOccupied("PS-05", "pronto-socorro",
    makePatient("José Antônio Silva", 65, "M", "Fraqueza Muscular", 5),
    MILD_CONCERN, { admissionProbability: 47, manchesterClass: "Amarelo" }
  );
  addOccupied("PS-06", "pronto-socorro",
    makePatient("Patrícia Oliveira Santos", 45, "F", "Arritmia", 4),
    ATTENTION, { admissionProbability: 55, manchesterClass: "Laranja" }
  );
  addOccupied("PS-07", "pronto-socorro",
    makePatient("Marcos Vinicius Pereira", 52, "M", "Síncope", 3),
    MILD_CONCERN, { admissionProbability: 38, manchesterClass: "Amarelo" }
  );
  addOccupied("PS-08", "pronto-socorro",
    makePatient("Luciana Ferreira Gomes", 38, "F", "Cefaleia Intensa", 1),
    STABLE, { admissionProbability: 18, manchesterClass: "Verde" }
  );
  addOccupied("PS-09", "pronto-socorro",
    makePatient("Antônio Carlos Barbosa", 81, "M", "Queda com Trauma", 7),
    ATTENTION, { admissionProbability: 68, manchesterClass: "Laranja" }
  );
  addOccupied("PS-10", "pronto-socorro",
    makePatient("Camila Rodrigues Nunes", 23, "F", "Reação Alérgica", 2),
    MILD_CONCERN, { admissionProbability: 33, manchesterClass: "Amarelo" }
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
    STABLE
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
  addEmpty("ENF-11", "enfermaria");
  addInoperante("ENF-12", "enfermaria");

  // ── UTI ─────────────────────────────────────────────────────────────────────
  // UTI é a unidade mais monitorada e estabilizada do hospital — a maioria dos
  // pacientes já respondeu ao tratamento intensivo, ao contrário do PS.
  // UTI-01: vai deteriorar na Cena 1 (~5min)
  addOccupied("UTI-01", "uti",
    makePatient("Francisco das Chagas Moreira", 76, "M", "Sepse por Pneumonia", 120),
    UTI_CENA1, { hasPump: true, manchesterClass: "Vermelho" }
  );
  // UTI-02: seeds o alerta de sinal vital crítico (demo)
  addOccupied("UTI-02", "uti",
    makePatient("Beatriz Helena Cardoso", 62, "F", "Choque Séptico", 96),
    UTI_CRITICAL, { hasPump: true }
  );
  addOccupied("UTI-03", "uti",
    makePatient("Manoel Augusto Vieira", 83, "M", "Insuficiência Respiratória", 72),
    STABLE, { hasPump: false }
  );
  addOccupied("UTI-04", "uti",
    makePatient("Teresa Cristina Andrade", 55, "F", "Pós-op Cirurgia Cardíaca", 48),
    STABLE, { hasPump: true }
  );
  addOccupied("UTI-05", "uti",
    makePatient("Raimundo Nonato Pinheiro", 69, "M", "Infarto Agudo do Miocárdio", 60),
    MILD_CONCERN, { hasPump: false }
  );
  addOccupied("UTI-06", "uti",
    makePatient("Zélia Fátima Corrêa", 78, "F", "AVC Hemorrágico", 84),
    STABLE, { hasPump: false }
  );
  addOccupied("UTI-07", "uti",
    makePatient("Benedito Alves Machado", 71, "M", "Insuficiência Hepática", 108),
    MILD_CONCERN, { hasPump: true }
  );
  addOccupied("UTI-08", "uti",
    makePatient("Conceição Maria Rocha", 64, "F", "Diabetes + IAM", 72),
    STABLE, { hasPump: false }
  );
  addOccupied("UTI-09", "uti",
    makePatient("Armando Luiz Tavares", 58, "M", "Politrauma", 36),
    MILD_CONCERN, { hasPump: true }
  );
  addOccupied("UTI-10", "uti",
    makePatient("Sônia Regina Barros", 66, "F", "Pós-op Neurocirurgia", 54),
    STABLE, { hasPump: false }
  );
  addEmpty("UTI-11", "uti");
  addInoperante("UTI-12", "uti");

  // ── UTI Neonatal (12 leitos) ────────────────────────────────────────────────
  addOccupied("UTI-N01", "uti",
    makePatient("RN de Ana Beatriz Souza", 0, "M", "Prematuridade Extrema (28 semanas)", 12),
    STABLE, { hasPump: false }
  );
  addOccupied("UTI-N02", "uti",
    makePatient("RN de Camila Torres", 0, "F", "Icterícia Neonatal", 30),
    STABLE, { hasPump: false }
  );
  addOccupied("UTI-N03", "uti",
    makePatient("RN de Juliana Prado", 0, "M", "Sepse Neonatal Precoce", 20),
    MILD_CONCERN, { hasPump: true }
  );
  addOccupied("UTI-N04", "uti",
    makePatient("RN de Patrícia Nunes", 0, "F", "Síndrome do Desconforto Respiratório", 48),
    MILD_CONCERN, { hasPump: true }
  );
  addOccupied("UTI-N05", "uti",
    makePatient("RN de Débora Alves", 0, "M", "Prematuridade (32 semanas)", 60),
    STABLE, { hasPump: false }
  );
  addOccupied("UTI-N06", "uti",
    makePatient("RN de Larissa Gomes", 0, "F", "Asfixia Perinatal", 10),
    ATTENTION, { hasPump: true }
  );
  addOccupied("UTI-N07", "uti",
    makePatient("RN de Fernanda Rocha", 0, "M", "Hipoglicemia Neonatal", 24),
    STABLE, { hasPump: false }
  );
  addOccupied("UTI-N08", "uti",
    makePatient("RN de Vanessa Lima", 0, "F", "Cardiopatia Congênita", 36),
    MILD_CONCERN, { hasPump: true }
  );
  addOccupied("UTI-N09", "uti",
    makePatient("RN de Simone Castro", 0, "M", "Enterocolite Necrosante", 72),
    STABLE, { hasPump: false }
  );
  addOccupied("UTI-N10", "uti",
    makePatient("RN de Tatiane Melo", 0, "F", "Prematuridade Extrema (27 semanas)", 96),
    MILD_CONCERN, { hasPump: false }
  );
  addEmpty("UTI-N11", "uti");
  addInoperante("UTI-N12", "uti");

  // ── UTI Pediátrica (12 leitos) ──────────────────────────────────────────────
  addOccupied("UTI-P01", "uti",
    makePatient("Miguel Santos Barbosa", 3, "M", "Bronquiolite Viral Grave", 24),
    STABLE, { hasPump: false }
  );
  addOccupied("UTI-P02", "uti",
    makePatient("Alice Ferreira Costa", 7, "F", "Cetoacidose Diabética", 18),
    MILD_CONCERN, { hasPump: false }
  );
  addOccupied("UTI-P03", "uti",
    makePatient("Davi Oliveira Souza", 5, "M", "Convulsão Febril Prolongada", 12),
    STABLE, { hasPump: false }
  );
  addOccupied("UTI-P04", "uti",
    makePatient("Laura Almeida Rocha", 10, "F", "Pneumonia Grave", 30),
    MILD_CONCERN, { hasPump: true }
  );
  addOccupied("UTI-P05", "uti",
    makePatient("Heitor Lima Cardoso", 2, "M", "Desidratação Grave", 15),
    STABLE, { hasPump: false }
  );
  addOccupied("UTI-P06", "uti",
    makePatient("Sophia Martins Dias", 13, "F", "Trauma Cranioencefálico", 6),
    ATTENTION, { hasPump: true }
  );
  addOccupied("UTI-P07", "uti",
    makePatient("Arthur Pereira Nunes", 8, "M", "Crise Asmática Grave", 20),
    MILD_CONCERN, { hasPump: true }
  );
  addOccupied("UTI-P08", "uti",
    makePatient("Isabela Rodrigues Melo", 4, "F", "Sepse Meningocócica", 10),
    STABLE, { hasPump: true }
  );
  addOccupied("UTI-P09", "uti",
    makePatient("Bernardo Castro Teixeira", 14, "M", "Politrauma (Acidente de Trânsito)", 8),
    STABLE, { hasPump: false }
  );
  addOccupied("UTI-P10", "uti",
    makePatient("Manuela Gomes Prado", 6, "F", "Síndrome Nefrótica", 48),
    MILD_CONCERN, { hasPump: false }
  );
  addEmpty("UTI-P11", "uti");
  addInoperante("UTI-P12", "uti");

  // Tipos de UTI — 12 leitos por tipo (Adulto/Neonatal/Pediátrica), identificados
  // pelo prefixo do label (UTI-N.. / UTI-P.. / UTI-..).
  for (const b of beds) {
    if (b.unit !== "uti") continue;
    if (b.label.startsWith("UTI-N")) b.utiTipo = "neonatal";
    else if (b.label.startsWith("UTI-P")) b.utiTipo = "pediatrica";
    else b.utiTipo = "adulto";
  }

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
    const ews = calculateEWS(currentScoreVitals(rawHistory, now));

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
