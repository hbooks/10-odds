import { useEffect, useRef } from "react";
import { Heart, Coffee, Shield, Sparkles } from "lucide-react";

declare global {
  interface Window {
    PayPal?: {
      Donation: {
        Button: (config: object) => { render: (selector: string) => void };
      };
    };
  }
}

interface PayPalBtnConfig {
  containerId: string;
  hostedButtonId: string;
  imgSrc: string;
  imgAlt: string;
}

function PayPalButton({ containerId, hostedButtonId, imgSrc, imgAlt }: PayPalBtnConfig) {
  const mountedRef = useRef(false);

  useEffect(() => {
    if (mountedRef.current) return;

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

    if (window.PayPal?.Donation?.Button) {
      mount();
      return;
    }

    const SCRIPT_SRC = "https://www.paypalobjects.com/donate/sdk/donate-sdk.js";
    if (!document.querySelector(`script[src="${SCRIPT_SRC}"]`)) {
      const script = document.createElement("script");
      script.src     = SCRIPT_SRC;
      script.charset = "UTF-8";
      script.async   = true;
      script.onload  = mount;
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

const DonationBanner = () => {
  return (
    <div className="mt-8 rounded-xl border border-border bg-card/80 backdrop-blur-sm overflow-hidden">
      {/* Compact header */}
      <div className="bg-gradient-to-r from-gold/10 to-transparent px-5 py-3 border-b border-border/40">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gold/15">
            <Heart className="h-4 w-4 text-gold" fill="currentColor" />
          </div>
          <div>
            <h4 className="font-heading text-base font-semibold text-foreground">
              Support 10dds
            </h4>
            <p className="text-xs text-muted-foreground">
              Fuel the engine · by HBOOKS
            </p>
          </div>
        </div>
      </div>

      {/* Compact body */}
      <div className="px-5 py-4">
        <div className="flex items-start gap-3 mb-4">
          <Coffee className="h-4 w-4 text-gold shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            10dds is free and independent. If MK‑806 has been useful, consider supporting the project. 
            Every bit helps cover data costs and keeps the engine running.
          </p>
        </div>

        {/* Buttons row — compact */}
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-3">
          <div className="flex flex-col items-center">
            <PayPalButton
              containerId="paypal-donate-btn-1"
              hostedButtonId="YLND6XC9LJEK2"
              imgSrc="https://www.paypalobjects.com/en_US/i/btn/btn_donate_SM.gif"
              imgAlt="Donate with PayPal"
            />
            <span className="text-[10px] text-muted-foreground/60 mt-0.5 flex items-center gap-0.5">
              <Shield className="h-2.5 w-2.5" />
              PayPal
            </span>
          </div>

          <span className="text-muted-foreground/30 text-xs hidden sm:inline">·</span>

          <div className="flex flex-col items-center">
            <PayPalButton
              containerId="paypal-donate-btn-2"
              hostedButtonId="6XEHPLS4HEEUG"
              imgSrc="https://www.paypalobjects.com/en_US/i/btn/btn_donateCC_SM.gif"
              imgAlt="Donate with card"
            />
            <span className="text-[10px] text-muted-foreground/60 mt-0.5 flex items-center gap-0.5">
              <Shield className="h-2.5 w-2.5" />
              Card
            </span>
          </div>
        </div>

        {/* Optional sparkle note */}
        <p className="mt-3 text-center text-[10px] text-muted-foreground/50 flex items-center justify-center gap-1">
          <Sparkles className="h-3 w-3" />
          Secure · Optional · Appreciated
        </p>
      </div>
    </div>
  );
};

export default DonationBanner;