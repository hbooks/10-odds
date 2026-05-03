import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="border-t border-border bg-card mt-auto">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
          <div className="flex items-center gap-2 mb-3">
  <img 
    src="/assets/00.png" 
    alt="10 Odds Logo" 
    className="h-10 w-10 object-contain"
  />
  <span className="text-xl font-heading font-bold" style={{ color: "#4A5BA8" }}>
  10 <span className="text-gold">Odds</span>
</span>
</div>
            <p className="text-sm text-muted-foreground">
              Football predictions by MK-806. Smart picks, better odds.
            </p>
          </div>
          <div>
            <h4 className="font-heading font-semibold mb-3">Quick Links</h4>
            <div className="flex flex-col gap-2 text-sm text-muted-foreground">
              <Link to="/games" className="hover:text-foreground transition-colors">Games</Link>
              <Link to="/analytics" className="hover:text-foreground transition-colors">Analytics</Link>
              <Link to="/patterns" className="hover:text-foreground transition-colors">Live Patterns</Link>
              <Link to="/community" className="hover:text-foreground transition-colors">Join our Community Board</Link>
            </div>
          </div>
          <div>
            <h4 className="font-heading font-semibold mb-3">Legal</h4>
            <div className="flex flex-col gap-2 text-sm text-muted-foreground">
              <Link to="/about" className="hover:text-foreground transition-colors">About Us</Link>
              <Link to="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link>
              <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
              {/* <Link to="/support" className="hover:text-foreground transition-colors">Support</Link> */} {/* Placeholder for future support page */}
            </div>
          </div>
        </div>
       {/* ── Bottom bar ─────────────────────────────────────────────────── */}
<div className="mt-10 pt-6 border-t border-border flex flex-col items-center gap-1.5 text-xs text-muted-foreground">
  <p>
    © 2026 <span className="text-foreground font-semibold">10 <span className="text-gold">Odds</span></span>. All rights reserved.
  </p>
  <p className="text-[11px] text-muted-foreground/60">
    Gambling involves financial risk. Please bet responsibly.
  </p>
</div>
      </div>
    </footer>
  );
};

export default Footer;
