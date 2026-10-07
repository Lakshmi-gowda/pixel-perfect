import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { getModelInfo, predict } from "@/api/client";
import { ApiError, type FormValues, type ModelInfo, type Prediction, type VesselId } from "@/api/types";

function useAssessmentState() {
  const requestId = useRef(0);
  const [modelInfo, setModelInfo] = useState<ModelInfo>();
  const [formValues, setFormValues] = useState<FormValues>({});
  const [prediction, setPrediction] = useState<Prediction>();
  const [selectedVessel, setSelectedVessel] = useState<VesselId | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "animating" | "success" | "error">("idle");
  const [error, setError] = useState<ApiError>();
  const [notice, setNotice] = useState("");
  const loadModel = useCallback(async () => {
    setError(undefined);
    try { setModelInfo(await getModelInfo()); } catch (e) { setError(e instanceof ApiError ? e : new ApiError("Model information is unavailable.")); }
  }, []);
  const analyze = useCallback(async (values: FormValues, whatIf = false) => {
    const current = ++requestId.current;
    setStatus("loading"); setError(undefined);
    try {
      const result = await predict(values);
      if (current !== requestId.current) return undefined;
      setPrediction(result); setFormValues(values); setStatus(whatIf ? "success" : "animating");
      if (!whatIf) {
        const ids: VesselId[] = ["LAD", "LCX", "RCA"];
        setSelectedVessel(result.vessels ? ids.sort((a, b) => (result.vessels?.[b] ?? -1) - (result.vessels?.[a] ?? -1))[0] ?? null : null);
      }
      return result;
    } catch (e) { if (current !== requestId.current) return undefined; setError(e instanceof ApiError ? e : new ApiError("The prediction could not be read. Try again.")); setStatus("error"); return undefined; }
  }, []);
  const reset = useCallback(() => { requestId.current++; setFormValues({}); setPrediction(undefined); setSelectedVessel(null); setStatus("idle"); setError(undefined); setNotice(""); }, []);
  return { modelInfo, formValues, setFormValues, prediction, selectedVessel, setSelectedVessel, status, setStatus, error, loadModel, analyze, reset, notice, setNotice };
}
const AssessmentContext = createContext<ReturnType<typeof useAssessmentState> | null>(null);
export function AssessmentProvider({ children }: { children: ReactNode }) {
  return <AssessmentContext.Provider value={useAssessmentState()}>{children}</AssessmentContext.Provider>;
}
export function useAssessment() {
  const state = useContext(AssessmentContext);
  if (!state) throw new Error("Assessment provider is missing");
  return state;
}