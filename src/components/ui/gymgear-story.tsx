"use client";

import FlowArt, { FlowSection } from "@/components/ui/story-scroll";

const HEADLINE =
  "font-display text-[clamp(3rem,11vw,11rem)] font-extrabold uppercase leading-[0.85] tracking-tight";
const BODY = "text-[clamp(1rem,2.2vw,1.75rem)] font-normal leading-relaxed";
const EYEBROW = "text-xs font-bold uppercase tracking-[0.25em]";
const COL = "min-w-[170px] flex-1";
const COL_H = "mb-1.5 text-sm font-bold uppercase tracking-wider";
const COL_B = "text-[clamp(0.85rem,1.2vw,1rem)] leading-relaxed";

/* GymGear's scroll story — full-screen panels that pin and peel as you scroll
   (see ui/story-scroll). Content and colours are ours; the effect is the hook
   that pulls people down the homepage. */
export default function GymGearStory() {
  return (
    <FlowArt aria-label="Why GymGear Compare">
      {/* 01 — the problem */}
      <FlowSection
        aria-label="The problem"
        style={{ backgroundColor: "#0d1b35", color: "#fff" }}
      >
        <p className={`${EYEBROW} text-white/55`}>01 — The problem</p>
        <hr className="my-[2vw] border-t border-white/15" />
        <h2 className={HEADLINE}>
          Too
          <br />
          many
          <br />
          <span className="text-accent">choices</span>
        </h2>
        <hr className="my-[2vw] border-t border-white/15" />
        <p className={`mt-auto max-w-[46ch] text-white/70 ${BODY}`}>
          160 products, twenty browser tabs, and every spec sheet looking the
          same. Starting a home gym shouldn&rsquo;t take a research project.
        </p>
      </FlowSection>

      {/* 02 — the answer */}
      <FlowSection
        aria-label="One honest number"
        style={{ backgroundColor: "#f0531e", color: "#fff" }}
      >
        <p className={`${EYEBROW} text-white/85`}>02 — Our answer</p>
        <hr className="my-[2vw] border-t border-white/30" />
        <h2 className={HEADLINE}>
          One
          <br />
          honest
          <br />
          number
        </h2>
        <hr className="my-[2vw] border-t border-white/30" />
        <p className={`max-w-[46ch] text-white/90 ${BODY}`}>
          The GymGear Score rates every piece on build quality, owner rating,
          value, and review confidence. No brand can pay to rank higher.
        </p>
        <hr className="my-[2vw] border-t border-white/30" />
        <div className="flex flex-wrap gap-[3vw]">
          {[
            ["Build", "How it's made, and how long it lasts."],
            ["Value", "Quality per dollar, judged within its class."],
            ["Trust", "How many real owners back the rating."],
          ].map(([h, b]) => (
            <div key={h} className={COL}>
              <p className={COL_H}>{h}</p>
              <p className={`${COL_B} text-white/85`}>{b}</p>
            </div>
          ))}
        </div>
      </FlowSection>

      {/* 03 — how it works */}
      <FlowSection
        aria-label="How it works"
        style={{ backgroundColor: "#f8f7f5", color: "#131009" }}
      >
        <p className={`${EYEBROW} text-accent`}>03 — How it works</p>
        <hr className="my-[2vw] border-t border-black/10" />
        <h2 className={`${HEADLINE} text-ink`}>
          Built
          <br />
          for
          <br />
          you
        </h2>
        <hr className="my-[2vw] border-t border-black/10" />
        <div className="flex flex-wrap gap-[3vw]">
          {[
            ["01 — Answer", "Five questions on your goal, budget, and space. Under a minute."],
            ["02 — Build", "AI assembles three kits: Best Value, Best Match, Best Quality."],
            ["03 — Buy", "Swap anything, then buy direct. Same price, zero markup."],
          ].map(([h, b]) => (
            <div key={h} className={COL}>
              <p className={`${COL_H} text-ink`}>{h}</p>
              <p className={`${COL_B} text-ink-2`}>{b}</p>
            </div>
          ))}
        </div>
        <hr className="my-[2vw] border-t border-black/10" />
        <p className={`mt-auto max-w-[46ch] text-ink-2 ${BODY}`}>
          No account. No noise. A complete gym built around the space and budget
          you actually have.
        </p>
      </FlowSection>

      {/* 04 — the payoff */}
      <FlowSection
        aria-label="The payoff"
        style={{ backgroundColor: "#081124", color: "#fff" }}
      >
        <p className={`${EYEBROW} text-white/55`}>04 — The payoff</p>
        <hr className="my-[2vw] border-t border-white/15" />
        <h2 className={HEADLINE}>
          Your gym,
          <br />
          <span className="text-accent">sorted</span>
        </h2>
        <hr className="my-[2vw] border-t border-white/15" />
        <p className={`mt-auto max-w-[46ch] text-white/70 ${BODY}`}>
          Everything you need to start, nothing you don&rsquo;t. The hardest part
          of getting in shape — figuring out where to begin — handled in a
          minute.
        </p>
      </FlowSection>
    </FlowArt>
  );
}
