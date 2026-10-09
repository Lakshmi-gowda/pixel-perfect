import { describe, expect, it } from "vitest";
import { infoSchema, normalizeFieldErrors } from "@/api/client";

describe("FastAPI contract adaptation", () => {
  it("maps backend numeric controls without inventing clinical bounds", () => {
    const info = infoSchema.parse({ model_version: "contract-test", features: [{ name: "Age", type: "numeric", required: true }, { name: "Sex", type: "categorical", allowed_values: ["Fmale", "Male"], required: true }] });
    expect(info.features[0]?.type).toBe("number");
    expect(info.features[0]?.min).toBeUndefined();
    expect(info.features[1]?.allowed_values).toEqual(["Fmale", "Male"]);
  });
  it("joins backend field error arrays for inline validation", () => {
    expect(normalizeFieldErrors({ Age: ["Required.", "Send a number."], Sex: "Invalid label." })).toEqual({ Age: "Required. Send a number.", Sex: "Invalid label." });
    expect(normalizeFieldErrors(null)).toEqual({});
  });
});