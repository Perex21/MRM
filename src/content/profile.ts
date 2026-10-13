/**
 * Engineering approach and technical capabilities.
 * Each principle and capability points at the project that demonstrates it;
 * nothing is listed that the archive cannot back up.
 */

import type { ProjectSlug } from "./projects";

export type Principle = {
  title: string;
  body: string;
  /** Where the practice shows up in the work. */
  seenIn: { slug: ProjectSlug; note: string };
};

export const principles: Principle[] = [
  {
    title: "Start from the problem, not the tool",
    body: "Before choosing a model or a framework I want to know what actually arrives at the system and who has to act on what comes out.",
    seenIn: {
      slug: "hybrid-phishing-detection",
      note: "Phishing reaches people as links, messages and screenshots, so the platform accepts all three.",
    },
  },
  {
    title: "Break the system into parts that stand alone",
    body: "A component I can run, test and reason about by itself is one I can replace without fear. Boundaries come before features.",
    seenIn: {
      slug: "gst-audit-compliance",
      note: "The analysis engine knows nothing about HTTP; the API layer knows nothing about tax rules.",
    },
  },
  {
    title: "Let deterministic logic lead and models assist",
    body: "Rules and arithmetic give answers that can be checked. Models add judgement on top, within limits, and the system must still work when they fail.",
    seenIn: {
      slug: "hybrid-phishing-detection",
      note: "Classifiers adjust a heuristic score but cannot push a URL into high risk on their own.",
    },
  },
  {
    title: "Design the failure case",
    body: "The state where something is missing, slow or broken deserves the same care as the state where everything works.",
    seenIn: {
      slug: "echoss-studio",
      note: "An unconfigured enquiry form says it cannot send, rather than showing a success it did not have.",
    },
  },
  {
    title: "Name the limits",
    body: "A prototype is more useful when it is honest about what is stubbed, simulated or untested. Each case study here ends with its limitations.",
    seenIn: {
      slug: "gst-audit-compliance",
      note: "Rule checks are presented as a demonstration of selected provisions, not as a compliance guarantee.",
    },
  },
];

export type Capability = {
  name: string;
  /** Projects in the archive that use it. */
  usedIn: ProjectSlug[];
};

export type CapabilityGroup = {
  group: string;
  summary: string;
  items: Capability[];
};

const phishing: ProjectSlug = "hybrid-phishing-detection";
const gst: ProjectSlug = "gst-audit-compliance";
const echoss: ProjectSlug = "echoss-studio";

export const capabilityGroups: CapabilityGroup[] = [
  {
    group: "Languages",
    summary: "What the systems are written in.",
    items: [
      { name: "Python", usedIn: [phishing, gst] },
      { name: "JavaScript", usedIn: [phishing, gst] },
      { name: "TypeScript", usedIn: [echoss] },
    ],
  },
  {
    group: "Machine learning and AI",
    summary: "Classical models, pretrained transformers and language-model integration.",
    items: [
      { name: "scikit-learn: Random Forest, TF-IDF", usedIn: [phishing] },
      { name: "Hugging Face Transformers: classification, zero-shot", usedIn: [phishing] },
      { name: "Feature engineering for URLs", usedIn: [phishing] },
      { name: "OCR with Tesseract", usedIn: [phishing] },
      { name: "LLM integration with the Gemini API", usedIn: [gst] },
    ],
  },
  {
    group: "Backend and data",
    summary: "Services, file handling and tabular analysis.",
    items: [
      { name: "FastAPI and REST API design", usedIn: [phishing, gst] },
      { name: "pandas: cleaning, merging, reconciliation", usedIn: [gst] },
      { name: "Fuzzy matching", usedIn: [gst] },
      { name: "Upload validation and caching", usedIn: [phishing] },
    ],
  },
  {
    group: "Frontend",
    summary: "Interfaces for the systems above, and sites in their own right.",
    items: [
      { name: "React", usedIn: [phishing, gst, echoss] },
      { name: "Next.js App Router", usedIn: [echoss] },
      { name: "Tailwind CSS", usedIn: [phishing, gst, echoss] },
      { name: "Vite", usedIn: [phishing, gst] },
      { name: "Data visualisation with Recharts", usedIn: [phishing] },
    ],
  },
  {
    group: "Motion and 3D",
    summary: "Animation that respects performance budgets and motion preferences.",
    items: [
      { name: "Motion for React", usedIn: [echoss] },
      { name: "GSAP ScrollTrigger", usedIn: [echoss] },
      { name: "three.js with React Three Fiber", usedIn: [echoss] },
    ],
  },
];
