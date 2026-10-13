/**
 * Site-wide identity, links and configuration. The single place to edit
 * personal details. Every value is shown publicly — keep it truthful.
 * Where each value came from is recorded in docs/CONTENT_INVENTORY.md.
 */

export type ExternalLink = {
  label: string;
  href: string;
  /** What a visitor finds there. */
  note: string;
};

const github: ExternalLink = {
  label: "GitHub",
  href: "https://github.com/Perex21",
  note: "Source code for the projects in this archive.",
};

const linkedin: ExternalLink = {
  label: "LinkedIn",
  href: "https://www.linkedin.com/in/sathvik-madupoju/",
  note: "Professional profile and direct messages.",
};

export const site = {
  identity: "The Unorthodox Path",
  /**
   * Canonical origin, used for metadata, the sitemap and robots.
   * Set NEXT_PUBLIC_SITE_URL when a domain exists.
   */
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  person: {
    /** Public display name, as shown on the owner's GitHub profile. */
    name: "Sathvik M",
  },
  role: "AI/ML Engineer & Software Developer",
  /** Adapted from the owner's own GitHub bio. */
  statement:
    "I build agentic systems and AI-powered products for automation, cybersecurity and other real-world problems.",
  description:
    "Portfolio of Sathvik M, an AI/ML engineer and software developer: phishing detection, GST audit tooling and web engineering, with full case studies.",
  /** Areas the owner lists as current focus on GitHub. Interests, not evidenced claims. */
  focus: [
    "Agentic systems and multi-agent workflows",
    "Retrieval-augmented generation",
    "Workflow automation",
    "Cybersecurity applications",
    "Compliance technology",
  ],
  contact: {
    /** Where "get in touch" actions point. */
    primary: linkedin,
    /**
     * Optional public email. While null, no mailto link is rendered anywhere.
     * Set it only if you want the address on this site.
     */
    email: null as string | null,
  },
  links: [github, linkedin],
  /** Public path of a résumé PDF placed in /public, e.g. "/resume.pdf". Hidden while null. */
  resume: null as string | null,
};
