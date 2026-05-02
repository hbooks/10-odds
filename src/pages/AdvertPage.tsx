import { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";
import { Download, Loader, Calendar, Trophy } from "lucide-react";
import { toPng } from "html-to-image";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL as string,
  import.meta.env.VITE_SUPABASE_ANON_KEY as string,
);

interface Team {
  id: number;
  name: string;
  tla: string | null;
  crest_url: string | null;
}

interface Match {
  id: number;
  utc_date: string;
  home_team: Team;
  away_team: Team;
  competition: { name: string; code: string };
}

// ─── Convert a remote image URL to a safe data URL (fixes CORS) ──────────────
async function imageToDataUrl(url: string): Promise<string | null> {
  try {
    const resp = await fetch(url, { mode: "cors" });
    if (!resp.ok) return null;
    const blob = await resp.blob();
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

// ─── Fallback placeholder when a crest cannot be fetched ─────────────────────
const FALLBACK_CREST =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'%3E%3Ccircle cx='20' cy='20' r='18' fill='%23333' stroke='%23555' stroke-width='2'/%3E%3Ctext x='20' y='25' text-anchor='middle' fill='%23aaa' font-size='12'%3E?%3C/text%3E%3C/svg%3E";

const AdvertPage = () => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [crestMap, setCrestMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [imgLoading, setImgLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchBigTeamMatches = async () => {
      try {
        const today = new Date();
        const todayStr = today.toISOString().split("T")[0];
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 2);
        const endStr = tomorrow.toISOString().split("T")[0];

        const { data: bigTeams } = await supabase
          .from("teams")
          .select("id")
          .eq("is_big_team", true);

        if (!bigTeams?.length) {
          setMatches([]);
          setLoading(false);
          return;
        }

        const bigIds = bigTeams.map((t) => t.id);

        const { data: matchData, error: matchErr } = await supabase
          .from("matches")
          .select(
            `id, utc_date,
             home_team:teams!matches_home_team_id_fkey(id, name, tla, crest_url),
             away_team:teams!matches_away_team_id_fkey(id, name, tla, crest_url),
             competition:competitions(name, code)`,
          )
          .gte("utc_date", `${todayStr}T00:00:00Z`)
          .lte("utc_date", `${endStr}T23:59:59Z`)
          .in("home_team_id", bigIds)
          .in("away_team_id", bigIds)
          .order("utc_date", { ascending: true });

        if (matchErr) throw matchErr;

        const fetchedMatches = (matchData as unknown as Match[]) ?? [];
        setMatches(fetchedMatches);

        // Gather all unique crest URLs
        const urls = new Set<string>();
        fetchedMatches.forEach((m) => {
          if (m.home_team.crest_url) urls.add(m.home_team.crest_url);
          if (m.away_team.crest_url) urls.add(m.away_team.crest_url);
        });

        // Convert each URL to a data URL
        const map: Record<string, string> = {};
        for (const url of urls) {
          const dataUrl = await imageToDataUrl(url);
          map[url] = dataUrl ?? FALLBACK_CREST;
        }
        setCrestMap(map);
      } catch (e) {
        setError("Failed to load blockbuster fixtures.");
      } finally {
        setLoading(false);
      }
    };

    fetchBigTeamMatches();
  }, []);

  const handleDownload = async () => {
    if (!cardRef.current || imgLoading) return;
    setImgLoading(true);
    try {
      const dataUrl = await toPng(cardRef.current, {
        quality: 0.95,
        cacheBust: true,
      });
      const link = document.createElement("a");
      link.download = "10odds_blockbuster.png";
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Download failed", err);
    } finally {
      setImgLoading(false);
    }
  };

  const formatDate = (utc: string) =>
    new Date(utc).toLocaleDateString("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });

  return (
    // Standalone page – no Layout, no navbar/footer
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-6 max-w-3xl">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-heading font-bold">Blockbuster Advert</h1>
            <p className="text-muted-foreground text-sm">
              Download a branded image of upcoming big‑team clashes
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="text-center py-16 text-muted-foreground">{error}</div>
        ) : matches.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            No blockbuster fixtures found for today or tomorrow.
          </div>
        ) : (
          <>
            {/* The card that gets downloaded */}
            <div
              ref={cardRef}
              className="relative w-full mx-auto rounded-3xl overflow-hidden shadow-2xl mb-8"
              style={{
                background: `linear-gradient(135deg, #0a1f2f 0%, #152b3c 40%, #1a3a50 100%)`,
                backgroundSize: "cover",
              }}
            >
              {/* Subtle pitch texture overlay */}
              <div className="absolute inset-0 bg-[url('/assets/pitch-bg.png')] opacity-10" />

              {/* Header */}
              <div className="relative z-10 px-8 py-6 flex items-center justify-between border-b border-white/10">
                <img
                  src="/assets/logo.png"
                  alt="10 Odds"
                  className="h-10 w-10 object-contain"
                />
                <div className="text-right">
                  <p className="text-white/70 text-xs uppercase tracking-widest font-mono">
                    10 <span className="text-gold">Odds</span>
                  </p>
                  <p className="text-white/40 text-[10px] font-mono">Blockbuster Fixtures</p>
                </div>
              </div>

              {/* Matches list */}
              <div className="relative z-10 px-8 py-6 space-y-5">
                {matches.map((match) => (
                  <div
                    key={match.id}
                    className="flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <img
                        src={
                          crestMap[match.home_team.crest_url!] ?? FALLBACK_CREST
                        }
                        alt={match.home_team.name}
                        className="h-8 w-8 object-contain drop-shadow"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = FALLBACK_CREST;
                        }}
                      />
                      <span className="text-white font-semibold text-sm truncate">
                        {match.home_team.tla || match.home_team.name}
                      </span>
                    </div>
                    <div className="text-xs text-white/40 font-mono">VS</div>
                    <div className="flex items-center gap-3 flex-1 min-w-0 justify-end text-right">
                      <span className="text-white font-semibold text-sm truncate">
                        {match.away_team.tla || match.away_team.name}
                      </span>
                      <img
                        src={
                          crestMap[match.away_team.crest_url!] ?? FALLBACK_CREST
                        }
                        alt={match.away_team.name}
                        className="h-8 w-8 object-contain drop-shadow"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = FALLBACK_CREST;
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div className="relative z-10 px-8 py-4 border-t border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2 text-white/50 text-xs">
                  <Calendar className="h-3 w-3" />
                  <span>
                    {formatDate(matches[0]?.utc_date)} –{" "}
                    {formatDate(matches[matches.length - 1]?.utc_date)}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Trophy className="h-3 w-3 text-gold" />
                  <span className="text-gold text-xs font-semibold">10 Odds</span>
                </div>
              </div>
            </div>

            {/* Download button – placed below the card, far from any floating elements */}
            <div className="flex justify-center">
              <button
                onClick={handleDownload}
                disabled={imgLoading}
                className="flex items-center gap-2 gradient-gold text-accent-foreground px-6 py-3 rounded-xl text-sm font-semibold shadow-lg hover:opacity-90 transition disabled:opacity-50"
              >
                {imgLoading ? (
                  <Loader className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                {imgLoading ? "Generating…" : "Download Image"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AdvertPage;