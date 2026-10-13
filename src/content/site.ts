/**
 * Site-wide identity and contact details.
 * Every value here is shown publicly — keep it truthful. Unknowns stay null /
 * empty and are tracked in docs/CONTENT_INVENTORY.md.
 */

export type ProfessionalLink = {
  label: string;
  href: string;
};

export const site = {
  identity: "The Unorthodox Path",
  person: {
    /** EDIT ME: replace with the real name, then set nameIsProvisional to false. */
    name: "Your Name",
    nameIsProvisional: true,
  },
  role: "AI/ML Engineer & Software Developer",
  statement:
    "I build machine-learning systems and the software that carries them into use.",
  description:
    "The Unorthodox Path — portfolio of an AI/ML engineer and software developer.",
  contact: {
    /** Verified public email. While null, no contact action is rendered. */
    email: null as string | null,
  },
  /** Verified professional profiles (GitHub, LinkedIn, …). */
  links: [] as ProfessionalLink[],
};
