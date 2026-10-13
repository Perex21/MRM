/**
 * Page section architecture. Drives navigation, the footer, and the
 * "further chapters" index. A section is `planned` until it has verified
 * content; planned sections render as an honest one-line entry, never filler.
 */

export type SectionId = "work" | "approach" | "capabilities" | "resume" | "contact";

export type Section = {
  id: SectionId;
  /** Chapter number shown in labels; the hero is chapter 01. */
  chapter: string;
  /** Short navigation label. */
  label: string;
  title: string;
  status: "live" | "planned";
  /** What the section will contain once written. */
  plan?: string;
};

export const sections: Section[] = [
  {
    id: "work",
    chapter: "02",
    label: "Work",
    title: "Selected work",
    status: "live",
  },
  {
    id: "approach",
    chapter: "03",
    label: "Approach",
    title: "About & engineering approach",
    status: "planned",
    plan: "Background, working principles, and how engineering decisions get made.",
  },
  {
    id: "capabilities",
    chapter: "04",
    label: "Capabilities",
    title: "Technical capabilities",
    status: "planned",
    plan: "Languages, frameworks, and ML tooling — listed only where real project use backs them.",
  },
  {
    id: "resume",
    chapter: "05",
    label: "Résumé",
    title: "Résumé & professional links",
    status: "planned",
    plan: "A downloadable résumé and verified professional profiles.",
  },
  {
    id: "contact",
    chapter: "06",
    label: "Contact",
    title: "Contact",
    status: "planned",
    plan: "A direct, verified way to get in touch.",
  },
];

export const plannedSections = sections.filter((s) => s.status === "planned");
