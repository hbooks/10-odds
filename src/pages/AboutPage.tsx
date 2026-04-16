import Layout from "@/components/Layout";
import { AlertTriangle } from "lucide-react";

const AboutPage = () => {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <h1 className="text-3xl font-heading font-bold mb-6">About 10 Odds</h1>

        <div className="prose prose-sm max-w-none">
          <div className="rounded-xl border border-border bg-card p-6 mb-6">
            <h2 className="text-xl font-heading font-semibold mb-3">What is 10 Odds?</h2>
            <p className="text-muted-foreground leading-relaxed">
              10 Odds is an AI-powered football prediction platform built around our proprietary prediction engine, <strong className="text-foreground">MK-806</strong>.
              Every day, MK-806 analyzes thousands of data points — from team form and head-to-head records to player availability and market odds —
              to generate a curated accumulator slip targeting combined odds of 10 or more.
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card p-6 mb-6">
            <h2 className="text-xl font-heading font-semibold mb-3">How It Works</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              MK-806 processes live data from the top 5 European football leagues: Premier League, La Liga, Serie A, Bundesliga, and Ligue 1.
              It evaluates statistical models, form indicators, and contextual factors to identify high-value betting opportunities.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Each prediction includes a detailed reasoning breakdown so you can understand the logic behind every pick.
            </p>
          </div>

          {/* Disclaimer */}
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <h2 className="text-xl font-heading font-semibold">Responsible Gambling Disclaimer</h2>
            </div>
            <p className="text-muted-foreground leading-relaxed mb-3">
              Gambling involves financial risk and can be addictive. The predictions provided by 10 Odds and the MK-806 engine are for informational and entertainment purposes only.
              They do not constitute financial advice.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-3">
              Past performance does not guarantee future results. Always bet responsibly and only wager what you can afford to lose.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              If you or someone you know has a gambling problem, please seek help from a professional organization.
            </p>
          </div>

          <div className="mt-6 rounded-xl border border-border bg-card p-6">
            <h2 className="text-xl font-heading font-semibold mb-3">Contact & Support</h2>
            <p className="text-muted-foreground leading-relaxed">
              For questions, feedback, or support, reach out to us at <strong className="text-foreground">support@10odds.com</strong>.
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default AboutPage;
