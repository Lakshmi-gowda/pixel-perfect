import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Activity, ArrowUpRight, CircleCheck, FlaskConical, HeartPulse, Info, ListFilter, LoaderCircle, RotateCcw, SlidersHorizontal, Sparkles, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HeartViewer } from "@/components/three/HeartViewer";
import { useAssessment } from "@/store/assessment";
import { vesselIds, type FormValues, type Prediction, type VesselId } from "@/api/types";
import { riskBand, percent } from "@/config/riskBands";
import { disclaimer } from "@/config/disclaimer";
import { conditions, vesselConditions } from "@/content/conditions";
import { USE_MOCK } from "@/api/client";

function useTimeline(replay: number) {
  const [elapsed, setElapsed] = useState(0);
  const { setStatus } = useAssessment();
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) { setElapsed(6); setStatus("success"); return; }
    setElapsed(0); setStatus("animating");
    const started = performance.now();
    const timer = setInterval(() => {
      const time = (performance.now() - started) / 1000;
      setElapsed(Math.min(time, 6));
      if (time >= 5) { clearInterval(timer); setStatus("success"); }
    }, 80);
    return () => clearInterval(timer);
  }, [replay, setStatus]);
  return elapsed;
}

function WhyPanel({ result, vessel }: { result: Prediction; vessel: VesselId | null }) {
  const { modelInfo } = useAssessment();
  const contributions = vessel ? result.contributions?.[vessel] : result.contributions?.overall;
  const top = [...(contributions || [])].sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution)).slice(0, 5);
  const label = (name: string) => modelInfo?.features.find(f => f.name === name)?.label || name;
  const max = Math.max(0.001, ...top.map(c => Math.abs(c.contribution)));
  return <section className="panel"><h2 className="panel-title"><Sparkles />Why {vessel || "this result"}?</h2>
    {USE_MOCK && <p className="small-copy">Mock contributions · not clinical explanations</p>}
    {top.length ? <>
      {top.map(c => <div className={`explanation-row ${c.contribution < 0 ? "negative" : ""}`} key={c.feature}><span>{label(c.feature)}</span><progress className={`risk-progress ${c.contribution < 0 ? "low" : ""}`} max={max} value={Math.abs(c.contribution)} aria-label={`${label(c.feature)} contribution ${c.contribution}`} /><strong>{c.contribution > 0 ? "+" : ""}{c.contribution.toFixed(3)}</strong></div>)}
      <p className="small-copy">{label(top[0]?.feature || "")} has the largest contribution to this {USE_MOCK ? "mock " : ""}estimate. Contributions describe the model, not causes.</p>
    </> : <p className="small-copy">Feature contributions are not available from this model. No explanation is inferred.</p>}
  </section>;
}

function Measurements({ result, vessel }: { result: Prediction; vessel: VesselId | null }) {
  const { modelInfo, formValues } = useAssessment();
  const [sort, setSort] = useState(false);
  const contributions = vessel ? result.contributions?.[vessel] : result.contributions?.overall;
  const rows = Object.entries(formValues).map(([name, value]) => ({ name, value, contribution: contributions?.find(c => c.feature === name)?.contribution }));
  if (sort) rows.sort((a, b) => Math.abs(b.contribution ?? 0) - Math.abs(a.contribution ?? 0));
  return <section className="panel"><div className="flex justify-between items-start"><h2 className="panel-title"><Activity />Measurements</h2><Button variant="ghost" size="icon" title="Sort by contribution" aria-label="Sort by contribution" aria-pressed={sort} onClick={() => setSort(v => !v)}><ListFilter /></Button></div>
    <table className="measurements"><thead><tr><th>Measurement</th><th>Value</th><th>Contribution</th></tr></thead><tbody>{rows.map(row => <tr key={row.name}><td>{modelInfo?.features.find(f => f.name === row.name)?.label || row.name}</td><td>{row.value}</td><td>{row.contribution === undefined ? "Unavailable" : `${row.contribution > 0 ? "+" : ""}${row.contribution.toFixed(3)}`}</td></tr>)}</tbody></table>
  </section>;
}

function WhatIf() {
  const { modelInfo, formValues, analyze, error } = useAssessment();
  const [draft, setDraft] = useState<FormValues>(formValues);
  const initial = useRef(formValues);
  const [updating, setUpdating] = useState(false);
  const [changed, setChanged] = useState(false);
  const generation = useRef(0);
  const changedRef = useRef(false);
  const sliders = modelInfo?.features.filter(f => f.type !== "categorical").slice(0, 4) || [];
  // Clinical bounds are used only when supplied by model-info. Mock sliders use a
  // labelled interface-test interval, NOT a physiological/clinical valid range.
  const enabled = sliders.filter(f => USE_MOCK || (f.min !== undefined && f.max !== undefined));
  useEffect(() => {
    if (!changedRef.current) return;
    const current = ++generation.current;
    const timer = setTimeout(async () => {
      setUpdating(true);
      await analyze(draft, true);
      if (current === generation.current) setUpdating(false);
    }, 450);
    return () => clearTimeout(timer);
  }, [draft, analyze]);
  const update = (name: string, value: number) => { changedRef.current = true; setChanged(true); setDraft(v => ({ ...v, [name]: value })); };
  return <section className="panel"><h2 className="panel-title"><SlidersHorizontal />What if?</h2><p className="small-copy">{USE_MOCK ? "Interface-test sliders only. These intervals are not clinical ranges; outputs are mock data." : "Alternative model estimates, not treatment recommendations."}</p>
    {!enabled.length && <div className="message">Sliders need confirmed feature ranges from the model service.</div>}
    {enabled.map(f => {
      const value = Number(draft[f.name]) || 0;
      const baseline = Number(initial.current[f.name]) || 0;
      const min = f.min ?? Math.min(0, baseline);
      const max = f.max ?? Math.max(100, Math.ceil(baseline * 2));
      return <div className="slider-row" key={f.name}><label className="slider-label" htmlFor={`whatif-${f.name}`}><span>{f.label || f.name}</span><strong>{value}</strong></label><input id={`whatif-${f.name}`} type="range" min={min} max={max} step={f.type === "integer" ? 1 : (max - min) / 100} value={value} onChange={e => update(f.name, Number(e.target.value))} /><div className="slider-limits"><span>{min}</span><span>{max}</span></div></div>;
    })}
    <p className="small-copy mt-5" aria-live="polite">{updating ? "Updating estimate…" : changed ? "Alternative inputs applied to the current estimate." : ""}</p>
    {error && <p role="alert" className="field-error">{error.message}</p>}
  </section>;
}

export function ResultsDashboard() {
  const state = useAssessment();
  const { prediction: result, selectedVessel, setSelectedVessel, reset, modelInfo, formValues } = state;
  const navigate = useNavigate();
  const [replay, setReplay] = useState(0);
  const elapsed = useTimeline(replay);
  useEffect(() => {
    if (!result) { state.setNotice("Enter patient details first to see an estimate."); void navigate({ to: "/assess", replace: true }); }
  }, [result, navigate, state.setNotice]);
  const highest = useMemo(() => [...vesselIds].filter(id => result?.vessels?.[id] !== undefined).sort((a, b) => (result?.vessels?.[b] ?? 0) - (result?.vessels?.[a] ?? 0))[0], [result]);
  if (!result) return <div className="page"><p className="page-intro">Opening patient details…</p></div>;
  const condition = conditions[result.prediction];
  const step = elapsed < 1.4 ? 0 : elapsed < 3.2 ? 1 : elapsed < 4.8 ? 2 : 3;
  const vessel = selectedVessel || highest || null;
  const p = vessel ? result.vessels?.[vessel] : undefined;
  const noneAbove = highest && (result.vessels?.[highest] ?? 0) < 0.3;
   const callout = !highest ? (step === 0 ? "Reading patient features" : step === 1 ? "Displaying overall model probabilities" : "Overall CAD model only · artery probabilities unavailable") : step === 0 ? "Reading patient features" : step === 1 ? "Mapping risk to each artery" : step === 2 ? "Locating the highest-risk artery" : noneAbove ? "No artery above moderate risk" : `${vessel}: ${percent(p)} predicted risk (${riskBand(p)})`;
  return <div className="page">
    <div className="result-header"><div><p className="eyebrow"><FlaskConical size={13} />{USE_MOCK ? "Mock assessment" : "Assessment"}</p><h1 className="page-title">A closer look.</h1></div><div className="action-row"><Button variant="outline" onClick={() => setReplay(v => v + 1)}><RotateCcw />Replay</Button><Button asChild variant="outline"><Link to="/assess">Edit details</Link></Button></div></div>
    <div className={`verdict ${result.prediction === "Normal" ? "normal" : ""}`}><div className="verdict-icon">{result.prediction === "Normal" ? <CircleCheck /> : <TriangleAlert />}</div><div><h2>Predicted: {result.prediction}</h2><p className="small-copy">{USE_MOCK ? "Mock output · not a real prediction" : "Model-predicted estimate"} · {result.model_version}</p></div><div className="verdict-stats"><div className="verdict-stat"><strong>{percent(result.probabilities.CAD)}</strong><span>CAD probability</span></div><div className="verdict-stat"><strong>{percent(result.probabilities.Normal)}</strong><span>Normal probability</span></div></div></div>
    <p className="result-disclaimer">{disclaimer.result}</p>
    <div className="result-grid"><section className="stage" aria-label="3D heart analysis">
       <div className="stage-top"><div className="stage-title"><strong>Heart & coronary arteries</strong><span>Schematic view</span></div><div className="analysis-steps">{(highest ? ["Read data", "Map arteries", "Locate risk", "Explain"] : ["Read data", "Overall CAD", "Check scope", "Result"]).map((label, i) => <div className={`analysis-chip ${step === i ? "current" : ""}`} key={label}><span>{i < step ? "✓" : i + 1}</span>{label}</div>)}</div></div>
      <div className="canvas-wrap"><HeartViewer vessels={result.vessels} selected={vessel} onSelect={setSelectedVessel} elapsed={elapsed} /></div>
      <div className="stage-callout"><strong aria-live="polite">{callout}</strong><p>{disclaimer.schematic}</p></div>
       {highest && <><div className="legend"><span><i className="low" />Low &lt;30%</span><span><i className="moderate" />Moderate 30–59%</span><span><i className="high" />High ≥60%</span></div><p className="small-copy px-4 pb-3">Provisional preview bands · not clinical standards</p></>}
    </section><div className="result-side"><section className="panel"><h2 className="panel-title"><HeartPulse />Artery probabilities</h2><p className="small-copy">Overall: {result.prediction}{highest ? ` · Highest: ${highest} ${percent(result.vessels?.[highest])} (${riskBand(result.vessels?.[highest])})` : ""}</p>
      {vesselIds.map(id => { const probability = result.vessels?.[id]; const band = riskBand(probability); return <Button variant="ghost" className={`vessel-row ${vessel === id ? "selected" : ""}`} key={id} aria-label={`Select ${id}, ${percent(probability)}, ${band} predicted risk`} aria-pressed={vessel === id} onClick={() => setSelectedVessel(id)}><div className="vessel-row-top"><strong>{id}</strong><b>{percent(probability)}</b><span className={`band band-${band.toLowerCase()}`}>{band}</span></div><progress className={`risk-progress ${band.toLowerCase()}`} max={1} value={probability ?? 0} aria-label={`${id} probability`} /></Button>; })}
      <p className="small-copy mt-4">{disclaimer.result}</p>{!result.vessels && <p className="small-copy mt-3">The model did not provide artery probabilities. All vessels stay neutral.</p>}
    </section><WhyPanel result={result} vessel={vessel} /></div></div>
    <div className="result-lower"><section className="panel"><h2 className="panel-title"><Info />{condition.title}</h2><p className="small-copy">{condition.text}</p>{highest && result.prediction === "Normal" && <p className="small-copy mt-3">Highest artery estimate: {highest}, {percent(result.vessels?.[highest])} ({riskBand(result.vessels?.[highest])}).</p>}{vessel && <div className="about-vessel"><strong>Selected artery: {vessel} · {percent(p)} · {riskBand(p)}</strong><p className="small-copy mt-2">{vesselConditions[vessel]}</p></div>}{highest && result.prediction === "CAD" && <div className="about-vessel"><strong>Highest predicted risk: {highest} · {percent(result.vessels?.[highest])} · {riskBand(result.vessels?.[highest])}</strong><p className="small-copy">{vesselConditions[highest]}</p></div>}<Button variant="link" asChild className="px-0 mt-3"><Link to="/learn" hash={condition.topic}>Learn more <ArrowUpRight /></Link></Button></section><WhatIf /></div>
    <div className="mt-6"><Measurements result={result} vessel={vessel} /></div>
    <details className="patient-summary"><summary>Patient summary</summary><dl className="patient-values">{Object.entries(formValues).map(([name, value]) => <div key={name}><dt>{modelInfo?.features.find(f => f.name === name)?.label || name}</dt><dd>{value}</dd></div>)}</dl><Button variant="outline" asChild><Link to="/assess">Edit details</Link></Button></details>
    {result.disclaimer && <p className="small-copy mt-5">{result.disclaimer}</p>}
    <div className="action-row results-actions"><Button onClick={() => { reset(); void navigate({ to: "/assess" }); }}>New patient <ArrowUpRight /></Button><Button asChild variant="outline"><Link to="/learn">Learn more</Link></Button><Button variant="ghost" onClick={() => setReplay(v => v + 1)}><RotateCcw />Replay animation</Button>{state.status === "loading" && <LoaderCircle className="spin text-primary" size={16} />}</div>
  </div>;
}