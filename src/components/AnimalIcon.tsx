import React from "react";

interface AnimalIconProps {
  animal: string;
  className?: string;
  size?: number;
}

// ─── Individual SVG paths ────────────────────────────────────────────────────
// All icons use a 24×24 viewBox, stroke-based, consistent weight.

const ICONS: Record<string, React.ReactNode> = {
  Lion: (
    <>
      {/* mane circle */}
      <circle cx="12" cy="10" r="7" strokeWidth="1.5" fill="none" />
      {/* face */}
      <circle cx="12" cy="10" r="4.5" strokeWidth="1.5" fill="none" />
      {/* ears */}
      <path d="M7 5 L5 2 L9 4" strokeWidth="1.4" fill="none" strokeLinejoin="round" />
      <path d="M17 5 L19 2 L15 4" strokeWidth="1.4" fill="none" strokeLinejoin="round" />
      {/* eyes */}
      <circle cx="10.5" cy="9" r="0.6" fill="currentColor" />
      <circle cx="13.5" cy="9" r="0.6" fill="currentColor" />
      {/* nose */}
      <path d="M11.2 11.2 L12 12 L12.8 11.2" strokeWidth="1.2" fill="none" strokeLinejoin="round" />
      {/* body stub */}
      <path d="M8 16.5 Q12 14.5 16 16.5" strokeWidth="1.5" fill="none" />
      {/* tail */}
      <path d="M17 17 Q20 18 20 21" strokeWidth="1.4" fill="none" />
    </>
  ),

  Eagle: (
    <>
      {/* body */}
      <ellipse cx="12" cy="13" rx="3" ry="4" strokeWidth="1.5" fill="none" />
      {/* left wing */}
      <path d="M9 12 Q4 9 2 11 Q5 13 9 14" strokeWidth="1.4" fill="none" strokeLinejoin="round" />
      {/* right wing */}
      <path d="M15 12 Q20 9 22 11 Q19 13 15 14" strokeWidth="1.4" fill="none" strokeLinejoin="round" />
      {/* head */}
      <circle cx="12" cy="8" r="2.5" strokeWidth="1.5" fill="none" />
      {/* beak */}
      <path d="M13.5 8.5 L15.5 9 L14 10" strokeWidth="1.2" fill="none" strokeLinejoin="round" />
      {/* eye */}
      <circle cx="11.5" cy="7.8" r="0.5" fill="currentColor" />
      {/* talons */}
      <path d="M10 17 L9 20 M12 17.5 L12 21 M14 17 L15 20" strokeWidth="1.3" fill="none" />
    </>
  ),

  Bear: (
    <>
      {/* body */}
      <ellipse cx="12" cy="14" rx="5.5" ry="5" strokeWidth="1.5" fill="none" />
      {/* head */}
      <circle cx="12" cy="8.5" r="3.5" strokeWidth="1.5" fill="none" />
      {/* ears */}
      <circle cx="9" cy="6" r="1.3" strokeWidth="1.4" fill="none" />
      <circle cx="15" cy="6" r="1.3" strokeWidth="1.4" fill="none" />
      {/* eyes */}
      <circle cx="10.8" cy="8.2" r="0.5" fill="currentColor" />
      <circle cx="13.2" cy="8.2" r="0.5" fill="currentColor" />
      {/* snout */}
      <ellipse cx="12" cy="10" rx="1.5" ry="1" strokeWidth="1.2" fill="none" />
      <circle cx="12" cy="9.7" r="0.4" fill="currentColor" />
      {/* arms */}
      <path d="M6.5 13 Q4 15 5 18" strokeWidth="1.4" fill="none" />
      <path d="M17.5 13 Q20 15 19 18" strokeWidth="1.4" fill="none" />
    </>
  ),

  Bull: (
    <>
      {/* head */}
      <ellipse cx="12" cy="11" rx="5" ry="4.5" strokeWidth="1.5" fill="none" />
      {/* horns */}
      <path d="M7.5 8 Q4 4 6 2" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <path d="M16.5 8 Q20 4 18 2" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      {/* eyes */}
      <circle cx="10" cy="10" r="0.6" fill="currentColor" />
      <circle cx="14" cy="10" r="0.6" fill="currentColor" />
      {/* nostrils */}
      <ellipse cx="10.5" cy="13" rx="0.8" ry="0.5" strokeWidth="1.2" fill="none" />
      <ellipse cx="13.5" cy="13" rx="0.8" ry="0.5" strokeWidth="1.2" fill="none" />
      {/* body */}
      <path d="M7 15 Q12 18 17 15" strokeWidth="1.5" fill="none" />
      {/* legs */}
      <path d="M9 18 L8 22 M15 18 L16 22" strokeWidth="1.4" fill="none" />
    </>
  ),

  Horse: (
    <>
      {/* body */}
      <ellipse cx="12" cy="15" rx="6" ry="4" strokeWidth="1.5" fill="none" />
      {/* neck + head */}
      <path d="M9 12 Q9 7 11 6 Q14 5 15 7 Q16 9 14 11" strokeWidth="1.5" fill="none" strokeLinejoin="round" />
      {/* mane */}
      <path d="M10 6.5 Q11 4 12 6 Q12 3 13 5.5" strokeWidth="1.2" fill="none" />
      {/* eye */}
      <circle cx="13.5" cy="7" r="0.5" fill="currentColor" />
      {/* nostril */}
      <circle cx="15" cy="8.5" r="0.4" fill="currentColor" />
      {/* legs */}
      <path d="M8 18.5 L7 22 M10 19 L10 22 M14 19 L14 22 M16 18.5 L17 22" strokeWidth="1.3" fill="none" />
      {/* tail */}
      <path d="M18 14 Q21 13 20 17" strokeWidth="1.4" fill="none" />
    </>
  ),

  Rhino: (
    <>
      {/* body */}
      <ellipse cx="12" cy="14" rx="7" ry="5" strokeWidth="1.5" fill="none" />
      {/* head */}
      <ellipse cx="18" cy="12" rx="3.5" ry="3" strokeWidth="1.5" fill="none" />
      {/* horn */}
      <path d="M20.5 9.5 L22 5 L21 9" strokeWidth="1.5" fill="none" strokeLinejoin="round" />
      {/* eye */}
      <circle cx="19.5" cy="11.5" r="0.5" fill="currentColor" />
      {/* legs */}
      <path d="M7 18.5 L6 22 M9 19 L9 22 M13 19 L13 22 M16 19 L16 22" strokeWidth="1.3" fill="none" />
      {/* ear */}
      <path d="M16.5 9.5 L16 7 L18 9" strokeWidth="1.2" fill="none" strokeLinejoin="round" />
    </>
  ),

  Fox: (
    <>
      {/* body */}
      <ellipse cx="12" cy="15" rx="5" ry="4" strokeWidth="1.5" fill="none" />
      {/* head */}
      <path d="M8 10 Q12 6 16 10 Q16 14 12 14 Q8 14 8 10Z" strokeWidth="1.5" fill="none" />
      {/* ears */}
      <path d="M8.5 10 L6 5 L11 9" strokeWidth="1.3" fill="none" strokeLinejoin="round" />
      <path d="M15.5 10 L18 5 L13 9" strokeWidth="1.3" fill="none" strokeLinejoin="round" />
      {/* eyes */}
      <circle cx="10.5" cy="10.5" r="0.5" fill="currentColor" />
      <circle cx="13.5" cy="10.5" r="0.5" fill="currentColor" />
      {/* snout */}
      <path d="M11 12.5 L12 13.5 L13 12.5" strokeWidth="1.2" fill="none" strokeLinejoin="round" />
      {/* tail */}
      <path d="M17 18 Q21 17 22 21 Q19 22 17 20" strokeWidth="1.4" fill="none" />
    </>
  ),

  Owl: (
    <>
      {/* body */}
      <ellipse cx="12" cy="15" rx="5" ry="5.5" strokeWidth="1.5" fill="none" />
      {/* head */}
      <circle cx="12" cy="9" r="4" strokeWidth="1.5" fill="none" />
      {/* ear tufts */}
      <path d="M9.5 5.5 L8 2 L11 5" strokeWidth="1.3" fill="none" strokeLinejoin="round" />
      <path d="M14.5 5.5 L16 2 L13 5" strokeWidth="1.3" fill="none" strokeLinejoin="round" />
      {/* eyes – large */}
      <circle cx="10.5" cy="9" r="1.5" strokeWidth="1.3" fill="none" />
      <circle cx="13.5" cy="9" r="1.5" strokeWidth="1.3" fill="none" />
      <circle cx="10.5" cy="9" r="0.6" fill="currentColor" />
      <circle cx="13.5" cy="9" r="0.6" fill="currentColor" />
      {/* beak */}
      <path d="M11.2 11 L12 12.2 L12.8 11" strokeWidth="1.2" fill="none" strokeLinejoin="round" />
      {/* wing lines */}
      <path d="M7 14 Q6 17 8 19" strokeWidth="1.3" fill="none" />
      <path d="M17 14 Q18 17 16 19" strokeWidth="1.3" fill="none" />
    </>
  ),

  Squirrel: (
    <>
      {/* body */}
      <ellipse cx="11" cy="14" rx="4" ry="4.5" strokeWidth="1.5" fill="none" />
      {/* head */}
      <circle cx="11" cy="9" r="3" strokeWidth="1.5" fill="none" />
      {/* ear */}
      <path d="M9 6.5 L8 4 L11 6" strokeWidth="1.2" fill="none" strokeLinejoin="round" />
      {/* eye */}
      <circle cx="12.5" cy="8.5" r="0.5" fill="currentColor" />
      {/* nose */}
      <circle cx="13.5" cy="10" r="0.4" fill="currentColor" />
      {/* bushy tail */}
      <path d="M15 13 Q20 10 21 14 Q21 19 17 20 Q15 19 15 17" strokeWidth="1.4" fill="none" strokeLinejoin="round" />
      {/* legs */}
      <path d="M8 18 L7 22 M12 18.5 L13 22" strokeWidth="1.3" fill="none" />
    </>
  ),

  Deer: (
    <>
      {/* body */}
      <ellipse cx="12" cy="15" rx="5" ry="4" strokeWidth="1.5" fill="none" />
      {/* neck + head */}
      <ellipse cx="12" cy="9.5" rx="2.5" ry="3" strokeWidth="1.5" fill="none" />
      {/* antlers left */}
      <path d="M10 7 L8 3 M8 3 L6 1 M8 3 L10 1" strokeWidth="1.3" fill="none" strokeLinejoin="round" />
      {/* antlers right */}
      <path d="M14 7 L16 3 M16 3 L18 1 M16 3 L14 1" strokeWidth="1.3" fill="none" strokeLinejoin="round" />
      {/* eyes */}
      <circle cx="11" cy="9" r="0.5" fill="currentColor" />
      <circle cx="13" cy="9" r="0.5" fill="currentColor" />
      {/* nose */}
      <circle cx="12" cy="11.5" r="0.5" fill="currentColor" />
      {/* legs */}
      <path d="M9 19 L8 22 M11 19.5 L11 22 M13 19.5 L13 22 M15 19 L16 22" strokeWidth="1.3" fill="none" />
    </>
  ),

  Frog: (
    <>
      {/* body */}
      <ellipse cx="12" cy="14" rx="6" ry="5" strokeWidth="1.5" fill="none" />
      {/* head bumps / eyes */}
      <circle cx="9" cy="9" r="2" strokeWidth="1.4" fill="none" />
      <circle cx="15" cy="9" r="2" strokeWidth="1.4" fill="none" />
      <circle cx="9" cy="9" r="0.7" fill="currentColor" />
      <circle cx="15" cy="9" r="0.7" fill="currentColor" />
      {/* mouth */}
      <path d="M9 12 Q12 14 15 12" strokeWidth="1.4" fill="none" />
      {/* front legs */}
      <path d="M6 14 Q3 16 4 19 M18 14 Q21 16 20 19" strokeWidth="1.3" fill="none" />
      {/* back legs */}
      <path d="M7 18.5 Q5 21 6 23 M17 18.5 Q19 21 18 23" strokeWidth="1.3" fill="none" />
    </>
  ),

  Mole: (
    <>
      {/* body */}
      <ellipse cx="12" cy="14" rx="6" ry="5" strokeWidth="1.5" fill="none" />
      {/* snout */}
      <ellipse cx="12" cy="10" rx="2" ry="1.5" strokeWidth="1.4" fill="none" />
      {/* tiny eyes */}
      <circle cx="10" cy="11.5" r="0.5" fill="currentColor" />
      <circle cx="14" cy="11.5" r="0.5" fill="currentColor" />
      {/* front paws / digging claws */}
      <path d="M6 13 Q3 14 2 17 M6 15 Q3 17 3 20" strokeWidth="1.3" fill="none" />
      <path d="M18 13 Q21 14 22 17 M18 15 Q21 17 21 20" strokeWidth="1.3" fill="none" />
      {/* dirt/ground line */}
      <path d="M4 20 Q12 22 20 20" strokeWidth="1.3" fill="none" strokeDasharray="2 2" />
    </>
  ),

  Rabbit: (
    <>
      {/* body */}
      <ellipse cx="12" cy="15" rx="4.5" ry="5" strokeWidth="1.5" fill="none" />
      {/* head */}
      <circle cx="12" cy="9.5" r="3" strokeWidth="1.5" fill="none" />
      {/* long ears */}
      <path d="M10.5 7 Q9.5 2 10.5 0.5 Q12 2 11.5 7" strokeWidth="1.4" fill="none" strokeLinejoin="round" />
      <path d="M13.5 7 Q14.5 2 13.5 0.5 Q12 2 12.5 7" strokeWidth="1.4" fill="none" strokeLinejoin="round" />
      {/* eyes */}
      <circle cx="10.8" cy="9" r="0.5" fill="currentColor" />
      <circle cx="13.2" cy="9" r="0.5" fill="currentColor" />
      {/* nose */}
      <circle cx="12" cy="11" r="0.4" fill="currentColor" />
      {/* cotton tail */}
      <circle cx="16" cy="17" r="1.2" strokeWidth="1.3" fill="none" />
      {/* hind legs */}
      <path d="M9 20 Q7 22 8 23 M15 20 Q17 22 16 23" strokeWidth="1.3" fill="none" />
    </>
  ),

  Hamster: (
    <>
      {/* chubby body */}
      <ellipse cx="12" cy="14.5" rx="6" ry="5.5" strokeWidth="1.5" fill="none" />
      {/* head — round */}
      <circle cx="12" cy="8.5" r="4" strokeWidth="1.5" fill="none" />
      {/* round ears */}
      <circle cx="8.5" cy="5.5" r="1.5" strokeWidth="1.4" fill="none" />
      <circle cx="15.5" cy="5.5" r="1.5" strokeWidth="1.4" fill="none" />
      {/* eyes */}
      <circle cx="10.5" cy="8" r="0.6" fill="currentColor" />
      <circle cx="13.5" cy="8" r="0.6" fill="currentColor" />
      {/* nose */}
      <circle cx="12" cy="10.2" r="0.5" fill="currentColor" />
      {/* chubby cheeks */}
      <path d="M8 9.5 Q6 10 7 12" strokeWidth="1.3" fill="none" />
      <path d="M16 9.5 Q18 10 17 12" strokeWidth="1.3" fill="none" />
      {/* tiny legs */}
      <path d="M9 19.5 L8 22 M15 19.5 L16 22" strokeWidth="1.3" fill="none" />
    </>
  ),

  Turtle: (
    <>
      {/* shell */}
      <ellipse cx="12" cy="13" rx="7" ry="5.5" strokeWidth="1.5" fill="none" />
      {/* shell pattern */}
      <path d="M12 7.5 L12 18.5 M5 13 L19 13 M7 9.5 L17 16.5 M17 9.5 L7 16.5" strokeWidth="0.8" opacity="0.5" />
      {/* head */}
      <circle cx="12" cy="6" r="2" strokeWidth="1.4" fill="none" />
      {/* eye */}
      <circle cx="13" cy="5.5" r="0.4" fill="currentColor" />
      {/* legs */}
      <path d="M5.5 10 Q3 9 2 11" strokeWidth="1.3" fill="none" />
      <path d="M5.5 16 Q3 17 2 15" strokeWidth="1.3" fill="none" />
      <path d="M18.5 10 Q21 9 22 11" strokeWidth="1.3" fill="none" />
      <path d="M18.5 16 Q21 17 22 15" strokeWidth="1.3" fill="none" />
      {/* tail */}
      <path d="M12 18.5 Q12 21 11 22" strokeWidth="1.3" fill="none" />
    </>
  ),

  Mouse: (
    <>
      {/* body */}
      <ellipse cx="12" cy="15" rx="4.5" ry="4" strokeWidth="1.5" fill="none" />
      {/* head */}
      <circle cx="12" cy="10" r="3" strokeWidth="1.5" fill="none" />
      {/* big round ears */}
      <circle cx="9" cy="7.5" r="2" strokeWidth="1.4" fill="none" />
      <circle cx="15" cy="7.5" r="2" strokeWidth="1.4" fill="none" />
      {/* eyes */}
      <circle cx="10.8" cy="9.8" r="0.5" fill="currentColor" />
      <circle cx="13.2" cy="9.8" r="0.5" fill="currentColor" />
      {/* nose */}
      <circle cx="12" cy="11.8" r="0.4" fill="currentColor" />
      {/* long tail */}
      <path d="M16.5 17 Q20 16 22 19 Q21 22 19 21" strokeWidth="1.4" fill="none" />
      {/* feet */}
      <path d="M9 19 L8 22 M15 19 L16 22" strokeWidth="1.3" fill="none" />
    </>
  ),

  Ant: (
    <>
      {/* 3-segment body */}
      <circle cx="12" cy="6" r="2" strokeWidth="1.4" fill="none" />
      <circle cx="12" cy="11.5" r="2.5" strokeWidth="1.4" fill="none" />
      <circle cx="12" cy="17.5" r="3" strokeWidth="1.4" fill="none" />
      {/* antennae */}
      <path d="M11 4.2 Q9 2 8 0" strokeWidth="1.3" fill="none" />
      <path d="M13 4.2 Q15 2 16 0" strokeWidth="1.3" fill="none" />
      {/* eyes */}
      <circle cx="10.8" cy="5.5" r="0.4" fill="currentColor" />
      <circle cx="13.2" cy="5.5" r="0.4" fill="currentColor" />
      {/* 6 legs */}
      <path d="M9.5 11 L6 9 M9.5 12 L6 12 M9.5 13 L6 15" strokeWidth="1.2" fill="none" />
      <path d="M14.5 11 L18 9 M14.5 12 L18 12 M14.5 13 L18 15" strokeWidth="1.2" fill="none" />
    </>
  ),

  Worm: (
    <>
      {/* segmented worm */}
      <circle cx="5" cy="18" r="2.2" strokeWidth="1.4" fill="none" />
      <circle cx="9" cy="16" r="2.2" strokeWidth="1.4" fill="none" />
      <circle cx="13" cy="15" r="2.2" strokeWidth="1.4" fill="none" />
      <circle cx="17" cy="14" r="2.2" strokeWidth="1.4" fill="none" />
      {/* head */}
      <circle cx="20" cy="11" r="2.5" strokeWidth="1.5" fill="none" />
      {/* eyes */}
      <circle cx="19.2" cy="10.2" r="0.5" fill="currentColor" />
      <circle cx="21" cy="10.2" r="0.5" fill="currentColor" />
      {/* smile */}
      <path d="M19 12 Q20 13 21 12" strokeWidth="1.2" fill="none" />
      {/* ground hint */}
      <path d="M2 21 Q12 23 22 21" strokeWidth="1" fill="none" strokeDasharray="2 2" opacity="0.5" />
    </>
  ),
};

const AnimalIcon: React.FC<AnimalIconProps> = ({ animal, className = "", size = 24 }) => {
  const paths = ICONS[animal];

  if (!paths) {
    // Fallback: a simple paw print outline
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        aria-label={animal}
      >
        <circle cx="12" cy="12" r="4" strokeWidth="1.5" />
        <path d="M12 2 Q12 6 12 8" strokeWidth="1.5" />
      </svg>
    );
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-label={animal}
    >
      {paths}
    </svg>
  );
};

export default AnimalIcon;