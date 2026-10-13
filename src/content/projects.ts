/**
 * Project archive content.
 *
 * Truthfulness rule: only `title` is confirmed for each project. `summary` and
 * `domain` restate the title and add nothing beyond it. Optional fields stay
 * undefined until verified — the UI omits whatever is missing.
 * Open questions are listed in docs/CONTENT_INVENTORY.md.
 */

export type ProjectLink = {
  label: string;
  href: string;
};

export type Project = {
  slug: string;
  title: string;
  /** One sentence. Must not claim anything unverified. */
  summary: string;
  /** Broad subject area, derivable from the title. */
  domain: string;
  role?: string;
  /** Technologies actually used. */
  stack?: string[];
  /** Verified, measurable results only. */
  outcomes?: string[];
  links?: ProjectLink[];
  caseStudyReady: boolean;
};

export const projects: Project[] = [
  {
    slug: "hybrid-phishing-detection",
    title: "Hybrid Phishing Detection Platform",
    summary: "A platform for detecting phishing, built on a hybrid detection approach.",
    domain: "Security",
    caseStudyReady: false,
  },
  {
    slug: "gst-audit-compliance",
    title: "AI-powered GST Audit & Compliance Platform",
    summary: "A platform that applies AI to GST audit and compliance work.",
    domain: "AI · Tax compliance",
    caseStudyReady: false,
  },
  {
    slug: "echoss-studio",
    title: "ECHOSS STUDIO website",
    summary: "The website for ECHOSS STUDIO.",
    domain: "Web",
    caseStudyReady: false,
  },
];
