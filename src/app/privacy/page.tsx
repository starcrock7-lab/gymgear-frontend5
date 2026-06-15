import type { Metadata } from "next";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "Privacy Policy — GymGear Compare",
  description:
    "How GymGear Compare collects, uses, and protects your information.",
};

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-10 first:mt-0">
      <h2 className="border-b border-line pb-2 font-display text-xl font-bold text-ink">
        {title}
      </h2>
      <div className="mt-3 space-y-3 text-[0.95rem] leading-relaxed text-ink-2">
        {children}
      </div>
    </section>
  );
}

const MAIL = "roei.karpik@gmail.com";

export default function PrivacyPage() {
  return (
    <>
      <SiteNav />

      <section className="bg-navy px-5 py-16 text-center text-white">
        <h1 className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl">
          Privacy Policy
        </h1>
        <p className="mt-3 text-white/60">
          How we collect, use, and protect your information.
        </p>
      </section>

      <main className="mx-auto max-w-3xl px-5 py-14">
        <p className="mb-8 inline-block rounded-lg border border-line bg-white px-4 py-2 text-sm text-ink-3">
          Last updated: June 8, 2026
        </p>

        <Section title="Who We Are">
          <p>
            GymGear Compare (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;)
            operates gymgearcompare.com — a free, independent gym equipment,
            clothing, and supplement comparison tool. We are not affiliated with
            any brand or retailer we feature.
          </p>
        </Section>

        <Section title="Information We Collect">
          <p>We collect minimal information to operate the site:</p>
          <ul className="ml-5 list-disc space-y-1.5">
            <li>
              <strong className="text-ink">Usage data</strong> — pages visited,
              time on site, browser and device type, collected automatically via
              Google Analytics 4.
            </li>
            <li>
              <strong className="text-ink">Email address</strong> — only if you
              voluntarily subscribe or submit the partner contact form.
            </li>
            <li>
              <strong className="text-ink">Cookies</strong> — small text files
              placed on your device by us or third parties (see below).
            </li>
          </ul>
          <p>
            We do not collect your name, payment information, or any sensitive
            personal data.
          </p>
        </Section>

        <Section title="How We Use Your Information">
          <ul className="ml-5 list-disc space-y-1.5">
            <li>To analyse site traffic and improve the experience</li>
            <li>To send deal alerts or updates if you subscribed</li>
            <li>To respond to partnership enquiries</li>
          </ul>
          <p>We never sell your data to third parties.</p>
        </Section>

        <Section title="Affiliate Links & Advertising">
          <p>
            GymGear Compare participates in affiliate programmes including the
            Amazon Associates Programme. When you click a &quot;Buy&quot; button
            and make a purchase, we may earn a small commission at no extra cost
            to you.
          </p>
          <p>
            Affiliate relationships never influence our rankings or comparison
            results. Verdicts are generated independently based on specs, price,
            and customer ratings.
          </p>
        </Section>

        <Section title="Cookies & Third-Party Services">
          <p>
            We use Google Analytics (anonymous usage stats), Google AdSense
            (advertising), Formspree (contact form), Amazon Associates
            (affiliate programme), and Render/Vercel (hosting). Each has its own
            privacy policy. You can disable cookies in your browser settings at
            any time.
          </p>
        </Section>

        <Section title="Your Rights">
          <p>You have the right to:</p>
          <ul className="ml-5 list-disc space-y-1.5">
            <li>Request access to any personal data we hold about you</li>
            <li>Request deletion of your data</li>
            <li>Unsubscribe from emails at any time</li>
            <li>Opt out of Google Analytics tracking</li>
          </ul>
          <p>
            To exercise any of these rights, email us at{" "}
            <a href={`mailto:${MAIL}`} className="font-medium text-accent underline">
              {MAIL}
            </a>
            .
          </p>
        </Section>

        <Section title="Children's Privacy">
          <p>
            GymGear Compare is not directed at children under 13, and we do not
            knowingly collect personal information from children.
          </p>
        </Section>

        <Section title="Changes & Contact">
          <p>
            We may update this policy from time to time; the &quot;Last
            updated&quot; date reflects any changes. For any privacy question,
            email{" "}
            <a href={`mailto:${MAIL}`} className="font-medium text-accent underline">
              {MAIL}
            </a>
            .
          </p>
        </Section>
      </main>

      <SiteFooter />
    </>
  );
}
