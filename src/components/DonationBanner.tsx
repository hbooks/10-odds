import { useEffect, useRef } from "react";
import { Heart, Sparkles } from "lucide-react";

// ── Extend global Window for dynamically loaded widget libraries ──────────────
declare global {
  interface Window {
    PayPal?: {
      Donation: {
        Button: (config: object) => { render: (selector: string) => void };
      };
    };
    kofiwidget2?: {
      init: (text: string, color: string, code: string) => void;
      draw: () => void;
    };
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Reusable helper to mount a PayPal donation button
// ──────────────────────────────────────────────────────────────────────────────
interface PayPalBtnConfig {
  containerId: string;
  hostedButtonId: string;
  imgSrc: string;
  imgAlt: string;
}

function PayPalButton({ containerId, hostedButtonId, imgSrc, imgAlt }: PayPalBtnConfig) {
  const mountedRef = useRef(false);

  useEffect(() => {
    if (mountedRef.current) return; // only mount once

    const mount = () => {
      if (window.PayPal?.Donation?.Button) {
        window.PayPal.Donation.Button({
          env: "production",
          hosted_button_id: hostedButtonId,
          image: {
            src: imgSrc,
            alt: imgAlt,
            title: "PayPal - The safer, easier way to pay online!",
          },
        }).render(`#${containerId}`);
        mountedRef.current = true;
      }
    };

    if (window.PayPal?.Donation?.Button) {
      mount();
      return;
    }

    const scriptSrc = "https://www.paypalobjects.com/donate/sdk/donate-sdk.js";
    if (!document.querySelector(`script[src="${scriptSrc}"]`)) {
      const script = document.createElement("script");
      script.src = scriptSrc;
      script.charset = "UTF-8";
      script.async = true;
      script.onload = mount;
      document.body.appendChild(script);
    } else {
      const interval = setInterval(() => {
        if (window.PayPal?.Donation?.Button) {
          clearInterval(interval);
          mount();
        }
      }, 100);
      return () => clearInterval(interval);
    }
  }, [containerId, hostedButtonId, imgSrc, imgAlt]);

  return <div id={containerId} className="flex items-center justify-center" />;
}

// ──────────────────────────────────────────────────────────────────────────────
// Reusable helper to mount the Ko‑fi widget
// ──────────────────────────────────────────────────────────────────────────────
function KofiButton() {
  const mountedRef = useRef(false);

  useEffect(() => {
    if (mountedRef.current) return;

    const mount = () => {
      if (window.kofiwidget2) {
        window.kofiwidget2.init("Support 10 Odds on Ko-fi", "#27e66a", "M4M11YATHD");
        window.kofiwidget2.draw();
        mountedRef.current = true;
      }
    };

    if (window.kofiwidget2) {
      mount();
      return;
    }

    const scriptSrc = "https://storage.ko-fi.com/cdn/widget/Widget_2.js";
    if (!document.querySelector(`script[src="${scriptSrc}"]`)) {
      const script = document.createElement("script");
      script.src = scriptSrc;
      script.type = "text/javascript";
      script.async = true;
      script.onload = mount;
      document.body.appendChild(script);
    } else {
      const interval = setInterval(() => {
        if (window.kofiwidget2) {
          clearInterval(interval);
          mount();
        }
      }, 100);
      return () => clearInterval(interval);
    }
  }, []);

  return <div id="kofi-container" className="min-h-[45px] flex items-center justify-center" />;
}

// ──────────────────────────────────────────────────────────────────────────────
// The actual support banner
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
            We're genuinely grateful you're here. If 10 Odds has given you value, any contribution—no matter how small—helps cover the live data, servers, and the countless hours of development. It's always optional, never expected.
          </p>
        </div>

        {/* Buttons section */}
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-4 py-2">
          {/* PayPal — USD */}
          <div className="flex flex-col items-center gap-1.5">
            <PayPalButton
              containerId="paypal-usd-btn"
              hostedButtonId="YLND6XC9LJEK2"
              imgSrc="https://www.paypalobjects.com/en_US/i/btn/btn_donate_LG.gif"
              imgAlt="Donate with PayPal (USD)"
            />
            <span className="text-xs text-slate-400">USD · PayPal</span>
          </div>

          {/* Divider */}
          <span className="hidden sm:inline-block text-slate-600 font-light">|</span>

          {/* PayPal — EUR / Cards */}
          <div className="flex flex-col items-center gap-1.5">
            <PayPalButton
              containerId="paypal-eur-btn"
              hostedButtonId="6XEHPLS4HEEUG"
              imgSrc="https://www.paypalobjects.com/en_US/FR/i/btn/btn_donateCC_LG.gif"
              imgAlt="Donate with card (EUR)"
            />
            <span className="text-xs text-slate-400">EUR · Credit / Debit</span>
          </div>

          {/* Divider */}
          <span className="hidden sm:inline-block text-slate-600 font-light">|</span>

          {/* Ko‑fi */}
          <div className="flex flex-col items-center gap-1.5">
            <KofiButton />
            <span className="text-xs text-slate-400">Ko‑fi</span>
          </div>
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