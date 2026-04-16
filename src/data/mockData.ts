export interface Fixture {
  id: string;
  homeTeam: string;
  awayTeam: string;
  league: string;
  time: string;
  date: string;
  homeOdds: number;
  drawOdds: number;
  awayOdds: number;
}

export interface Prediction {
  id: string;
  fixture: string;
  prediction: string;
  odds: number;
  reasoning: string;
  status: "pending" | "won" | "lost" | "winning" | "losing";
  date: string;
}

export interface SlipPick {
  id: string;
  fixture: string;
  bet: string;
  odds: number;
  reasoning: string;
}

const leagues = ["Premier League", "La Liga", "Serie A", "Bundesliga", "Ligue 1"];

export const todayFixtures: Fixture[] = [
  { id: "1", homeTeam: "Arsenal", awayTeam: "Chelsea", league: "Premier League", time: "15:00", date: "Today", homeOdds: 1.85, drawOdds: 3.40, awayOdds: 4.20 },
  { id: "2", homeTeam: "Barcelona", awayTeam: "Real Madrid", league: "La Liga", time: "20:00", date: "Today", homeOdds: 2.10, drawOdds: 3.25, awayOdds: 3.50 },
  { id: "3", homeTeam: "AC Milan", awayTeam: "Inter Milan", league: "Serie A", time: "17:30", date: "Today", homeOdds: 2.60, drawOdds: 3.10, awayOdds: 2.80 },
  { id: "4", homeTeam: "Bayern Munich", awayTeam: "Borussia Dortmund", league: "Bundesliga", time: "18:30", date: "Today", homeOdds: 1.55, drawOdds: 4.00, awayOdds: 5.50 },
  { id: "5", homeTeam: "PSG", awayTeam: "Marseille", league: "Ligue 1", time: "21:00", date: "Today", homeOdds: 1.40, drawOdds: 4.50, awayOdds: 7.00 },
  { id: "6", homeTeam: "Liverpool", awayTeam: "Man United", league: "Premier League", time: "16:30", date: "Today", homeOdds: 1.70, drawOdds: 3.60, awayOdds: 4.80 },
  { id: "7", homeTeam: "Atletico Madrid", awayTeam: "Sevilla", league: "La Liga", time: "19:00", date: "Today", homeOdds: 1.90, drawOdds: 3.30, awayOdds: 4.10 },
  { id: "8", homeTeam: "Juventus", awayTeam: "Napoli", league: "Serie A", time: "20:45", date: "Today", homeOdds: 2.30, drawOdds: 3.15, awayOdds: 3.20 },
];

export const tomorrowFixtures: Fixture[] = [
  { id: "t1", homeTeam: "Man City", awayTeam: "Tottenham", league: "Premier League", time: "15:00", date: "Tomorrow", homeOdds: 1.35, drawOdds: 5.00, awayOdds: 8.00 },
  { id: "t2", homeTeam: "Real Sociedad", awayTeam: "Villarreal", league: "La Liga", time: "18:00", date: "Tomorrow", homeOdds: 2.20, drawOdds: 3.20, awayOdds: 3.30 },
  { id: "t3", homeTeam: "Roma", awayTeam: "Lazio", league: "Serie A", time: "20:45", date: "Tomorrow", homeOdds: 2.40, drawOdds: 3.10, awayOdds: 3.00 },
  { id: "t4", homeTeam: "RB Leipzig", awayTeam: "Bayer Leverkusen", league: "Bundesliga", time: "17:30", date: "Tomorrow", homeOdds: 2.50, drawOdds: 3.30, awayOdds: 2.85 },
  { id: "t5", homeTeam: "Lyon", awayTeam: "Monaco", league: "Ligue 1", time: "21:00", date: "Tomorrow", homeOdds: 2.10, drawOdds: 3.40, awayOdds: 3.40 },
  { id: "t6", homeTeam: "Newcastle", awayTeam: "Aston Villa", league: "Premier League", time: "19:30", date: "Tomorrow", homeOdds: 1.80, drawOdds: 3.50, awayOdds: 4.50 },
];

export const dayAfterFixtures: Fixture[] = [
  { id: "d1", homeTeam: "Everton", awayTeam: "West Ham", league: "Premier League", time: "15:00", date: "Day After", homeOdds: 2.60, drawOdds: 3.20, awayOdds: 2.75 },
  { id: "d2", homeTeam: "Valencia", awayTeam: "Betis", league: "La Liga", time: "17:00", date: "Day After", homeOdds: 2.30, drawOdds: 3.10, awayOdds: 3.20 },
  { id: "d3", homeTeam: "Fiorentina", awayTeam: "Atalanta", league: "Serie A", time: "20:45", date: "Day After", homeOdds: 2.70, drawOdds: 3.20, awayOdds: 2.65 },
  { id: "d4", homeTeam: "Wolfsburg", awayTeam: "Freiburg", league: "Bundesliga", time: "18:30", date: "Day After", homeOdds: 2.40, drawOdds: 3.30, awayOdds: 3.00 },
  { id: "d5", homeTeam: "Lille", awayTeam: "Nice", league: "Ligue 1", time: "21:00", date: "Day After", homeOdds: 1.95, drawOdds: 3.40, awayOdds: 3.90 },
];

export const tenOddsSlip: SlipPick[] = [
  { id: "s1", fixture: "Barcelona vs Real Madrid", bet: "Over 2.5 Goals", odds: 1.65, reasoning: "MK-806 analysis: Both teams have scored 2+ goals in 7 of their last 8 meetings. Barcelona's attack has been in exceptional form with 18 goals in their last 6 home games. Real Madrid's defense has conceded in every away match this season. Historical H2H average is 3.4 goals per match." },
  { id: "s2", fixture: "Arsenal vs Chelsea", bet: "Home Win", odds: 1.85, reasoning: "MK-806 analysis: Arsenal are unbeaten at home this season with 12 wins in 14 matches. Chelsea's away form has been inconsistent, losing 5 of their last 8 away fixtures. Arsenal's xG at home is 2.3 per match, highest in the Premier League." },
  { id: "s3", fixture: "Bayern Munich vs Borussia Dortmund", bet: "Both Teams to Score", odds: 1.55, reasoning: "MK-806 analysis: BTTS has landed in 9 of the last 10 Der Klassiker matchups. Bayern's high press creates chances but also leaves gaps. Dortmund's counter-attack with their current forwards makes scoring almost certain." },
  { id: "s4", fixture: "PSG vs Marseille", bet: "Home Win & Over 1.5", odds: 1.45, reasoning: "MK-806 analysis: PSG have won Le Classique at home in the last 6 consecutive meetings. Their scoring rate at home is 3.1 goals per game. Marseille have conceded first in 70% of their away matches this season." },
  { id: "s5", fixture: "Liverpool vs Man United", bet: "Over 1.5 First Half Goals", odds: 2.10, reasoning: "MK-806 analysis: 4 of the last 5 meetings at Anfield have had 2+ first-half goals. Liverpool's pressing intensity is at its peak in the first 30 minutes. Man United's defensive setup takes time to settle in away derbies." },
  { id: "s6", fixture: "AC Milan vs Inter Milan", bet: "Draw", odds: 3.10, reasoning: "MK-806 analysis: The Derby della Madonnina has ended in a draw in 3 of the last 7 meetings. Both teams are evenly matched this season with similar points tallies. Milan's home fortress meets Inter's solid away record." },
];

export const activePredictions: Prediction[] = [
  { id: "a1", fixture: "Arsenal vs Chelsea", prediction: "Home Win", odds: 1.85, reasoning: "", status: "pending", date: "2026-04-16" },
  { id: "a2", fixture: "Barcelona vs Real Madrid", prediction: "Over 2.5 Goals", odds: 1.65, reasoning: "", status: "pending", date: "2026-04-16" },
  { id: "a3", fixture: "Bayern vs Dortmund", prediction: "BTTS Yes", odds: 1.55, reasoning: "", status: "winning", date: "2026-04-16" },
  { id: "a4", fixture: "PSG vs Marseille", prediction: "Home Win & Over 1.5", odds: 1.45, reasoning: "", status: "pending", date: "2026-04-16" },
  { id: "a5", fixture: "Liverpool vs Man United", prediction: "Over 1.5 FH Goals", odds: 2.10, reasoning: "", status: "losing", date: "2026-04-16" },
];

export const completedPredictions: Prediction[] = [
  { id: "c1", fixture: "Man City vs Tottenham", prediction: "Home Win", odds: 1.35, reasoning: "", status: "won", date: "2026-04-15" },
  { id: "c2", fixture: "Real Sociedad vs Villarreal", prediction: "BTTS", odds: 1.70, reasoning: "", status: "won", date: "2026-04-15" },
  { id: "c3", fixture: "Roma vs Lazio", prediction: "Over 2.5", odds: 1.80, reasoning: "", status: "lost", date: "2026-04-15" },
  { id: "c4", fixture: "Newcastle vs Villa", prediction: "Home Win", odds: 1.80, reasoning: "", status: "won", date: "2026-04-14" },
  { id: "c5", fixture: "Lyon vs Monaco", prediction: "Draw", odds: 3.40, reasoning: "", status: "lost", date: "2026-04-14" },
  { id: "c6", fixture: "RB Leipzig vs Leverkusen", prediction: "Away Win", odds: 2.85, reasoning: "", status: "won", date: "2026-04-14" },
  { id: "c7", fixture: "Juventus vs Napoli", prediction: "Under 2.5", odds: 1.90, reasoning: "", status: "won", date: "2026-04-13" },
  { id: "c8", fixture: "Atletico vs Sevilla", prediction: "Home Win", odds: 1.90, reasoning: "", status: "won", date: "2026-04-13" },
  { id: "c9", fixture: "Everton vs West Ham", prediction: "Draw", odds: 3.20, reasoning: "", status: "lost", date: "2026-04-13" },
  { id: "c10", fixture: "Valencia vs Betis", prediction: "BTTS", odds: 1.65, reasoning: "", status: "won", date: "2026-04-12" },
  { id: "c11", fixture: "Fiorentina vs Atalanta", prediction: "Over 2.5", odds: 1.75, reasoning: "", status: "won", date: "2026-04-12" },
  { id: "c12", fixture: "Wolfsburg vs Freiburg", prediction: "Home Win", odds: 2.40, reasoning: "", status: "lost", date: "2026-04-12" },
];

export const analyticsData = {
  weeklyPerformance: [
    { week: "Week 1", won: 8, lost: 3 },
    { week: "Week 2", won: 7, lost: 4 },
    { week: "Week 3", won: 9, lost: 2 },
    { week: "Week 4", won: 6, lost: 5 },
    { week: "Week 5", won: 10, lost: 1 },
    { week: "Week 6", won: 8, lost: 3 },
    { week: "Week 7", won: 7, lost: 2 },
    { week: "Week 8", won: 9, lost: 3 },
  ],
  overallStats: {
    totalPredictions: 120,
    won: 82,
    lost: 38,
    winRate: 68.3,
    averageOdds: 1.92,
    roi: 24.5,
    streak: 5,
  },
  leagueBreakdown: [
    { league: "Premier League", won: 22, lost: 8 },
    { league: "La Liga", won: 18, lost: 7 },
    { league: "Serie A", won: 16, lost: 9 },
    { league: "Bundesliga", won: 14, lost: 8 },
    { league: "Ligue 1", won: 12, lost: 6 },
  ],
};
