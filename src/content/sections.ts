/**
 * Home-page section architecture. Drives the header, mobile menu and footer,
 * so navigation cannot drift from the page. The hero is chapter 01.
 */

export type SectionId = "work" | "approach" | "capabilities" | "profile" | "contact";

export type Section = {
  id: SectionId;
  chapter: string;
  /** Short navigation label. */
  label: string;
  title: string;
};

export const sections: Section[] = [
  { id: "work", chapter: "02", label: "Work", title: "Selected work" },
  { id: "approach", chapter: "03", label: "Approach", title: "Engineering approach" },
  { id: "capabilities", chapter: "04", label: "Capabilities", title: "Technical capabilities" },
  { id: "profile", chapter: "05", label: "Profile", title: "Professional profile" },
  { id: "contact", chapter: "06", label: "Contact", title: "Contact" },
];

export const section = (id: SectionId): Section => sections.find((s) => s.id === id)!;
