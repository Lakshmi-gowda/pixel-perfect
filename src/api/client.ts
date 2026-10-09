import { z } from "zod";
import { ApiError, excluded, safeFeatures, type ModelInfo, type FormValues, type Prediction } from "./types";
import { mockModelInfo, mockPredict } from "./mock";

export const USE_MOCK = import.meta.env['VITE_USE_MOCK'] === "true";
const BASE_URL = (import.meta.env['VITE_API_BASE_URL'] || (import.meta.env.DEV ? "/model-api" : "")).replace(/\/$/, "");
const probability = z.number().min(0).max(1);
const attribution = z.array(z.object({ feature: z.string(), contribution: z.number() }));
const predictionSchema = z.object({
  prediction: z.enum(["CAD", "Normal"]), probabilities: z.object({ CAD: probability, Normal: probability }),
  vessels: z.object({ LAD: probability.optional(), LCX: probability.optional(), RCA: probability.optional() }).optional(),
  contributions: z.object({ LAD: attribution.optional(), LCX: attribution.optional(), RCA: attribution.optional(), overall: attribution.optional() }).optional(),
  disclaimer: z.string().optional(), model_version: z.string(),
});
export const infoSchema = z.object({ features: z.array(z.object({ name: z.string(), label: z.string().optional(), type: z.enum(["numeric", "number", "integer", "categorical"]).transform(type => type === "numeric" ? "number" as const : type), group: z.string().optional(), allowed_values: z.array(z.union([z.string(), z.number()])).optional(), min: z.number().optional(), max: z.number().optional(), unit: z.string().optional(), required: z.boolean().optional() })), model_version: z.string(), classes: z.array(z.string()).optional() });

export function normalizeFieldErrors(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).map(([name, reasons]) => [name, Array.isArray(reasons) ? reasons.filter(r => typeof r === "string").join(" ") : typeof reasons === "string" ? reasons : "Invalid value."]));
}

async function request(path: string, body?: unknown) {
  if (!BASE_URL) throw new ApiError("The model service is not connected yet. Set the API address to connect it.", {}, "model_unavailable");
  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, { method: body ? "POST" : "GET", headers: { "Content-Type": "application/json" }, ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(20000) });
  } catch { throw new ApiError("The model service could not be reached. Check the connection and try again.", {}, "offline"); }
  let json;
  try { json = await response.json(); } catch { throw new ApiError("The model service returned an unreadable response."); }
  if (!response.ok || json.success === false) throw new ApiError(json.error?.message || "The model service could not complete the request.", normalizeFieldErrors(json.error?.fields), json.error?.code || "unknown");
  return json.data ?? json;
}
export async function getModelInfo(): Promise<ModelInfo> {
  const data = USE_MOCK ? mockModelInfo : infoSchema.parse(await request("/model-info"));
  const features = data.features.filter(f => !excluded.has(f.name.toLowerCase()));
  if (!USE_MOCK && (features.length !== 52 || new Set(features.map(f => f.name)).size !== 52)) throw new ApiError("The model service returned an unexpected input contract.");
  return { ...data, features };
}
export async function predict(values: FormValues): Promise<Prediction> {
  const features = safeFeatures(values);
  return USE_MOCK ? mockPredict(features) : predictionSchema.parse(await request("/predict", { features }));
}