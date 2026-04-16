import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Zap, TrendingUp, Brain, BarChart3 } from "lucide-react";
import Layout from "@/components/Layout";
import heroBg from "@/assets/hero-bg.jpg";

const features = [
  { icon: Brain, title: "MK-806 AI Engine", desc: "Advanced prediction algorithm analyzing thousands of data points per match." },
  { icon: TrendingUp, title: "10-Odds Daily Slips", desc: "Curated accumulator slips targeting 10+ combined odds every day." },
  { icon: BarChart3, title: "Proven Track Record", desc: "68% win rate across 120+ predictions with full transparency." },
];

const Homepage = () => {
  return (
    <Layout>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroBg})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-navy-dark/90 via-navy/80 to-background" />
        <div className="relative container mx-auto px-4 py-24 md:py-36 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-navy/60 px-4 py-1.5 mb-6">
              <Zap className="h-4 w-4 text-gold" />
              <span className="text-sm font-medium text-gold-light">Powered by MK-806</span>
            </div>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-heading font-extrabold text-primary-foreground mb-4 leading-tight">
              Smart Football
              <br />
              <span className="text-gold">Predictions</span>
            </h1>
            <p className="text-lg md:text-xl text-primary-foreground/70 max-w-2xl mx-auto mb-8">
              AI-curated accumulator slips with 10+ odds daily. Data-driven insights from
              the MK-806 prediction engine.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                to="/ten-odds"
                className="inline-flex items-center justify-center gap-2 rounded-lg gradient-gold px-6 py-3 font-heading font-semibold text-accent-foreground shadow-gold hover:opacity-90 transition-opacity"
              >
                <Zap className="h-5 w-5" />
                Today's 10-Odds Slip
              </Link>
              <Link
                to="/games"
                className="inline-flex items-center justify-center rounded-lg border border-primary-foreground/30 px-6 py-3 font-heading font-semibold text-primary-foreground hover:bg-primary-foreground/10 transition-colors"
              >
                View All Games
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="text-2xl md:text-3xl font-heading font-bold text-center mb-10">
          Why <span className="text-gold">10 Odds</span>?
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.15 }}
              viewport={{ once: true }}
              className="rounded-xl border border-border bg-card p-6 text-center hover:shadow-lg transition-shadow"
            >
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-accent/15">
                <f.icon className="h-6 w-6 text-gold" />
              </div>
              <h3 className="font-heading font-semibold mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>
    </Layout>
  );
};

export default Homepage;
