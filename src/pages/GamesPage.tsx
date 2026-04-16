import { useState } from "react";
import Layout from "@/components/Layout";
import FixtureCard from "@/components/FixtureCard";
import { todayFixtures, tomorrowFixtures, dayAfterFixtures } from "@/data/mockData";

const tabs = [
  { key: "today", label: "Today", data: todayFixtures },
  { key: "tomorrow", label: "Tomorrow", data: tomorrowFixtures },
  { key: "dayafter", label: "Day After", data: dayAfterFixtures },
];

const GamesPage = () => {
  const [activeTab, setActiveTab] = useState("today");
  const current = tabs.find((t) => t.key === activeTab)!;

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-heading font-bold mb-1">Football Games</h1>
        <p className="text-muted-foreground mb-6">Browse fixtures across the top 5 European leagues.</p>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? "gradient-gold text-accent-foreground shadow-gold"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Fixtures grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {current.data.map((f) => (
            <FixtureCard key={f.id} fixture={f} />
          ))}
        </div>
      </div>
    </Layout>
  );
};

export default GamesPage;
