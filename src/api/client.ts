import { z } from "zod";
import { ApiError, excluded, safeFeatures, validateFeature, type FeatureDefinition, type ModelInfo, type FormValues, type Prediction } from "./types";
import { mockModelInfo, mockPredict } from "./mock";
import { modelBaseUrl, modelRequest } from "./transport";
export { normalizeFieldErrors } from "./transport";

export const USE_MOCK = import.meta.env['VITE_USE_MOCK'] === "true";
const probability = z.number().min(0).max(1);
const attribution = z.array(z.object({ feature: z.string(), contribution: z.number() }));
const artery = z.object({ stenotic_probability: probability, predicted_class: z.string().optional() });
const cadPredictionSchema = z.object({
  prediction: z.enum(["CAD", "Normal"]), probabilities: z.object({ CAD: probability, Normal: probability }),
  disclaimer: z.string().optional(), model_version: z.string(),
});
export const predictionSchema = z.object({ cad_prediction: cadPredictionSchema.nullish(), artery_predictions: z.object({ LAD: artery.optional(), LCX: artery.optional(), RCA: artery.optional() }).nullish() });
const featureSchema = z.object({ name: z.string(), label: z.string().optional(), type: z.enum(["numeric", "number", "integer", "categorical"]).transform(type => type === "numeric" ? "number" as const : type), group: z.string().optional(), allowed_values: z.array(z.union([z.string(), z.number()])).nullish().transform(values => values ?? undefined), min: z.number().optional(), max: z.number().optional(), unit: z.string().optional(), required: z.boolean().optional() });
export const infoSchema = z.object({ features: z.array(featureSchema), artery_features: z.array(featureSchema).optional(), model_version: z.string(), classes: z.array(z.string()).optional() });

export function adaptModelInfo(data: z.infer<typeof infoSchema>): ModelInfo {
  const clean = (features: FeatureDefinition[]) => features.filter(f => !excluded.has(f.name.trim().toLowerCase()));
  const cadFeatures = clean(data.features);
  const arteryFeatures = clean(data.artery_features ?? []);
  const check = (features: FeatureDefinition[], count: number) => {
    if (features.length !== count || new Set(features.map(f => f.name)).size !== count || features.some(f => f.type === "categorical" && !f.allowed_values?.length)) throw new ApiError("The model service returned an unexpected input contract.", {}, "invalid_model_info");
  };
  check(cadFeatures, 52); check(arteryFeatures, 55);
  if (cadFeatures.filter(f => f.type === "categorical").length !== 18) throw new ApiError("The model service must provide all 18 saved CAD categorical definitions.", {}, "invalid_model_info");
  const byName = new Map(cadFeatures.map(f => [f.name, f]));
  for (const feature of arteryFeatures) {
    const shared = byName.get(feature.name);
    if (shared && (shared.type !== feature.type || JSON.stringify(shared.allowed_values) !== JSON.stringify(feature.allowed_values))) throw new ApiError(`The models disagree on the input definition for ${feature.name}.`, {}, "invalid_model_info");
    if (!shared) byName.set(feature.name, feature);
  }
  if (byName.size !== 55) throw new ApiError("The CAD and artery input contracts do not share the expected measurements.", {}, "invalid_model_info");
  return { features: [...byName.values()], cadFeatures, arteryFeatures, model_version: data.model_version, classes: data.classes };
}

export function buildPredictionRequest(values: FormValues, info: ModelInfo) {
  const safe = safeFeatures(values);
  const select = (definitions: FeatureDefinition[] | undefined, count: number) => {
    if (!definitions || definitions.length !== count) throw new ApiError("Reload the model inputs before analyzing.", {}, "invalid_features");
    const fields: Record<string, string> = {};
    const result: FormValues = {};
    for (const feature of definitions) {
      if (excluded.has(feature.name.trim().toLowerCase())) throw new ApiError("The model contract includes a forbidden prediction target.", {}, "invalid_features");
      const value = safe[feature.name];
      const error = validateFeature(feature, value);
      if (error) fields[feature.name] = error;
      else if (value !== undefined) result[feature.name] = value;
    }
    if (Object.keys(fields).length) throw new ApiError("Correct the highlighted inputs.", fields, "invalid_features");
    return result;
  };
  return { cad_features: select(info.cadFeatures, 52), artery_features: select(info.arteryFeatures, 55) };
}

export function adaptPrediction(value: unknown): Prediction {
  const parsed = predictionSchema.safeParse(value);
  if (!parsed.success) throw new ApiError("The model service returned incompatible prediction data.", {}, "invalid_prediction");
  const { cad_prediction, artery_predictions } = parsed.data;
  if (!cad_prediction) throw new ApiError("The model service did not return the overall CAD prediction.", {}, "missing_cad_prediction");
  const vessels = artery_predictions ? Object.fromEntries(Object.entries(artery_predictions).filter(([, a]) => a !== undefined).map(([id, a]) => [id, a?.stenotic_probability])) : undefined;
  return { ...cad_prediction, vessels };
}

async function request(path: string, body?: unknown) {
  return modelRequest(modelBaseUrl(import.meta.env['VITE_API_BASE_URL'], import.meta.env.DEV), path, body);
}
export async function getModelInfo(): Promise<ModelInfo> {
  if (USE_MOCK) return mockModelInfo;
  const parsed = infoSchema.safeParse(await request("/model-info"));
  if (!parsed.success) throw new ApiError("The model service returned incompatible input definitions. Check its /model-info contract.", {}, "invalid_model_info");
  return adaptModelInfo(parsed.data);
}
export async function predict(values: FormValues): Promise<Prediction> {
  const features = safeFeatures(values);
  if (USE_MOCK) return mockPredict(features);
  const info = await getModelInfo();
  return adaptPrediction(await request("/predict", buildPredictionRequest(features, info)));
}