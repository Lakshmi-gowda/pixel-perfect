import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight, BookOpen, ClipboardList, HeartPulse, LockKeyhole, ScanLine, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HeartViewer } from "@/components/three/HeartViewer";
import { brand, pageHead } from "@/config/brand";
import { disclaimer } from "@/config/disclaimer";
export const Route = createFileRoute("/")({ head: () => pageHead("Home", "A closer look at the heart. Learn about coronary arteries and explore model-predicted risk for educational decision support."), component: Index });
function Index() {
  return <>
    <section className="home-hero"><div className="hero-scene"><HeartViewer home /></div><div className="hero-inner"><div className="hero-content"><p className="eyebrow"><HeartPulse size={14} />Heart insights, made human</p><h1 className="hero-title">{brand.name}<span className="text-primary">.</span></h1><p className="hero-tagline">{brand.tagline}</p><p className="hero-quote">“{brand.heroQuote}”</p><div className="hero-actions"><Button asChild size="lg"><Link to="/assess">Start assessment <ArrowUpRight /></Link></Button><Button asChild variant="outline" size="lg"><Link to="/learn"><BookOpen />Learn about the heart</Link></Button></div><p className="hero-note"><LockKeyhole size={12} />No accounts. No stored patient data.</p></div></div><span className="hero-label">THE HUMAN HEART · 3D EXPLORATION</span></section>
    <div className="home-body"><div className="section-heading"><h2>From details to a clearer picture.</h2><span>Three simple steps</span></div><div className="feature-grid">{[
      { icon: ClipboardList, title: "Enter patient details", text: "Bring together the measurements the model uses in one guided assessment." },
      { icon: Sparkles, title: "Get a prediction", text: "See the trained model’s overall Normal or CAD estimate and class probabilities." },
      { icon: ScanLine, title: "See it on a 3D heart", text: "Explore coronary anatomy. The current model does not predict individual artery risk or feature explanations." },
    ].map((item, i) => <article className="feature-card" key={item.title}><div className="feature-top"><div className="feature-icon"><item.icon size={19} strokeWidth={1.6} /></div><span>0{i + 1}</span></div><h3>{item.title}</h3><p>{item.text}</p></article>)}</div><aside className="safety-note"><ShieldCheck size={23} strokeWidth={1.5} /><div><h3>A helpful perspective. Not a diagnosis.</h3><p>{disclaimer.plain}</p></div></aside></div>
  </>;
}
