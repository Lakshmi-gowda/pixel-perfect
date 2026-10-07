import type { ModelInfo, FormValues, Prediction, Contribution } from "./types";
import { vesselIds } from "./types";

// Development metadata only, NOT the final 52-feature clinical schema.
// NEEDS_CONFIRMATION: exact names, categories, units and ranges from the backend team.
export const mockModelInfo: ModelInfo = {
  model_version: "mock-preview-0.1",
  classes: ["CAD", "Normal"],
  features: [
    { name: "age", label: "Age", type: "integer", group: "Demographics" },
    { name: "blood_pressure", label: "Blood pressure", type: "number", group: "Clinical exam" },
    { name: "pulse", label: "Pulse", type: "number", group: "Clinical exam" },
    { name: "cholesterol", label: "Cholesterol", type: "number", group: "Laboratory" },
    { name: "cardiac_enzymes", label: "Cardiac enzymes", type: "number", group: "Laboratory" },
    { name: "ecg_finding", label: "ECG finding (encoded value)", type: "number", group: "ECG" },
    { name: "echo_finding", label: "Echo finding (encoded value)", type: "number", group: "Echo" },
  ].map(f => ({ ...f, type: f.type as "number" | "integer", confirmation: "NEEDS_CONFIRMATION" })),
};
export const samplePatients: FormValues[] = []; // Only real dataset rows supplied by the team may go here.

export async function mockPredict(values: FormValues): Promise<Prediction> {
  await new Promise(resolve => setTimeout(resolve, 650));
  // Arbitrary deterministic UI fixture, not a medical formula or a trained model.
  const numbers = Object.values(values).map(v => Math.abs(Number(v) || 0));
  const signal = Math.min(1, numbers.reduce((a, b) => a + b, 0) / 1000);
  const cad = Math.min(0.93, 0.12 + signal * 0.8);
  const vessels = { LAD: Math.min(0.94, 0.08 + signal * 0.85), LCX: Math.min(0.87, 0.06 + signal * 0.55), RCA: Math.min(0.8, 0.04 + signal * 0.38) };
  const contributions: Prediction["contributions"] = {};
  [...vesselIds, "overall" as const].forEach((id, j) => {
    contributions[id] = Object.keys(values).map((feature, i): Contribution => ({ feature, contribution: ((Number(values[feature]) || 0) / 1000) * (1 - j * 0.12) * (i % 3 === 2 ? -0.4 : 1) }));
  });
  return { prediction: cad >= 0.5 ? "CAD" : "Normal", probabilities: { CAD: cad, Normal: 1 - cad }, vessels, contributions, disclaimer: "Mock output for interface testing only. Not a clinical prediction.", model_version: mockModelInfo.model_version };
}