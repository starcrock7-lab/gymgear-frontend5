import type { Metadata } from "next";
import { Mail } from "lucide-react";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Reach GymGear Compare with corrections, product suggestions, partnership questions, or feedback on a score.",
  alternates: { canonical: "/contact" },
};

/* TODO(Roe): point CONTACT_EMAIL at a mailbox you actually read — either set up
   forwarding for hello@gymgearcompare.com, or swap in your own address. */
const CONTACT_EMAIL = "hello@gymgearcompare.com";

export default function ContactPage() {
  return (
    <>
      <SiteNav />
      <main className="min-h-[70vh] bg-off">
        <section className="bg-navy px-5 py-14 text-center text-white">
          <h1 className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl">
            Get in touch
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-white/60">
            Real replies from a real person. We read everything.
          </p>
        </section>

        <div className="mx-auto max-w-2xl px-5 py-12">
          <p className="leading-relaxed text-ink-2">
            Whether it&rsquo;s a correction, a product we should be scoring, a
            disagreement with a ranking, or a partnership question — send it
            over. Feedback on the scores is especially welcome; it&rsquo;s how
            the rubric gets sharper.
          </p>

          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="mt-8 flex items-center justify-center gap-2 rounded-xl border border-line bg-white px-6 py-4 font-display text-lg font-bold text-ink transition-colors hover:border-accent/40"
          >
            <Mail className="h-5 w-5 text-accent" />
            {CONTACT_EMAIL}
          </a>

          <div className="mt-10 space-y-4 text-sm leading-relaxed text-ink-2">
            <div>
              <p className="font-bold text-ink">Corrections &amp; accuracy</p>
              <p className="mt-1">
                Spotted a wrong spec or a stale price? Tell us the product and
                what&rsquo;s off — we&rsquo;ll fix it.
              </p>
            </div>
            <div>
              <p className="font-bold text-ink">Brands &amp; partnerships</p>
              <p className="mt-1">
                We feature products on merit, never paid placement. Affiliate
                partnerships don&rsquo;t change a score — see our{" "}
                <a href="/disclosure" className="text-accent underline">
                  disclosure
                </a>
                .
              </p>
            </div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
