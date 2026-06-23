/**
 * Single source of truth for identity, links, and project metadata.
 * Everything user-facing (about pages, footer, docs-in-UI) reads from here so
 * a name or URL is never out of sync across the app.
 */

export const PROFILE = {
  name: "Chanda Charan Reddy",
  shortName: "Charan",
  title: "AI & Automation Engineer",
  location: "Bangalore, India",
  tagline: "I build intelligent systems.",
  email: "charanreddychanda@gmail.com",
  portfolio: "https://www.charanreddy.dev",
  github: "https://github.com/charanreddy-27",
  linkedin: "https://www.linkedin.com/in/chandacharanreddy/",
  calcom: "https://cal.com/charanreddy-27/30min",
  orcid: "https://orcid.org/0009-0003-2414-6717",
  /** Resume currently points at the portfolio; swap for a direct PDF when ready. */
  resume: "https://www.charanreddy.dev",
} as const;

export const PROJECT = {
  name: "Synthesis",
  tagline: "autonomous research engine",
  live: "https://synthesis-charan.vercel.app",
  /** Repo URL — verify the casing/slug matches the actual GitHub repository. */
  repo: "https://github.com/charanreddy-27/synthesis",
  /** Leave empty until the launch post exists; the UI hides the link when blank. */
  linkedinPost: "",
} as const;

/** Ordered links used by the contact card on the About page. */
export const CONTACT_ACTIONS = [
  { label: "Book a call", href: PROFILE.calcom, kind: "primary" as const },
  { label: "Email", href: `mailto:${PROFILE.email}`, kind: "ghost" as const },
  { label: "GitHub", href: PROFILE.github, kind: "ghost" as const },
  { label: "LinkedIn", href: PROFILE.linkedin, kind: "ghost" as const },
  { label: "Resume", href: PROFILE.resume, kind: "ghost" as const },
];

/** Primary site navigation. */
export const NAV = [
  { label: "Run", href: "/" },
  { label: "About", href: "/about" },
  { label: "The Project", href: "/about-project" },
];
