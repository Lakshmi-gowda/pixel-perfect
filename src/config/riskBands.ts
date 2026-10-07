export const riskBands = { high: 0.6, moderate: 0.3, status: "NEEDS_CONFIRMATION" } as const;
export type RiskBand = "Low" | "Moderate" | "High" | "Unavailable";
export function riskBand(p: number | undefined): RiskBand {
  if (p === undefined || !Number.isFinite(p)) return "Unavailable";
  return p >= riskBands.high ? "High" : p >= riskBands.moderate ? "Moderate" : "Low";
}
// All scene colors are semantic tokens mirrored from the global design system.
export const sceneTokens = { low: "#0D9488", moderate: "#F59E0B", high: "#BE123C", neutral: "#E9B7CB", tissue: "#d9889f", scan: "#DB2777", marker: "#fff0cd", flow: "#FFFFFF", ambient: "#FCE7F3" };
export function riskToColor(p: number | undefined) {
  const band = riskBand(p);
  return band === "High" ? sceneTokens.high : band === "Moderate" ? sceneTokens.moderate : band === "Low" ? sceneTokens.low : sceneTokens.neutral;
}
export const percent = (p: number | undefined) => p === undefined ? "—" : `${Math.round(p * 100)}%`;