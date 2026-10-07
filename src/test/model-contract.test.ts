import { describe, expect, it } from "vitest";
import { riskBand, riskToColor, sceneTokens } from "@/config/riskBands";
import { safeFeatures, validateFeature } from "@/api/types";
import { mockPredict, samplePatients } from "@/api/mock";

describe("Safety and model contract", () => {
  it("excludes outcome columns at the request boundary", () => {
    expect(safeFeatures({ age: 60, Cath: 1, LAD: 1, lcx: 1, RCA: 1 })).toEqual({ age: 60 });
  });
  it("uses confirmed metadata bounds only", () => {
    expect(validateFeature({ name: "value", type: "number" }, 10000)).toBeUndefined();
    expect(validateFeature({ name: "value", type: "number", min: 0, max: 10 }, 11)).toContain("Maximum");
    expect(validateFeature({ name: "value", type: "integer" }, 1.5)).toContain("whole");
    expect(validateFeature({ name: "value", type: "number" }, "")).toContain("required");
  });
  it("validates categorical values from metadata", () => {
    expect(validateFeature({ name: "test", type: "categorical", allowed_values: [0, 1] }, 1)).toBeUndefined();
    expect(validateFeature({ name: "test", type: "categorical", allowed_values: [0, 1] }, 2)).toContain("Choose");
  });
  it("maps each probability independently with neutral unavailable state", () => {
    expect(riskBand(0.29)).toBe("Low");
    expect(riskBand(0.3)).toBe("Moderate");
    expect(riskBand(0.6)).toBe("High");
    expect(riskToColor(undefined)).toBe(sceneTokens.neutral);
    expect(riskToColor(0.1)).not.toBe(riskToColor(0.8));
  });
  it("does not invent sample patients", () => { expect(samplePatients).toEqual([]); });
  it("returns labelled deterministic mock probabilities and contributions", async () => {
    const result = await mockPredict({ test_input: 700 });
    expect(result.model_version).toContain("mock");
    expect(result.probabilities.CAD + result.probabilities.Normal).toBeCloseTo(1);
    expect(result.vessels?.LAD).not.toEqual(result.vessels?.RCA);
    expect(result.contributions?.LAD?.[0]?.feature).toBe("test_input");
  });
});