import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { ArrowUpRight, BookOpen, ChevronDown, HeartPulse } from "lucide-react";
import { Button } from "@/components/ui/button";
import { learnTopics } from "@/content/learn";
import { pageHead } from "@/config/brand";
export const Route = createFileRoute("/learn")({ head: () => pageHead("Learn", "Simple explanations of the heart, coronary arteries, CAD and what model-predicted colours mean."), component: Learn });
function Learn() {
  useEffect(() => {
    const id = window.location.hash.slice(1);
    const target = id ? document.getElementById(id) : null;
    if (target instanceof HTMLDetailsElement) { target.open = true; target.scrollIntoView(); }
  }, []);
  return <div className="page"><p className="eyebrow"><BookOpen size={13} />A little heart knowledge</p><h1 className="page-title">Know your heart.</h1><p className="page-intro">Small explanations. A clearer understanding.</p><div className="learn-layout"><aside className="learn-aside"><div className="aside-icon"><HeartPulse size={34} strokeWidth={1.3} /></div><h2>Behind every beat,<br />a remarkable system.</h2><p>Start with the heart, meet its arteries, and understand what a model estimate can — and cannot — tell you.</p></aside><div className="topic-list">{learnTopics.map((topic, i) => <details className="topic" key={topic.id} id={topic.id} open={i === 0 || undefined}><summary><span className="topic-number">0{i + 1}</span>{topic.title}<ChevronDown /></summary><p>{topic.text}</p></details>)}<div className="action-row mt-5"><Button asChild size="lg"><Link to="/assess">Next: start assessment <ArrowUpRight /></Link></Button></div></div></div></div>;
}