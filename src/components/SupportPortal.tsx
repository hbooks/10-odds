import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, X, Sparkles, Coffee, CreditCard, DollarSign } from "lucide-react";

// ── Generic popup helper (opens a centered small window over our site) ─────────
function openPopup(url: string, width = 500, height = 650) {
  const left = (window.screen.width - width) / 2;
  const top = (window.screen.height - height) / 2;
  const features = `width=${width},height=${height},top=${top},left=${left},resizable=yes,scrollbars=yes,status=no`;
  window.open(url, "donation-popup", features);
}

// ──────────────────────────────────────────────────────────────────────────────
const SupportPortal = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
<div className="fixed bottom-8 right-8 z-40">
  <button
    onClick={() => setIsOpen(true)}
    className="group flex items-center gap-2 px-5 py-3 rounded-full bg-gradient-to-r from-rose-500 to-pink-600 text-white shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 font-medium text-sm overflow-hidden"
  >
    <Heart className="h-4 w-4 group-hover:animate-pulse shrink-0" />
    <span className="max-w-0 group-hover:max-w-xs overflow-hidden whitespace-nowrap transition-all duration-200 ease-in-out">
      Support Project
    </span>
  </button>
</div>

      {/* Portal overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 30 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="relative w-full max-w-md bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-gold/30 rounded-3xl shadow-2xl p-6 text-white"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              <button
                onClick={() => setIsOpen(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>

              {/* Logo + Heading */}
              <div className="flex flex-col items-center text-center mb-6">
                <img
                  src="/assets/logo.png"
                  alt="10 Odds Logo"
                  className="h-14 w-14 object-contain mb-3 drop-shadow-lg"
                />
                <h2 className="text-2xl font-heading font-bold">
                  10 <span className="text-gold">Odds</span>
                </h2>
                <p className="text-sm text-slate-300 mt-2 max-w-xs">
                  Every prediction is free. If you’d like to support the engine, you’re a legend.
                </p>
                <div className="mt-2 flex items-center justify-center gap-1 text-xs text-rose-300">
                  <Heart className="h-3 w-3 fill-rose-400" />
                  <span>Optional · Secure · Appreciated</span>
                </div>
              </div>

              {/* Donation cards – all open a centered popup */}
              <div className="space-y-3">
                {/* PayPal USD */}
                <button
                  onClick={() => openPopup("https://www.paypal.com/donate?hosted_button_id=YLND6XC9LJEK2")}
                  className="flex items-center gap-3 p-4 rounded-xl bg-slate-800/80 border border-slate-700 hover:border-gold/40 transition-all group w-full text-left"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600/20">
                    <DollarSign className="h-5 w-5 text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-sm">Donate with PayPal</p>
                    <p className="text-xs text-slate-400">USD · One‑time or recurring</p>
                  </div>
                  <img
                    src="https://www.paypalobjects.com/en_US/i/btn/btn_donate_LG.gif"
                    alt="PayPal"
                    className="h-8 opacity-80 group-hover:opacity-100"
                  />
                </button>

                {/* PayPal EUR / Card */}
                <button
                  onClick={() => openPopup("https://www.paypal.com/donate?hosted_button_id=6XEHPLS4HEEUG")}
                  className="flex items-center gap-3 p-4 rounded-xl bg-slate-800/80 border border-slate-700 hover:border-gold/40 transition-all group w-full text-left"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600/20">
                    <CreditCard className="h-5 w-5 text-indigo-400" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-sm">Donate with Card</p>
                    <p className="text-xs text-slate-400">EUR · Credit / Debit</p>
                  </div>
                  <img
                    src="https://www.paypalobjects.com/en_US/FR/i/btn/btn_donateCC_LG.gif"
                    alt="PayPal Card"
                    className="h-8 opacity-80 group-hover:opacity-100"
                  />
                </button>

                {/* Ko‑fi – custom button, opens popup */}
                <button
                  onClick={() => openPopup("https://ko-fi.com/M4M11YATHD")}
                  className="flex items-center gap-3 p-4 rounded-xl bg-slate-800/80 border border-slate-700 hover:border-gold/40 transition-all group w-full text-left"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-600/20">
                    <Coffee className="h-5 w-5 text-emerald-400" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-sm">Buy me a Ko‑fi</p>
                    <p className="text-xs text-slate-400">One‑time support</p>
                  </div>
                  {/* Custom Ko‑fi visual */}
                  <span className="flex items-center gap-1 bg-emerald-500 text-white text-xs font-semibold px-3 py-1.5 rounded-full">
                    <Coffee className="h-3.5 w-3.5" />
                    Ko‑fi
                  </span>
                </button>
              </div>

              {/* Footer note */}
              <p className="mt-5 text-xs text-slate-500 text-center flex items-center justify-center gap-1">
                <Sparkles className="h-3 w-3" />
                by HBOOKS · Thank you for being here
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default SupportPortal;