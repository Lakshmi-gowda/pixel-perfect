export const vesselIds = ["LAD", "LCX", "RCA"] as const;
export type VesselId = typeof vesselIds[number];
export type FeatureValue = number | string;
export type FormValues = Record<string, FeatureValue>;
export interface FeatureDefinition {
  name: string;
  label?: string | undefined;
  type: "number" | "integer" | "categorical";
  group?: string | undefined;
  allowed_values?: (string | number)[] | undefined;
  min?: number | undefined;
  max?: number | undefined;
  unit?: string | undefined;
  required?: boolean | undefined;
  confirmation?: string | undefined;
}
export interface ModelInfo { features: FeatureDefinition[]; cadFeatures?: FeatureDefinition[] | undefined; arteryFeatures?: FeatureDefinition[] | undefined; model_version: string; classes?: string[] | undefined }
export interface Contribution { feature: string; contribution: number }
export interface Prediction {
  prediction: "CAD" | "Normal";
  probabilities: { CAD: number; Normal: number };
  vessels?: Partial<Record<VesselId, number | undefined>> | undefined;
  arteryPredictions?: Partial<Record<VesselId, { stenotic_probability: number; predicted_class?: string | undefined } | undefined>> | undefined;
  contributions?: Partial<Record<VesselId | "overall", Contribution[] | undefined>> | undefined;
  disclaimer?: string | undefined;
  model_version: string;
}
export interface ChatTurn { role: "user" | "assistant"; content: string }
export interface ChatAssessment {
  cad_prediction: "CAD" | "Normal";
  probabilities: { CAD: number; Normal: number };
  artery_predictions: Partial<Record<VesselId, { stenotic_probability: number; predicted_class?: string | undefined }>>;
}
export class ApiError extends Error {
  constructor(message: string, public fields: Record<string, string> = {}, public code = "unknown") { super(message); }
}
export const excluded = new Set(["cath", "lad", "lcx", "rca"]);
export function safeFeatures(values: FormValues): FormValues {
  return Object.fromEntries(Object.entries(values).filter(([name]) => !excluded.has(name.trim().toLowerCase())));
}
export function validateFeature(f: FeatureDefinition, value: FeatureValue | undefined): string | undefined {
  if (value === undefined || value === "") return f.required === false ? undefined : "This measurement is required.";
  if (f.type === "categorical") return f.allowed_values?.includes(value) ? undefined : "Choose an available value.";
  const n = Number(value);
  if (!Number.isFinite(n)) return "Enter a valid number.";
  if (f.type === "integer" && !Number.isInteger(n)) return "Enter a whole number.";
  if (f.min !== undefined && n < f.min) return `Minimum from model: ${f.min}.`;
  if (f.max !== undefined && n > f.max) return `Maximum from model: ${f.max}.`;
  return undefined;
}