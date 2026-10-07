import { Component, lazy, Suspense, useEffect, useState, type ReactNode } from "react";
import { Heart, RotateCcw, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SceneProps } from "./HeartScene";

const Scene = lazy(() => import("./HeartScene"));
class SceneBoundary extends Component<{ children: ReactNode; onFailure: () => void }, { failed: boolean }> {
  override state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  override componentDidCatch() { this.props.onFailure(); }
  override render() { return this.state.failed ? null : this.props.children; }
}
export function HeartViewer(props: SceneProps) {
  const [hydrated, setHydrated] = useState(false);
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const [zoom, setZoom] = useState(0);
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(motion.matches);
    const handle = () => setReduced(motion.matches);
    motion.addEventListener("change", handle);
    setHydrated(true);
    return () => { motion.removeEventListener("change", handle); document.body.style.cursor = "auto"; };
  }, []);
  return <>
    {(!ready || failed) && <div className="static-heart" aria-hidden="true"><Heart /></div>}
    {hydrated && !failed && <SceneBoundary onFailure={() => setFailed(true)}><Suspense fallback={null}><Scene {...props} resetKey={resetKey} zoom={zoom} reducedMotion={reduced} onReady={() => setReady(true)} onFailure={() => setFailed(true)} /></Suspense></SceneBoundary>}
    {failed && !props.home && <div className="stage-callout"><p role="status">The 3D heart is unavailable. Your results and artery selection still work.</p></div>}
    {!props.home && !failed && <div className="stage-controls">
      <Button variant="outline" size="icon" title="Zoom in" aria-label="Zoom in" onClick={() => setZoom(v => Math.min(4, v + 1))}><ZoomIn /></Button>
      <Button variant="outline" size="icon" title="Zoom out" aria-label="Zoom out" onClick={() => setZoom(v => Math.max(-3, v - 1))}><ZoomOut /></Button>
      <Button variant="outline" size="icon" title="Reset view" aria-label="Reset view" onClick={() => { setZoom(0); setResetKey(v => v + 1); }}><RotateCcw /></Button>
    </div>}
  </>;
}