import type { Metadata } from "next";
import { Target, Dumbbell, BarChart3, Handshake, Star, Smartphone } from "lucide-react";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "Partner With Us",
  description:
    "Put your brand in front of fitness buyers actively comparing gym equipment, clothing, and supplements.",
};

const FORMSPREE = "https://formspree.io/f/xpznkgqr";

const stats = [
  { n: "250+", l: "Products listed" },
  { n: "29", l: "Categories" },
  { n: "High", l: "Buyer intent" },
  { n: "3", l: "Ad formats" },
];

const reasons = [
  {
    icon: Target,
    title: "High purchase intent",
    body: "Every visitor is actively comparing products to make a buying decision — the highest-intent fitness audience, not casual readers.",
  },
  {
    icon: Dumbbell,
    title: "Fitness-native audience",
    body: "From home-gym builders to competitive athletes — users who trust and respond to brands that show up here.",
  },
  {
    icon: BarChart3,
    title: "Full category coverage",
    body: "Equipment, clothing, and supplements — your brand appears in the right context for every purchase a gym-goer makes.",
  },
  {
    icon: Handshake,
    title: "Affiliate-friendly",
    body: "Already have an affiliate program? We feature your products with tracked links — you only pay for actual sales.",
  },
  {
    icon: Star,
    title: "Featured placement",
    body: "Get listed in our comparison database with a sponsored badge, alongside organic results in your category.",
  },
  {
    icon: Smartphone,
    title: "Mobile-first platform",
    body: "Fully optimized for mobile, where most fitness product research happens. Your ad looks great on every screen.",
  },
];

const field =
  "w-full rounded-lg border border-line bg-white px-3.5 py-2.5 text-sm text-ink outline-none transition-colors focus:border-accent";

export default function SponsorsPage() {
  return (
    <>
      <SiteNav />

      {/* Hero */}
      <section className="bg-navy px-5 py-16 text-center text-white">
        <p className="text-[0.65rem] font-medium uppercase tracking-[0.25em] text-accent">
          Brand partnerships & advertising
        </p>
        <h1 className="mt-3 font-display text-4xl font-extrabold tracking-tight sm:text-5xl">
          Reach buyers ready to spend.
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-white/60">
          Put your brand in front of fitness enthusiasts actively comparing and
          buying gym equipment, clothing, and supplements.
        </p>
        <div className="mx-auto mt-10 grid max-w-2xl grid-cols-2 gap-4 sm:grid-cols-4">
          {stats.map((s) => (
            <div key={s.l} className="rounded-xl border border-white/12 bg-white/5 p-4">
              <div className="font-display text-2xl font-extrabold text-accent">
                {s.n}
              </div>
              <div className="mt-1 text-xs text-white/55">{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Why partner */}
      <section className="mx-auto max-w-6xl px-5 py-16">
        <h2 className="text-center font-display text-3xl font-bold tracking-tight text-ink">
          Why partner with us
        </h2>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {reasons.map((r) => (
            <div
              key={r.title}
              className="rounded-2xl border border-line bg-white p-6 transition-shadow hover:shadow-lg"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent">
                <r.icon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 font-display text-lg font-bold text-ink">
                {r.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-2">{r.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Contact form */}
      <section className="bg-navy px-5 py-16">
        <div className="mx-auto max-w-xl">
          <h2 className="text-center font-display text-3xl font-bold tracking-tight text-white">
            Let&apos;s talk
          </h2>
          <p className="mt-3 text-center text-white/60">
            Tell us about your brand and we&apos;ll get back within two business
            days.
          </p>

          <form
            action={FORMSPREE}
            method="POST"
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
            <button
              type="submit"
              className="w-full rounded-xl bg-accent py-3.5 font-display text-base font-bold text-white shadow-lg shadow-accent/30 transition-all duration-300 hover:-translate-y-0.5 hover:bg-accent-hover hover:shadow-xl hover:shadow-accent/50"
            >
              Send enquiry
            </button>
          </form>
        </div>
      </section>

      <SiteFooter />
    </>
  );
}
