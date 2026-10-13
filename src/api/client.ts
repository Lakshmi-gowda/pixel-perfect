import { z } from "zod";
import { ApiError, excluded, safeFeatures, type ModelInfo, type FormValues, type Prediction } from "./types";
import { mockModelInfo, mockPredict } from "./mock";
import { modelBaseUrl, modelRequest } from "./transport";
export { normalizeFieldErrors } from "./transport";

export const USE_MOCK = import.meta.env['VITE_USE_MOCK'] === "true";
const probability = z.number().min(0).max(1);
const attribution = z.array(z.object({ feature: z.string(), contribution: z.number() }));
const artery = z.object({ stenotic_probability: probability, predicted_class: z.string().optional() });
const predictionSchema = z.object({
  prediction: z.enum(["CAD", "Normal"]), probabilities: z.object({ CAD: probability, Normal: probability }),
  artery_predictions: z.object({ LAD: artery.optional(), LCX: artery.optional(), RCA: artery.optional() }).optional(),
  vessels: z.object({ LAD: probability.optional(), LCX: probability.optional(), RCA: probability.optional() }).optional(),
  contributions: z.object({ LAD: attribution.optional(), LCX: attribution.optional(), RCA: attribution.optional(), overall: attribution.optional() }).optional(),
  disclaimer: z.string().optional(), model_version: z.string(),
});
export const infoSchema = z.object({ features: z.array(z.object({ name: z.string(), label: z.string().optional(), type: z.enum(["numeric", "number", "integer", "categorical"]).transform(type => type === "numeric" ? "number" as const : type), group: z.string().optional(), allowed_values: z.array(z.union([z.string(), z.number()])).nullish().transform(values => values ?? undefined), min: z.number().optional(), max: z.number().optional(), unit: z.string().optional(), required: z.boolean().optional() })), model_version: z.string(), classes: z.array(z.string()).optional() });

async function request(path: string, body?: unknown) {
  return modelRequest(modelBaseUrl(import.meta.env['VITE_API_BASE_URL'], import.meta.env.DEV), path, body);
}
export async function getModelInfo(): Promise<ModelInfo> {
  const parsed = USE_MOCK ? { success: true as const, data: mockModelInfo } : infoSchema.safeParse(await request("/model-info"));
  if (!parsed.success) throw new ApiError("The model service returned incompatible input definitions. Check its /model-info contract.", {}, "invalid_model_info");
  const data = parsed.data;
  const features = data.features.filter(f => !excluded.has(f.name.toLowerCase()));
  if (!USE_MOCK && (features.length !== 52 || new Set(features.map(f => f.name)).size !== 52)) throw new ApiError("The model service returned an unexpected input contract.");
  if (!USE_MOCK && (features.filter(f => f.type === "categorical").length !== 18 || features.some(f => f.type === "categorical" && !f.allowed_values?.length))) throw new ApiError("The model service must provide all 18 saved categorical definitions.", {}, "invalid_model_info");
  return { ...data, features };
}
export async function predict(values: FormValues): Promise<Prediction> {
  const features = safeFeatures(values);
  if (USE_MOCK) return mockPredict(features);
  const info = await getModelInfo();
  const expected = new Set(info.features.map(f => f.name));
  if (Object.keys(features).length !== 52 || Object.keys(features).some(name => !expected.has(name))) throw new ApiError("Provide all 52 model inputs with their exact saved names before analyzing.", {}, "invalid_features");
  const result = predictionSchema.safeParse(await request("/predict", { features }));
  if (!result.success) throw new ApiError("The model service returned incompatible prediction data.", {}, "invalid_prediction");
  return result.data;
}