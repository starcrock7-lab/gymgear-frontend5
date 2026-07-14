"use client";

/* Sponsors enquiry form. Submits to Formspree via fetch (Accept: JSON) so
   the visitor gets an on-brand inline loading → success/error state instead
   of a hard redirect to Formspree's generic thank-you page. */

import { useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";

const FORMSPREE = "https://formspree.io/f/xkoekoqq";

const field =
  "w-full rounded-lg border border-line bg-card px-3.5 py-2.5 text-sm text-ink outline-none transition-colors focus:border-accent";

export default function SponsorForm() {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setStatus("sending");
    try {
      const r = await fetch(FORMSPREE, {
        method: "POST",
        headers: { Accept: "application/json" },
        body: new FormData(form),
      });
      if (!r.ok) throw new Error(String(r.status));
      form.reset();
      setStatus("sent");
    } catch {
      setStatus("error");
    }
  }

  if (status === "sent") {
    return (
      <div className="gg-pop-in mt-8 rounded-2xl border border-win/40 bg-white/[0.04] p-8 text-center">
        <CheckCircle2 className="mx-auto h-10 w-10 text-win" />
        <h3 className="mt-4 font-display text-xl font-bold text-white">Enquiry sent</h3>
        <p className="mt-2 text-sm text-white/60">
          Thanks — we&apos;ll get back to you within two business days.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="mt-8 space-y-4 rounded-2xl border border-white/12 bg-white/[0.04] p-6"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <input name="firstName" required placeholder="First name" className={field} />
        <input name="lastName" placeholder="Last name" className={field} />
      </div>
      <input
        name="email"
        type="email"
        required
        placeholder="Work email"
        className={field}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <input name="company" required placeholder="Company" className={field} />
        <input name="website" placeholder="Website" className={field} />
      </div>
      <select name="interest" defaultValue="" className={field} required>
        <option value="" disabled>
          I&apos;m interested in…
        </option>
        <option>Featured product placement</option>
        <option>Banner / display advertising</option>
        <option>Affiliate partnership</option>
        <option>Something else</option>
      </select>
      <textarea
        name="message"
        rows={4}
        placeholder="Tell us about your brand and goals…"
        className={field}
      />
      {status === "error" ? (
        <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-400">
          That didn&apos;t send — check your connection and try again.
        </p>
      ) : null}
      <button
        type="submit"
        disabled={status === "sending"}
        className="w-full rounded-xl bg-accent py-3.5 font-display text-base font-bold text-white shadow-lg shadow-accent/30 transition-shadow duration-300 hover:bg-accent-hover hover:shadow-[0_0_26px_rgba(240,83,30,0.55)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {status === "sending" ? (
          <Loader2 className="mx-auto h-5 w-5 animate-spin" />
        ) : (
          "Send enquiry"
        )}
      </button>
    </form>
  );
}
