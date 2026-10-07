import type { VesselId } from "@/api/types";
// Normalized, front-facing schematic overlays, not lesion coordinates.
// NEEDS_CONFIRMATION: qualified anatomy review of control points.
export const vesselCurves: Record<VesselId, [number, number, number][]> = {
  LAD: [[0.08, 0.65, 0.58], [0.02, 0.38, 0.77], [-0.08, 0.05, 0.83], [-0.16, -0.35, 0.68], [-0.28, -0.78, 0.43]],
  LCX: [[0.08, 0.65, 0.58], [0.4, 0.55, 0.67], [0.68, 0.35, 0.52], [0.85, 0.1, 0.27], [0.77, -0.14, -0.05]],
  RCA: [[-0.24, 0.73, 0.48], [-0.53, 0.56, 0.61], [-0.7, 0.27, 0.55], [-0.64, -0.09, 0.46], [-0.45, -0.42, 0.4]],
};