import { Heart, Sparkles } from "lucide-react";

// ── Ko‑fi pop‑up opener (centered, no modal) ─────────────────────────────────
function openKofiPopup() {
  const width = 500;
  const height = 650;
  const left = (window.screen.width - width) / 2;
  const top = (window.screen.height - height) / 2;
  const features = `width=${width},height=${height},top=${top},left=${left},resizable=yes,scrollbars=yes,status=no`;
  window.open("https://ko-fi.com/M4M11YATHD", "kofi-popup", features);
}

// ──────────────────────────────────────────────────────────────────────────────
// The donation / support banner
// ──────────────────────────────────────────────────────────────────────────────
const DonationBanner = () => {
  return (
    <div className="mt-10 rounded-2xl border border-gold/30 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 shadow-xl overflow-hidden">
      {/* Header with logo */}
      <div className="px-6 py-6 flex flex-col sm:flex-row items-center gap-4 border-b border-gold/20">
        <div className="flex shrink-0 items-center justify-center">
          <img
            src="/assets/logo.png"
            alt="10 Odds Logo"
            className="h-16 w-16 object-contain drop-shadow-md"
          />
        </div>
        <div className="text-center sm:text-left">
          <h3 className="text-2xl font-bold font-heading text-white">
            10 <span className="text-gold">Odds</span>
          </h3>
          <p className="text-sm text-slate-300 mt-1 max-w-md">
            Every prediction is offered freely. Your support, if you choose, keeps the engine running and the data flowing.
          </p>
        </div>
      </div>

      {/* Body */}
      <div className="px-6 py-5 space-y-5">
        {/* Warm message */}
        <div className="flex items-start gap-3 text-slate-300 text-sm leading-relaxed">
          <Heart className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" fill="currentColor" />
          <p>
            We're genuinely grateful you're here. If 10 Odds has given you value, any contribution — no matter how small —
            helps cover the live data, servers, and the countless hours of development. It's always optional, never expected.
          </p>
        </div>

        {/* Support buttons — PayPal links + direct Ko‑fi popup */}
        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-4 py-2">
          {/* PayPal USD */}
          <a
            href="https://www.paypal.com/donate?hosted_button_id=YLND6XC9LJEK2"
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center gap-1.5 transition-opacity hover:opacity-90"
            title="Donate with PayPal (USD)"
          >
            <img
              src="https://www.paypalobjects.com/en_US/i/btn/btn_donate_LG.gif"
              alt="Donate with PayPal"
              className="h-12"
            />
            <span className="text-xs text-slate-400">USD · PayPal</span>
          </a>

          <span className="hidden sm:inline-block text-slate-600 font-light">|</span>

          {/* PayPal EUR / card */}
          <a
            href="https://www.paypal.com/donate?hosted_button_id=6XEHPLS4HEEUG"
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center gap-1.5 transition-opacity hover:opacity-90"
            title="Donate with card (EUR)"
          >
            <img
              src="https://www.paypalobjects.com/en_US/FR/i/btn/btn_donateCC_LG.gif"
              alt="Donate with card"
              className="h-12"
            />
            <span className="text-xs text-slate-400">EUR · Credit / Debit</span>
          </a>

          <span className="hidden sm:inline-block text-slate-600 font-light">|</span>

          {/* Ko‑fi – opens directly in a centered popup (no modal) */}
          <button
            onClick={openKofiPopup}
            className="flex flex-col items-center gap-1.5 transition-opacity hover:opacity-90"
            title="Support on Ko‑fi"
          >
            <img
              src="https://storage.ko-fi.com/cdn/brandasset/logo_white_blue.png"
              alt="Support me on Ko-fi"
              className="h-12"
            />
            <span className="text-xs text-slate-400">Ko‑fi</span>
          </button>
        </div>

        {/* Footer note */}
        <p className="text-xs text-slate-500 text-center flex items-center justify-center gap-1">
          <Sparkles className="h-3 w-3" />
          Secure · Optional · Appreciated — by HBOOKS
        </p>
      </div>
    </div>
  );
};

export default DonationBanner;