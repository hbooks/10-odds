import { Link } from "react-router-dom";
import { Zap } from "lucide-react";

const Footer = () => {
  return (
    <footer className="border-t border-border bg-card mt-auto">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-gold">
                <Zap className="h-4 w-4 text-accent-foreground" />
              </div>
              <span className="text-lg font-heading font-bold">
                10 <span className="text-gold">Odds</span>
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              AI-powered football predictions by MK-806. Smart picks, better odds.
            </p>
          </div>
          <div>
            <h4 className="font-heading font-semibold mb-3">Quick Links</h4>
            <div className="flex flex-col gap-2 text-sm text-muted-foreground">
              <Link to="/games" className="hover:text-foreground transition-colors">Games</Link>
              <Link to="/ten-odds" className="hover:text-foreground transition-colors">10 Odds Slip</Link>
              <Link to="/analytics" className="hover:text-foreground transition-colors">Analytics</Link>
            </div>
          </div>
          <div>
            <h4 className="font-heading font-semibold mb-3">Legal</h4>
            <div className="flex flex-col gap-2 text-sm text-muted-foreground">
              <Link to="/about" className="hover:text-foreground transition-colors">About Us</Link>
              <Link to="/about" className="hover:text-foreground transition-colors">Terms of Service</Link>
              <Link to="/about" className="hover:text-foreground transition-colors">Privacy Policy</Link>
              <Link to="/about" className="hover:text-foreground transition-colors">Support</Link>
            </div>
          </div>
        </div>
        <div className="mt-8 pt-4 border-t border-border text-center text-xs text-muted-foreground">
          © 2026 10 Odds. All rights reserved. Gambling involves risk. Please bet responsibly.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
