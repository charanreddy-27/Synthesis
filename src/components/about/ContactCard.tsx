import { CONTACT_ACTIONS, PROFILE } from "@/lib/site";
import { ContactForm } from "@/components/about/ContactForm";
import { Panel } from "@/components/about/ui";
import {
  ArrowIcon,
  CalendarIcon,
  DocIcon,
  GitHubIcon,
  LinkedInIcon,
  MailIcon,
} from "@/components/about/icons";

const ICONS: Record<string, (p: { className?: string }) => React.ReactNode> = {
  "Book a call": CalendarIcon,
  Email: MailIcon,
  GitHub: GitHubIcon,
  LinkedIn: LinkedInIcon,
  Resume: DocIcon,
};

/** The portfolio-style contact block: heading, action buttons, and a form. */
export function ContactCard() {
  return (
    <Panel>
      <p className="font-mono text-[11px] uppercase tracking-widest text-faint">Contact</p>
      <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-text sm:text-3xl">
        Have an idea? Let&rsquo;s talk.
      </h2>
      <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-muted">
        Want to build something — or break something interesting? I&rsquo;m always up for a sharp
        problem. Book a call, send a note, or use the form.
      </p>

      <div className="mt-5 flex flex-wrap gap-2.5">
        {CONTACT_ACTIONS.map((action) => {
          const Icon = ICONS[action.label];
          const isPrimary = action.kind === "primary";
          return (
            <a
              key={action.label}
              href={action.href}
              target={action.href.startsWith("mailto:") ? undefined : "_blank"}
              rel="noreferrer noopener"
              className={`group inline-flex items-center gap-2 rounded-md px-4 py-2 font-mono text-xs uppercase tracking-widest transition-colors ${
                isPrimary
                  ? "bg-accent text-bg hover:opacity-90"
                  : "border border-border text-muted hover:border-accent-dim hover:text-text"
              }`}
            >
              {Icon ? <Icon className="h-4 w-4" /> : null}
              {action.label}
              {isPrimary ? (
                <ArrowIcon className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              ) : null}
            </a>
          );
        })}
      </div>

      <div className="mt-7 border-t border-border pt-6">
        <ContactForm />
      </div>

      <div className="mt-7 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4 font-mono text-[11px] tracking-wide text-faint">
        <span>Crafted with intent.</span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-supported" aria-hidden />
          Available for new projects
        </span>
      </div>
      <p className="mt-3 font-mono text-[11px] text-faint">
        Or just email{" "}
        <a href={`mailto:${PROFILE.email}`} className="link-accent">
          {PROFILE.email}
        </a>
        .
      </p>
    </Panel>
  );
}
