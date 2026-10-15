import { describe, expect, it } from "vitest";
import { adaptModelInfo, adaptPrediction, buildPredictionRequest, infoSchema, normalizeFieldErrors } from "@/api/client";

describe("FastAPI contract adaptation", () => {
  it("maps backend numeric controls without inventing clinical bounds", () => {
    const info = infoSchema.parse({ model_version: "contract-test", features: [{ name: "Age", type: "numeric", allowed_values: null, required: true }, { name: "Sex", type: "categorical", allowed_values: ["Fmale", "Male"], required: true }] });
    expect(info.features[0]?.type).toBe("number");
    expect(info.features[0]?.min).toBeUndefined();
    expect(info.features[0]?.allowed_values).toBeUndefined();
    expect(info.features[1]?.allowed_values).toEqual(["Fmale", "Male"]);
  });
  it("joins backend field error arrays for inline validation", () => {
    expect(normalizeFieldErrors({ Age: ["Required.", "Send a number."], Sex: "Invalid label." })).toEqual({ Age: "Required. Send a number.", Sex: "Invalid label." });
    expect(normalizeFieldErrors(null)).toEqual({});
  });
  it("keeps the 52 CAD and 55 artery request contracts separate and excludes targets", () => {
    const features = Array.from({ length: 52 }, (_, i) => i < 18 ? { name: `category-${i}`, type: "categorical", allowed_values: ["N", "Y"] } : { name: `number-${i}`, type: "numeric" });
    const artery_features = [...features, ...["CHF", "Exertional CP", "LowTH Ang"].map(name => ({ name, type: "categorical", allowed_values: ["N"] }))];
    const info = adaptModelInfo(infoSchema.parse({ features, artery_features, model_version: "unit-test" }));
    const values = Object.fromEntries(info.features.map(f => [f.name, f.type === "categorical" ? "N" : 1]));
    const body = buildPredictionRequest({ ...values, Cath: "CAD", LAD: 1, LCX: 1, RCA: 1 }, info);
    expect(Object.keys(body.cad_features)).toHaveLength(52);
    expect(Object.keys(body.artery_features)).toHaveLength(55);
    expect(body.cad_features).not.toHaveProperty("CHF");
    expect(body.artery_features).toHaveProperty("CHF", "N");
    for (const target of ["Cath", "LAD", "LCX", "RCA"]) expect(body.artery_features).not.toHaveProperty(target);
    expect(() => buildPredictionRequest({}, info)).toThrow("highlighted");
  });
  it("rejects a missing CAD result and never fabricates unavailable artery scores", () => {
    expect(() => adaptPrediction({ cad_prediction: null, artery_predictions: null })).toThrow("overall CAD");
    const cad = { prediction: "Normal", probabilities: { CAD: 0, Normal: 1 }, model_version: "unit-test" };
    expect(adaptPrediction({ cad_prediction: cad, artery_predictions: null }).vessels).toBeUndefined();
    const result = adaptPrediction({ cad_prediction: cad, artery_predictions: { LAD: { stenotic_probability: 0, predicted_class: "Normal" } } });
    expect(result.vessels).toEqual({ LAD: 0 });
    expect(result.arteryPredictions).toEqual({ LAD: { stenotic_probability: 0, predicted_class: "Normal" } });
    expect(() => adaptPrediction({ cad_prediction: cad, artery_predictions: { RCA: { stenotic_probability: 2 } } })).toThrow("incompatible");
  });
});