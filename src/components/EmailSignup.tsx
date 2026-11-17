"use client";

import { useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";

/* Deal-alert email form. Posts to /api/subscribe (MailerLite). onDone lets
   the pop-up remember a signup so it never asks again. */
export default function EmailSignup({ id, onDone }: { id: string; onDone?: () => void }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setState("sending");
    setError("");
    const company = new FormData(e.currentTarget).get("company");
    const res = await fetch("/api/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, company }),
    }).catch(() => null);
    const data = res ? await res.json().catch(() => ({})) : {};
    if (res?.ok) {
      setState("done");
      onDone?.();
    } else {
      setState("idle");
      setError(data.error || "We couldn't sign you up just now. Try again in a minute.");
    }
  };

  if (state === "done") {
    return (
      <p role="status" className="flex items-start gap-2 rounded-xl border border-white/15 bg-white/[0.06] p-4 text-white">
        <Check aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
        <span>
          <strong>Almost done.</strong> Check your inbox and tap the link to confirm your email.
        </span>
      </p>
    );
  }

  return (
    <form onSubmit={submit} noValidate>
      <label htmlFor={id} className="sr-only">
        Email address
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          id={id}
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          className="min-h-12 min-w-0 flex-1 rounded-xl border border-white/20 bg-navy-deep px-4 text-base text-white placeholder:text-white/45 focus:border-accent focus:outline-none"
        />
        {/* Honeypot, hidden from people and screen readers. */}
        <input type="text" name="company" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
        <button
          type="submit"
          disabled={state === "sending"}
          className="glow-btn min-h-12 shrink-0 rounded-xl bg-accent px-5 font-bold text-white disabled:opacity-70"
        >
          {state === "sending" ? "Signing up..." : "Email me deals"}
        </button>
      </div>
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-2 text-sm font-bold text-[#ff9a76]">
          {error}
        </p>
      )}
      <p className="mt-2 text-xs text-white/55">
        Only new discounts, no spam. Unsubscribe any time. See our{" "}
        <Link href="/privacy" className="underline underline-offset-2">
          privacy policy
        </Link>
        .
      </p>
    </form>
  );
}
