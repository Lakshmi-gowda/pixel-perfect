import { useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { HeartPulse, ArrowUpRight, Menu, X, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { brand } from "@/config/brand";
import { disclaimer } from "@/config/disclaimer";
import { USE_MOCK } from "@/api/client";

export function SiteLayout({ children }: { children: ReactNode }) {
  const [menu, setMenu] = useState(false);
  return <>
    <header className="site-header">
      <div className="navbar">
        <Link to="/" className="brand" aria-label={`${brand.name} home`}><span className="brand-mark"><HeartPulse size={23} strokeWidth={1.7} /></span>{brand.name}</Link>
        {USE_MOCK && <span className="mock-badge" title="Development preview. All outputs are mock data.">MOCK DATA</span>}
        <nav className="nav-links" aria-label="Main navigation"><Link to="/" className="nav-link" activeOptions={{ exact: true }}>Home</Link><Link to="/learn" className="nav-link">Learn</Link><Link to="/assess" className="nav-link">Assess</Link><Link to="/chatbot" className="nav-link">Heart Health AI</Link></nav>
        <Button asChild className="nav-cta"><Link to="/assess">Start assessment <ArrowUpRight /></Link></Button>
        <Button variant="ghost" size="icon" className="mobile-menu-toggle" aria-label={menu ? "Close menu" : "Open menu"} aria-expanded={menu} onClick={() => setMenu(v => !v)}>{menu ? <X /> : <Menu />}</Button>
      </div>
      {menu && <nav className="mobile-nav" aria-label="Mobile navigation">{([['/', 'Home'], ['/learn', 'Learn'], ['/assess', 'Assess'], ['/chatbot', 'Heart Health AI']] as const).map(([to, label]) => <Link key={to} to={to} onClick={() => setMenu(false)}>{label}</Link>)}<Button asChild><Link to="/assess" onClick={() => setMenu(false)}>Start assessment <ArrowUpRight /></Link></Button></nav>}
      <div className="disclaimer-bar"><Info size={15} /><span>{disclaimer.long}</span></div>
    </header>
    <main>{children}</main>
    <footer className="site-footer"><div className="footer-inner"><div><div className="footer-brand">{brand.name}<span className="text-primary">.</span></div><p className="footer-copy">{disclaimer.long}</p></div><div className="footer-credit"><a href={brand.modelSource} target="_blank" rel="noreferrer">3D model: {brand.modelCredit} ↗</a><p>{brand.version}</p></div></div></footer>
  </>;
}