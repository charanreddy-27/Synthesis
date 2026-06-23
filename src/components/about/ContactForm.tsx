"use client";

import { useState } from "react";
import { PROFILE } from "@/lib/site";

type Status = "idle" | "error" | "sent";

/**
 * Name / Email / Message form. No backend required: it composes a pre-filled
 * mailto so it works the moment the site is deployed, with graceful validation.
 */
export function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<Status>("idle");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) {
      setStatus("error");
      return;
    }
    const subject = encodeURIComponent(`Synthesis — message from ${name.trim()}`);
    const body = encodeURIComponent(`${message.trim()}\n\n— ${name.trim()} (${email.trim()})`);
    window.location.href = `mailto:${PROFILE.email}?subject=${subject}&body=${body}`;
    setStatus("sent");
  };

  return (
    <form onSubmit={submit} className="space-y-3" noValidate>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          id="contact-name"
          label="Name"
          value={name}
          onChange={setName}
          autoComplete="name"
          placeholder="Your name"
        />
        <Field
          id="contact-email"
          label="Email"
          type="email"
          value={email}
          onChange={setEmail}
          autoComplete="email"
          inputMode="email"
          placeholder="you@example.com"
        />
      </div>
      <div>
        <label
          htmlFor="contact-message"
          className="mb-1.5 block font-mono text-[11px] uppercase tracking-widest text-muted"
        >
          Message
        </label>
        <textarea
          id="contact-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={4}
          placeholder="What are you building?"
          className="w-full resize-none rounded-lg border border-border bg-surface/60 px-3 py-2.5 font-sans text-[15px] leading-relaxed text-text outline-none transition-colors placeholder:text-faint hover:border-accent-dim focus:border-accent"
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          className="cursor-pointer rounded-md bg-accent px-5 py-2 font-mono text-xs font-semibold uppercase tracking-widest text-bg transition-opacity hover:opacity-90"
        >
          Send message
        </button>
        {status === "error" ? (
          <span role="alert" className="font-mono text-[11px] text-disputed">
            Fill in all three fields.
          </span>
        ) : null}
        {status === "sent" ? (
          <span role="status" className="font-mono text-[11px] text-supported">
            Opening your email client…
          </span>
        ) : null}
      </div>
    </form>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  type = "text",
  ...rest
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  autoComplete?: string;
  inputMode?: "email" | "text";
  placeholder?: string;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block font-mono text-[11px] uppercase tracking-widest text-muted"
      >
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-border bg-surface/60 px-3 py-2.5 font-sans text-[15px] text-text outline-none transition-colors placeholder:text-faint hover:border-accent-dim focus:border-accent"
        {...rest}
      />
    </div>
  );
}
