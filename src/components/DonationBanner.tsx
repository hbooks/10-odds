import { useEffect, useRef } from "react";
import { Heart } from "lucide-react";

// Extend Window so TypeScript doesn't complain about PayPal SDK
declare global {
  interface Window {
    PayPal?: {
      Donation: {
        Button: (config: object) => { render: (selector: string) => void };
      };
    };
  }
}

// ─── PayPal button mount helper ───────────────────────────────────────────────
interface PayPalBtnConfig {
  containerId: string;
  hostedButtonId: string;
  imgSrc: string;
  imgAlt: string;
}

function PayPalButton({ containerId, hostedButtonId, imgSrc, imgAlt }: PayPalBtnConfig) {
  const mountedRef = useRef(false);

  useEffect(() => {
    if (mountedRef.current) return;   // only mount once per component instance

    const mount = () => {
      if (window.PayPal?.Donation?.Button) {
        window.PayPal.Donation.Button({
          env: "production",
          hosted_button_id: hostedButtonId,
          image: { src: imgSrc, alt: imgAlt, title: "PayPal - The safer, easier way to pay online!" },
        }).render(`#${containerId}`);
        mountedRef.current = true;
      }
    };

    // If SDK already loaded, mount immediately; otherwise wait for it
    if (window.PayPal?.Donation?.Button) {
      mount();
      return;
    }

    // Load the SDK script once (check if it's already in DOM)
    const SCRIPT_SRC = "https://www.paypalobjects.com/donate/sdk/donate-sdk.js";
    if (!document.querySelector(`script[src="${SCRIPT_SRC}"]`)) {
      const script = document.createElement("script");
      script.src     = SCRIPT_SRC;
      script.charset = "UTF-8";
      script.async   = true;
      script.onload  = mount;
      document.body.appendChild(script);
    } else {
      // Script tag exists but may still be loading — poll briefly
      const interval = setInterval(() => {
        if (window.PayPal?.Donation?.Button) {
          clearInterval(interval);
          mount();
        }
      }, 100);
      return () => clearInterval(interval);
    }
  }, [containerId, hostedButtonId, imgSrc, imgAlt]);

  return (
    <div
      id={containerId}
      className="flex items-center justify-center min-h-[40px]"
    />
  );
}

// ─── Banner ───────────────────────────────────────────────────────────────────
const DonationBanner = () => {
  return (
    <div className="mt-10 rounded-2xl border border-border bg-card overflow-hidden">
      {/* Warm header strip */}
      <div className="gradient-navy px-6 py-4 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10">
          <Heart className="h-4 w-4 text-rose-400" fill="currentColor" />
        </div>
        <div>
          <p className="font-heading font-semibold text-primary-foreground text-sm">
            Support 10dds
          </p>
          <p className="text-xs text-primary-foreground/60">
            Keep the engine running
          </p>
        </div>
      </div>

      {/* Body */}
      <div className="px-6 py-5">
        <p className="text-sm text-muted-foreground leading-relaxed mb-5">
          10dds is free and always will be. If the predictions have been useful to you,
          consider buying us a coffee — it helps cover data costs and keeps MK-806 running
          24/7. Every contribution is entirely optional and deeply appreciated.
        </p>

        {/* Buttons row */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          {/* Button 1 — PayPal standard donate */}
          <div className="flex flex-col items-center gap-1.5">
            <PayPalButton
              containerId="paypal-donate-btn-1"
              hostedButtonId="YLND6XC9LJEK2"
              imgSrc="https://www.paypalobjects.com/en_US/i/btn/btn_donate_LG.gif"
              imgAlt="Donate with PayPal"
            />
            <span className="text-[10px] text-muted-foreground/50">PayPal · any amount</span>
          </div>

          {/* Divider on desktop */}
          <div className="hidden sm:block h-10 w-px bg-border" />
          <div className="sm:hidden w-full h-px bg-border" />

          {/* Button 2 — PayPal credit card donate */}
          <div className="flex flex-col items-center gap-1.5">
            <PayPalButton
              containerId="paypal-donate-btn-2"
              hostedButtonId="6XEHPLS4HEEUG"
              imgSrc="https://www.paypalobjects.com/en_US/FR/i/btn/btn_donateCC_LG.gif"
              imgAlt="Donate with card"
            />
            <span className="text-[10px] text-muted-foreground/50">Debit / Credit card</span>
          </div>
        </div>

        <p className="mt-4 text-center text-[11px] text-muted-foreground/40">
          Secure payments handled by PayPal. 10dds never sees your payment details.
        </p>
      </div>
    </div>
  );
};

export default DonationBanner;