import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";

export default function ComparePage() {
  return (
    <>
      <SiteNav />
      <main className="mx-auto flex max-w-2xl flex-1 flex-col items-center justify-center px-5 py-32 text-center">
        <h1 className="font-display text-4xl font-extrabold tracking-tight text-ink">
          Comparison tool
        </h1>
        <p className="mt-4 text-ink-2">
          Being ported from the classic site (Phase 5). The live version still
          runs at{" "}
          <a
            href="https://gymgearcompare.com/app.html"
            className="font-medium text-accent underline"
          >
            gymgearcompare.com/app.html
          </a>
          .
        </p>
      </main>
      <SiteFooter />
    </>
  );
}
