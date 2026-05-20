import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="border-t border-border bg-card mt-auto">
      <div className="container mx-auto px-4 py-8">
        {/* ── Top grid ────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <img
                src="/assets/00.png"
                alt="10 Odds Logo"
                className="h-10 w-10 object-contain"
              />
              <span
                className="text-xl font-heading font-bold"
                style={{ color: "#4A5BA8" }}
              >
                10 <span className="text-gold">Odds</span>
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              Football predictions by MK-806. Smart picks, better odds.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-heading font-semibold mb-3">Quick Links</h4>
            <div className="flex flex-col gap-2 text-sm text-muted-foreground">
              <Link to="/games" className="hover:text-foreground transition-colors">Games</Link>
              <Link to="/analytics" className="hover:text-foreground transition-colors">Analytics</Link>
              <Link to="/patterns" className="hover:text-foreground transition-colors">Live Patterns</Link>
              <Link to="/community" className="hover:text-foreground transition-colors">Join our Community Board</Link>
            </div>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-heading font-semibold mb-3">Legal</h4>
            <div className="flex flex-col gap-2 text-sm text-muted-foreground">
              <Link to="/about" className="hover:text-foreground transition-colors">About Us</Link>
              <Link to="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link>
              <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
            </div>
          </div>

          {/* ── Social ──────────────────────────────────────── */}
          <div>
            <h4 className="font-heading font-semibold mb-3">Follow Us</h4>
            <div className="flex items-center gap-3">
              {/* TikTok */}
              <a
                href="https://www.tiktok.com/@10.0dds"
                target="_blank"
                rel="noopener noreferrer"
                className="h-9 w-9 rounded-xl flex items-center justify-center bg-white/5 hover:bg-white/10 text-black/50 hover:text-black transition-colors"
                aria-label="TikTok"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
                </svg>
              </a>

              {/* Telegram */}
              <a
                href="https://t.me/tenOddsCommunity"
                target="_blank"
                rel="noopener noreferrer"
                className="h-9 w-9 rounded-xl flex items-center justify-center bg-white/5 hover:bg-white/10 text-black/50 hover:text-black transition-colors"
                aria-label="Telegram"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 2 11 13" />
                  <path d="M22 2 15 22l-4-9-9-4 20-7Z" />
                </svg>
              </a>

              {/* Facebook */}
              <a
                href="https://www.facebook.com/10.0dds/"
                target="_blank"
                rel="noopener noreferrer"
                className="h-9 w-9 rounded-xl flex items-center justify-center bg-white/5 hover:bg-blue/10 text-blue/50 hover:text-blue transition-colors"
                aria-label="Facebook"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
                </svg>
              </a>
            </div>
          </div>
        </div>

        {/* ── Bottom bar ──────────────────────────────────────── */}
        <div className="mt-10 pt-6 border-t border-border flex flex-col items-center gap-1.5 text-xs text-muted-foreground">
          <p>
            © 2026{" "}
            <span className="text-foreground font-semibold">
              10 <span className="text-gold">Odds</span>
            </span>
            . All rights reserved.
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
