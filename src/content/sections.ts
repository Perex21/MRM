/**
 * Home-page section architecture, in the order the journey travels. Drives the
 * header, mobile menu, footer and the scroll-driven world, so navigation cannot
 * drift from the page. The hero (the Arrival) is chapter 01.
 */

export type SectionId = "work" | "approach" | "capabilities" | "profile" | "contact";

export type Section = {
  id: SectionId;
  chapter: string;
  /** Short navigation label. */
  label: string;
  title: string;
  /** Name of this stage of the journey, shown as the section's eyebrow. */
  scene: string;
};

/** In journey order: the archive, the path, the disciplines, the record, the destination. */
export const sections: Section[] = [
  { id: "work", chapter: "02", label: "Work", title: "Selected work", scene: "The Archive" },
  { id: "approach", chapter: "03", label: "Approach", title: "Engineering approach", scene: "The Path" },
  { id: "capabilities", chapter: "04", label: "Capabilities", title: "Technical capabilities", scene: "The Disciplines" },
  { id: "profile", chapter: "05", label: "Profile", title: "Professional profile", scene: "The Record" },
  { id: "contact", chapter: "06", label: "Contact", title: "Contact", scene: "The Destination" },
];

export const section = (id: SectionId): Section => sections.find((s) => s.id === id)!;
