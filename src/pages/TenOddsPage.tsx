import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, ChevronDown, ChevronUp } from "lucide-react";
import Layout from "@/components/Layout";
import { tenOddsSlip } from "@/data/mockData";

const TenOddsPage = () => {
  const totalOdds = tenOddsSlip.reduce((acc, p) => acc * p.odds, 1);
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg gradient-gold animate-pulse-gold">
            <Zap className="h-5 w-5 text-accent-foreground" />
          </div>
          <h1 className="text-3xl font-heading font-bold">
            10-Odds <span className="text-gold">Slip</span>
          </h1>
        </div>
        <p className="text-muted-foreground mb-6">
          Today's AI-curated accumulator by <strong className="text-foreground">MK-806</strong>.
        </p>

        {/* Total odds banner */}
        <div className="rounded-xl gradient-navy p-4 mb-6 flex items-center justify-between">
          <span className="text-primary-foreground font-heading font-semibold">Total Combined Odds</span>
          <span className="text-2xl font-heading font-bold text-gold">{totalOdds.toFixed(2)}</span>
        </div>

        {/* Picks */}
        <div className="flex flex-col gap-3">
          {tenOddsSlip.map((pick, i) => (
            <motion.div
              key={pick.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08 }}
              className="rounded-xl border border-border bg-card overflow-hidden"
            >
              <button
                onClick={() => setExpanded(expanded === pick.id ? null : pick.id)}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/40 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-heading font-semibold text-sm truncate">{pick.fixture}</p>
                  <p className="text-sm text-gold font-medium mt-0.5">Bet: {pick.bet}</p>
                </div>
                <div className="flex items-center gap-3 ml-3">
                  <span className="text-sm font-semibold bg-accent/15 text-gold px-2.5 py-0.5 rounded-full">
                    {pick.odds.toFixed(2)}
                  </span>
                  {expanded === pick.id ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </button>
              <AnimatePresence>
                {expanded === pick.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 border-t border-border pt-3">
                      <p className="text-sm text-muted-foreground leading-relaxed">{pick.reasoning}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>
    </Layout>
  );
};

export default TenOddsPage;
