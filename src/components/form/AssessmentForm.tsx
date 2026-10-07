import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, ArrowUpRight, ClipboardList, Database, HeartPulse, LoaderCircle, LockKeyhole, RotateCcw, ScanLine, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAssessment } from "@/store/assessment";
import { validateFeature, type FeatureValue } from "@/api/types";
import { samplePatients } from "@/api/mock";
import { USE_MOCK } from "@/api/client";
import { disclaimer } from "@/config/disclaimer";

export function AssessmentForm() {
  const state = useAssessment();
  const { modelInfo, formValues, setFormValues, loadModel, analyze, status, error, notice } = state;
  const [step, setStep] = useState(0);
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const [sampleNotice, setSampleNotice] = useState(false);
  const navigate = useNavigate();
  useEffect(() => { if (!modelInfo) void loadModel(); }, [modelInfo, loadModel]);
  const groups = useMemo(() => [...new Set(modelInfo?.features.map(f => f.group || (f.type === "categorical" ? "Categories" : "Measurements")) || [])], [modelInfo]);
  const fields = modelInfo?.features || [];
  const current = fields.filter(f => (f.group || (f.type === "categorical" ? "Categories" : "Measurements")) === groups[step]);
  const errors = Object.fromEntries(fields.map(f => [f.name, validateFeature(f, formValues[f.name])]).filter(([, value]) => value));
  const complete = fields.length - Object.keys(errors).length;
  const currentValid = current.every(f => !errors[f.name]);
  const valid = fields.length > 0 && Object.keys(errors).length === 0;
  const update = (name: string, value: FeatureValue) => { setFormValues(v => ({ ...v, [name]: value })); };
  const submit = async () => {
    if (!valid) return;
    const result = await analyze(formValues);
    if (result) { state.setNotice(""); void navigate({ to: "/results" }); }
  };
  return <div className="page">
    <p className="eyebrow"><ClipboardList size={13} />Your assessment</p><h1 className="page-title">Patient details.</h1><p className="page-intro">Enter the measurements below. All fields come from the model’s inputs.</p>
    {notice && <p className="message" role="status">{notice}</p>}
    {error && <div className="message error" role="alert"><p>{error.message}</p><Button variant="outline" className="mt-3" onClick={() => { if (!modelInfo) void loadModel(); else void submit(); }}>Try again <RotateCcw /></Button></div>}
    {!modelInfo ? <div className="message" role="status">{error ? "Model information unavailable." : "Loading model inputs…"}</div> : <div className="assess-layout"><section className="panel">
      {USE_MOCK && <div className="preview-note"><strong>Development preview</strong><br />These {fields.length} example input definitions are not the final 52-feature schema. Names, units, categories and ranges need confirmation. No clinical ranges are assumed.</div>}
      <div className="flex items-center justify-between"><p className="small-copy">Section {step + 1} of {groups.length}</p><p className="small-copy">{complete} / {fields.length} complete</p></div>
      <div className="progress-track" aria-label={`${complete} of ${fields.length} inputs complete`}>{groups.map((group, i) => <span className={i <= step ? "done" : ""} key={group} />)}</div>
      <nav className="step-nav" aria-label="Assessment sections">{groups.map((group, i) => <Button key={group} variant="ghost" size="sm" className={i === step ? "active" : ""} aria-current={i === step ? "step" : undefined} onClick={() => setStep(i)}>{i + 1}. {group}</Button>)}</nav>
      <form onSubmit={e => { e.preventDefault(); if (step < groups.length - 1 && currentValid) setStep(v => v + 1); else void submit(); }}>
        <div className="form-heading"><h2>{groups[step]}</h2><span>{current.length} {current.length === 1 ? "input" : "inputs"}</span></div>
        <div className="fields-grid">{current.map(f => {
          const message = error?.fields[f.name] || (touched.has(f.name) ? errors[f.name] : undefined);
          return <div className="field" key={f.name}><label htmlFor={`feature-${f.name}`}>{f.label || f.name}{f.unit ? ` (${f.unit})` : ""} {f.required !== false && <span className="text-primary">*</span>}</label>
            {f.type === "categorical" ? <select id={`feature-${f.name}`} value={formValues[f.name] ?? ""} aria-invalid={!!message} aria-describedby={message ? `error-${f.name}` : undefined} onBlur={() => setTouched(v => new Set(v).add(f.name))} onChange={e => { const option = f.allowed_values?.find(v => String(v) === e.target.value); if (option !== undefined) update(f.name, option); }}><option value="">Select a value</option>{f.allowed_values?.map(v => <option value={v} key={v}>{v}</option>)}</select> : <input id={`feature-${f.name}`} type="number" step={f.type === "integer" ? 1 : "any"} min={f.min} max={f.max} placeholder="Enter value" value={formValues[f.name] ?? ""} aria-invalid={!!message} aria-describedby={message ? `error-${f.name}` : undefined} onBlur={() => setTouched(v => new Set(v).add(f.name))} onChange={e => update(f.name, e.target.value === "" ? "" : Number(e.target.value))} />}
            {message && <p className="field-error" id={`error-${f.name}`}>{message}</p>}{f.confirmation && <span className="small-copy">Definition awaiting confirmation</span>}
          </div>;
        })}</div>
        <div className="form-actions"><div className="action-row"><Button type="button" variant="ghost" size="sm" title="Load real dataset sample" onClick={() => { const sample = samplePatients[0]; if (sample) setFormValues({ ...sample }); else setSampleNotice(true); }}><Database />Load sample patient</Button><Button type="button" variant="ghost" size="icon" aria-label="Reset patient details" title="Reset" onClick={() => { state.reset(); setStep(0); setTouched(new Set()); }}><RotateCcw /></Button></div><div className="action-row">{step > 0 && <Button type="button" variant="outline" onClick={() => setStep(v => v - 1)}><ArrowLeft />Back</Button>}{step < groups.length - 1 ? <Button type="submit" disabled={!currentValid}>Continue <ArrowRight /></Button> : <Button type="submit" className="analyze-action" disabled={!valid || status === "loading"}>{status === "loading" ? <><LoaderCircle className="spin" />Analyzing…</> : <>Analyze <Sparkles /></>}</Button>}</div></div>
        <p className="form-bottom" aria-live="polite">{valid ? "All inputs complete." : `${Object.keys(errors).length} required inputs remaining.`}</p>
        {sampleNotice && <p className="message" role="status">No real sample patients have been supplied yet. Enter details manually; we won’t invent patient records.</p>}
      </form>
    </section><aside className="panel assess-aside"><h2 className="panel-title"><HeartPulse />What happens next</h2><p className="small-copy">A closer look, one step at a time.</p><div className="aside-steps"><div className="aside-step"><ScanLine /><div><h3>Map the estimate</h3><p className="small-copy">See the predicted probabilities on a schematic 3D heart.</p></div></div><div className="aside-step"><Sparkles /><div><h3>Understand the result</h3><p className="small-copy">Explore the model’s feature contributions for each artery.</p></div></div><div className="aside-step"><LockKeyhole /><div><h3>Private by design</h3><p className="small-copy">Details stay in memory. Refreshing clears them.</p></div></div></div><div className="mt-8 pt-5 border-t border-border"><p className="small-copy">{disclaimer.plain}</p></div></aside></div>}
  </div>;
}