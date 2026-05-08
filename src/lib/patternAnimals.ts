export interface PatternAnimal {
  animal: string;
  originalLabel: string;
  confidence: "High" | "Average" | "Low";
  evType: string;
  description: string;
}

export const PATTERN_ANIMALS: PatternAnimal[] = [
  {
    animal: "Lion",
    originalLabel: "HConf & H(+)EV",
    confidence: "High",
    evType: "High Positive",
    description:
      "The apex predator. MK-806 was highly confident and the market offered strong value — the rarest and most compelling combination in the system.",
  },
  {
    animal: "Eagle",
    originalLabel: "HConf & A(+)EV",
    confidence: "High",
    evType: "Average Positive",
    description:
      "Sharp eyes, solid ground. High confidence backed by decent value. Not flashy, but consistently one of the stronger signals to watch.",
  },
  {
    animal: "Bear",
    originalLabel: "HConf & L(+)EV",
    confidence: "High",
    evType: "Low Positive",
    description:
      "Confident but cautious value. MK-806 read the game well, though the market offered only thin positive edge. Still grounded in strong conviction.",
  },
  {
    animal: "Bull",
    originalLabel: "HConf & H(-)EV",
    confidence: "High",
    evType: "High Negative",
    description:
      "Charging hard, but into the wind. High confidence meets a market that's priced the outcome heavily — value is working against you here.",
  },
  {
    animal: "Horse",
    originalLabel: "HConf & A(-)EV",
    confidence: "High",
    evType: "Average Negative",
    description:
      "Strong form, average headwind. Solid confidence, but the odds are a touch lean. The pick looks good — the price just isn't generous.",
  },
  {
    animal: "Rhino",
    originalLabel: "HConf & L(-)EV",
    confidence: "High",
    evType: "Low Negative",
    description:
      "Thick-skinned conviction, marginal negative value. MK-806 is sure of its read, but the market has only slightly undercut the fair price.",
  },
  {
    animal: "Fox",
    originalLabel: "AConf & H(+)EV",
    confidence: "Average",
    evType: "High Positive",
    description:
      "Clever and opportunistic. Average confidence, but the market is offering real value — a pattern that rewards patience and selective action.",
  },
  {
    animal: "Owl",
    originalLabel: "AConf & A(+)EV",
    confidence: "Average",
    evType: "Average Positive",
    description:
      "Steady and measured. A balanced blend of middling confidence and modest positive value — the most common pattern in the system.",
  },
  {
    animal: "Squirrel",
    originalLabel: "AConf & L(+)EV",
    confidence: "Average",
    evType: "Low Positive",
    description:
      "Modest but hopeful. Average conviction with a thin sliver of edge. Not a standout, but the numbers are at least pointing in the right direction.",
  },
  {
    animal: "Deer",
    originalLabel: "AConf & H(-)EV",
    confidence: "Average",
    evType: "High Negative",
    description:
      "Cautious in difficult terrain. Average confidence, and the market is firmly against the value case. Tread carefully with this pattern.",
  },
  {
    animal: "Frog",
    originalLabel: "AConf & A(-)EV",
    confidence: "Average",
    evType: "Average Negative",
    description:
      "Sitting between two currents. Average confidence, average negative value — nothing stands out strongly in either direction.",
  },
  {
    animal: "Mole",
    originalLabel: "AConf & L(-)EV",
    confidence: "Average",
    evType: "Low Negative",
    description:
      "Digging in the dark. Average confidence with only slight negative value. Not alarming, but you're swimming slightly against the tide.",
  },
  {
    animal: "Rabbit",
    originalLabel: "LConf & H(+)EV",
    confidence: "Low",
    evType: "High Positive",
    description:
      "A long-shot with a surprise upside. Low confidence, but the odds are genuinely generous — the market may have overreacted and left real value on the table.",
  },
  {
    animal: "Hamster",
    originalLabel: "LConf & A(+)EV",
    confidence: "Low",
    evType: "Average Positive",
    description:
      "Small steps, decent odds. Low confidence with moderate value. Nothing to bet the house on, but not without some upside either.",
  },
  {
    animal: "Turtle",
    originalLabel: "LConf & L(+)EV",
    confidence: "Low",
    evType: "Low Positive",
    description:
      "Slow and uncertain. Low confidence, low value — this combination is the quietest signal in the system. Proceed with real caution.",
  },
  {
    animal: "Mouse",
    originalLabel: "LConf & H(-)EV",
    confidence: "Low",
    evType: "High Negative",
    description:
      "Fragile position. Low confidence and heavy negative value — MK-806 wasn't sure, and the market is pricing the outcome firmly away from you.",
  },
  {
    animal: "Ant",
    originalLabel: "LConf & A(-)EV",
    confidence: "Low",
    evType: "Average Negative",
    description:
      "Small and uphill. Low confidence with average negative value. The numbers are working against this pick on both fronts.",
  },
  {
    animal: "Worm",
    originalLabel: "LConf & L(-)EV",
    confidence: "Low",
    evType: "Low Negative",
    description:
      "The weakest signal in the system. Low confidence, low negative value — historically the hardest pattern to act on with any conviction.",
  },
];

/** Look up animal data by original pattern label (e.g. "HConf & H(+)EV") */
export function getAnimalByLabel(label: string): PatternAnimal | undefined {
  return PATTERN_ANIMALS.find((a) => a.originalLabel === label);
}

/** Look up animal data by animal name (e.g. "Lion") */
export function getAnimalByName(name: string): PatternAnimal | undefined {
  return PATTERN_ANIMALS.find((a) => a.animal.toLowerCase() === name.toLowerCase());
}