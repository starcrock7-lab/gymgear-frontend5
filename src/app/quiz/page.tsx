import Link from "next/link";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";

export default function QuizPage() {
  return (
    <>
      <SiteNav />
      <main className="mx-auto flex max-w-2xl flex-1 flex-col items-center justify-center px-5 py-32 text-center">
        <h1 className="font-display text-4xl font-extrabold tracking-tight text-ink">
          The kit builder is coming.
        </h1>
        <p className="mt-4 text-ink-2">
          Five questions, three personalized kits. This is the next thing we
          ship. Until then, the comparison tool has you covered.
        </p>
        <Link
          href="/compare"
          className="mt-8 rounded-xl bg-accent px-6 py-3 font-display font-bold text-white transition-colors hover:bg-accent-hover"
        >
          Compare products instead →
        </Link>
      </main>
      <SiteFooter />
    </>
  );
}
