import { Fixture } from "@/data/mockData";
import { Clock } from "lucide-react";

const FixtureCard = ({ fixture }: { fixture: Fixture }) => {
  return (
    <div className="rounded-lg border border-border bg-card p-4 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-gold bg-accent/10 px-2 py-0.5 rounded-full">
          {fixture.league}
        </span>
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" /> {fixture.time}
        </span>
      </div>
      <div className="flex items-center justify-between mb-4">
        <span className="font-heading font-semibold text-sm">{fixture.homeTeam}</span>
        <span className="text-xs text-muted-foreground font-medium">vs</span>
        <span className="font-heading font-semibold text-sm text-right">{fixture.awayTeam}</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <OddsButton label="1" odds={fixture.homeOdds} />
        <OddsButton label="X" odds={fixture.drawOdds} />
        <OddsButton label="2" odds={fixture.awayOdds} />
      </div>
    </div>
  );
};

const OddsButton = ({ label, odds }: { label: string; odds: number }) => (
  <button className="flex flex-col items-center gap-0.5 rounded-md border border-border bg-muted/50 py-2 hover:border-gold hover:bg-accent/10 transition-colors">
    <span className="text-[10px] text-muted-foreground">{label}</span>
    <span className="text-sm font-semibold">{odds.toFixed(2)}</span>
  </button>
);

export default FixtureCard;
