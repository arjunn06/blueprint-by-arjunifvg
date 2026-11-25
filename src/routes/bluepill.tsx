import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useSpring } from "motion/react";
import {
  ArrowRight,
  BroadcastIcon,
  ChatsCircleIcon,
  ClockCounterClockwiseIcon,
  DiscordLogoIcon,
  GiftIcon,
  GoogleLogoIcon,
  NotePencilIcon,
  PlayCircleIcon,
  ProhibitIcon,
  VideoCameraIcon,
} from "@phosphor-icons/react";
import type { Icon } from "@phosphor-icons/react";
import { SiteShell, SiteNav, SiteFooter } from "@/components/site/shell";
import { Reveal, Rise } from "@/components/site/reveal";
import { PillCapsule } from "@/components/site/pill-capsule";
import { MobileCtaBar } from "@/components/site/mobile-cta";
import { Faq } from "@/components/site/faq";
import { btnLink, btnPrimary, btnSm, container } from "@/components/site/ui";
import {
  BLACK_FRIDAY_CODE,
  BLACK_FRIDAY_PERCENT,
  FIRST_MONTH_PRICE,
  LIST_PRICE,
  setPendingPromo,
} from "@/lib/offer";

const TITLE = `The Blue Pill 2.0 | Black Friday: ${BLACK_FRIDAY_PERCENT}% off your first month | Blueprint`;
const SHARE = `Black Friday: ${BLACK_FRIDAY_PERCENT}% off your first month of The Blue Pill 2.0. ${FIRST_MONTH_PRICE} for the first month, then ${LIST_PRICE}/month.`;
const CLAIM = `Claim ${BLACK_FRIDAY_PERCENT}% off`;

export const Route = createFileRoute("/bluepill")({
  head: () => ({
    meta: [
      { title: TITLE },
      {
        name: "description",
        content: `${SHARE} A free Trading Journal, Red Pill session recaps, a weekly Red Pill livestream and the members-only Discord.`,
      },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: SHARE },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://blueprint.ifvg.in/bluepill" },
      { property: "og:image", content: "https://blueprint.ifvg.in/og-bluepill.jpg" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: SHARE },
      { name: "twitter:image", content: "https://blueprint.ifvg.in/og-bluepill.jpg" },
    ],
    links: [{ rel: "canonical", href: "https://blueprint.ifvg.in/bluepill" }],
  }),
  component: BluePill,
});

/** Remember the offer through sign-in; the subscribe page applies it. */
const claim = () => setPendingPromo(BLACK_FRIDAY_CODE);

const PHASES = [
  {
    name: "Foundation",
    modules: [
      { n: "01", t: "Introduction to Trading" },
      { n: "02", t: "Introduction to Market Profiles" },
      { n: "03", t: "Navigate TradingView for Beginners" },
    ],
  },
  {
    name: "Core model",
    modules: [
      { n: "04", t: "What are PD Arrays" },
      { n: "05", t: "Optimal Trade Entries and ICT Fibonacci" },
      { n: "06", t: "Importance of Time and Price" },
      { n: "07", t: "The IFVG Model, explained with examples" },
      { n: "08", t: "How to use SMT Divergences" },
    ],
  },
  {
    name: "Advanced",
    modules: [{ n: "09", t: "Futures and Forex Prop Firm Rules" }],
  },
];

type NewItem = {
  icon: Icon;
  title: string;
  body: string;
  span: string;
  tone?: "feature" | "solid";
};

const NEW_IN_2: NewItem[] = [
  {
    icon: NotePencilIcon,
    title: "A free Trading Journal",
    body: "A Trading Journal subscription now comes with your Blue Pill, at no extra cost.",
    span: "lg:col-span-7",
    tone: "feature",
  },
  {
    icon: ClockCounterClockwiseIcon,
    title: "Red Pill session recaps",
    body: "Exclusive recaps from The Red Pill's live trading sessions.",
    span: "lg:col-span-5",
  },
  {
    icon: BroadcastIcon,
    title: "A Red Pill livestream every week",
    body: "Sit in on one live Red Pill stream each week.",
    span: "lg:col-span-4",
  },
  {
    icon: VideoCameraIcon,
    title: "New premium videos",
    body: "Fresh, exclusive educational videos, posted for members.",
    span: "lg:col-span-4",
  },
  {
    icon: GiftIcon,
    title: "Monthly funded account giveaways",
    body: "Exclusive to members, every month.",
    span: "lg:col-span-4",
    tone: "solid",
  },
  {
    icon: GoogleLogoIcon,
    title: "Sign in with Google",
    body: "Join, and sign back in, with your Google account.",
    span: "lg:col-span-6",
  },
];

const KEPT = [
  {
    icon: PlayCircleIcon,
    title: "Every recording, uncut",
    body: "Premium IFVG education straight from the Red Pill sessions. Even absolute beginners can follow it.",
  },
  {
    icon: DiscordLogoIcon,
    title: "Trade alerts and the Discord",
    body: "Setups Arjun personally takes, posted live, with your Blue Pill role.",
  },
  {
    icon: BroadcastIcon,
    title: "Live trading streams",
    body: "Exclusive streams, including high impact news events.",
  },
  {
    icon: ChatsCircleIcon,
    title: "One private call a month",
    body: "One-to-one time with Arjun, booked from your member panel.",
  },
  {
    icon: ProhibitIcon,
    title: "Cancel anytime",
    body: "No lock-in.",
  },
];

const FAQ = [
  {
    q: `How do I get ${BLACK_FRIDAY_PERCENT}% off?`,
    a: `Press "${CLAIM}" and create your account. Code ${BLACK_FRIDAY_CODE} is applied to your first payment at checkout. If it isn't, type it into the coupon field.`,
  },
  {
    q: "What do I pay after the first month?",
    a: `${LIST_PRICE} a month, billed monthly and securely through Razorpay. The ${BLACK_FRIDAY_PERCENT}% off covers the first month only.`,
  },
  {
    q: "Can I cancel?",
    a: "Yes, anytime. There is no lock-in.",
  },
  {
    q: "How do I sign in?",
    a: "With your Google account, or with a one-time code sent to your email.",
  },
  {
    q: "Is the Red Pill part of this?",
    a: "No. The Red Pill is the live mentorship. The Blue Pill 2.0 adds recaps of its live trading sessions and one Red Pill livestream a week.",
  },
];

function BluePill() {
  const heroEnd = useRef<HTMLDivElement>(null);
  return (
    <SiteShell theme="dark">
      <SiteNav
        cta={
          <Link to="/auth" onClick={claim} className={`${btnPrimary} ${btnSm}`}>
            {CLAIM}
          </Link>
        }
      />
      <main id="main">
        <Hero endRef={heroEnd} />
        <WhatsNew />
        <Kept />
        <Curriculum />
        <Questions />
        <Close />
      </main>
      <SiteFooter />
      <MobileCtaBar sentinel={heroEnd}>
        <Link to="/auth" onClick={claim} className={`${btnPrimary} w-full`}>
          {CLAIM} · {FIRST_MONTH_PRICE} first month
        </Link>
      </MobileCtaBar>
    </SiteShell>
  );
}

/* ------------------------------------------------------------------ */

function Hero({ endRef }: { endRef: React.RefObject<HTMLDivElement | null> }) {
  return (
    <section className="relative">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[720px] bg-[radial-gradient(900px_480px_at_82%_-8%,hsl(214_90%_66%/0.16),transparent_70%)]"
      />
      <div
        className={`${container} relative grid items-center gap-14 py-14 lg:min-h-[calc(100dvh-4rem)] lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:py-16`}
      >
        <div>
          <Rise i={0}>
            <p className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3.5 py-1.5 text-hint font-medium text-foreground">
              <span aria-hidden className="size-1.5 rounded-full bg-active" />
              Black Friday offer
            </p>
          </Rise>
          <Rise i={1}>
            <h1 className="mt-6 font-display text-[clamp(2.5rem,5.4vw,4.3rem)] font-medium leading-[1.04] tracking-[-0.02em]">
              <span className="text-foreground/50">The Blue Pill 2.0 is here.</span> Get your first
              month at half price.
            </h1>
          </Rise>
          <Rise i={2}>
            <p className="mt-6 max-w-[48ch] text-lg leading-relaxed text-muted-foreground">
              The IFVG trading community, now with a free Trading Journal, Red Pill session recaps
              and a Red Pill livestream every week. Your first month is {FIRST_MONTH_PRICE}, then{" "}
              {LIST_PRICE} a month.
            </p>
          </Rise>
          <Rise i={3} className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-4">
            <Link to="/auth" onClick={claim} className={btnPrimary}>
              {CLAIM}
              <ArrowRight className="size-4" weight="bold" />
            </Link>
            <a href="#whats-new" className={btnLink}>
              See what is new in 2.0
            </a>
          </Rise>
        </div>

        <Rise i={3} className="w-full">
          <OfferCard />
        </Rise>
      </div>
      <div ref={endRef} aria-hidden className="h-px" />
    </section>
  );
}

function OfferCard() {
  return (
    <div
      className="relative mx-auto w-full max-w-[560px] overflow-hidden rounded-shell border border-active/25 p-7 sm:p-10 lg:max-w-none"
      style={{
        background:
          "radial-gradient(560px 340px at 100% 0%, hsl(214 90% 66% / 0.18), transparent 65%), linear-gradient(180deg, var(--blue-10), var(--surface))",
      }}
    >
      <PillCapsule
        tone="blue"
        className="absolute right-6 top-7 w-20 rotate-[20deg] sm:right-10 sm:top-10 sm:w-32"
      />
      <p className="text-hint font-medium uppercase tracking-[0.12em] text-muted-foreground">
        The Blue Pill 2.0
      </p>
      <p className="mt-12 font-display tabular text-[clamp(6.5rem,13vw,10.5rem)] font-medium leading-[0.86] tracking-[-0.04em]">
        {BLACK_FRIDAY_PERCENT}
        <span className="text-active">%</span>
        <span className="ml-3 font-sans text-[0.22em] font-normal tracking-normal text-muted-foreground">
          off
        </span>
      </p>
      <p className="mt-4 font-display text-2xl font-medium tracking-[-0.02em]">your first month.</p>

      <dl className="mt-9 border-y border-border">
        <div className="flex flex-col gap-1 py-4 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
          <dt className="text-body text-muted-foreground">First month</dt>
          <dd className="sm:text-right">
            <s className="mr-3 text-body text-muted-foreground">
              <span className="sr-only">Was </span>
              {LIST_PRICE}
            </s>
            <span className="font-display tabular text-3xl font-medium tracking-[-0.02em]">
              {FIRST_MONTH_PRICE}
            </span>
          </dd>
        </div>
        <div className="flex flex-col gap-1 border-t border-border py-4 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
          <dt className="text-body text-muted-foreground">Then</dt>
          <dd className="sm:text-right">
            <span className="font-display tabular text-xl font-medium tracking-[-0.02em]">
              {LIST_PRICE}
            </span>
            <span className="ml-1.5 text-hint text-muted-foreground">/month</span>
          </dd>
        </div>
      </dl>
      <p className="mt-5 text-hint text-muted-foreground">
        Code <span className="font-mono text-foreground">{BLACK_FRIDAY_CODE}</span> is applied at
        checkout.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function WhatsNew() {
  return (
    <section id="whats-new" className="scroll-mt-16 border-t border-border py-24 md:py-32">
      <div className={container}>
        <Reveal>
          <h2 className="max-w-3xl font-display text-[clamp(2rem,4.5vw,3.4rem)] font-medium leading-[1.1] tracking-[-0.02em]">
            What is new in The Blue Pill 2.0.
          </h2>
          <p className="mt-5 max-w-[46ch] text-lg leading-relaxed text-muted-foreground">
            Everything you already got, plus six new reasons to be inside.
          </p>
        </Reveal>

        <div className="mt-14 grid gap-4 lg:grid-cols-12">
          {NEW_IN_2.map((it, i) => (
            <Reveal key={it.title} delay={(i % 3) * 0.08} className={it.span}>
              <NewCard item={it} />
            </Reveal>
          ))}
          <Reveal delay={0.08} className="lg:col-span-6">
            <div className="flex h-full min-h-[200px] flex-col justify-end rounded-panel border border-dashed border-muted-foreground/30 p-8">
              <h3 className="font-display text-3xl font-medium tracking-[-0.02em]">& more.</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
                The rest of 2.0 is included in your membership too.
              </p>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function NewCard({ item }: { item: NewItem }) {
  const { icon: IconEl, title, body, tone } = item;
  const solid = tone === "solid";
  const feature = tone === "feature";
  return (
    <div
      className={`flex h-full flex-col justify-end rounded-panel p-8 transition-colors duration-300 ${
        feature ? "min-h-[260px]" : "min-h-[220px]"
      } ${
        solid
          ? "bg-primary text-primary-foreground"
          : feature
            ? "border border-active/25 hover:border-active/50"
            : "border border-border bg-surface hover:border-active/40"
      }`}
      style={
        feature
          ? {
              background:
                "radial-gradient(520px 320px at 100% 0%, hsl(214 90% 66% / 0.16), transparent 65%), linear-gradient(180deg, var(--blue-10), var(--surface))",
            }
          : undefined
      }
    >
      <div className="mb-auto flex items-start justify-between">
        <IconEl
          className={`${feature ? "size-14" : "size-10"} ${solid ? "" : feature ? "text-active" : "text-primary"}`}
          weight={feature ? "duotone" : "regular"}
        />
        <span
          className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] ${
            solid ? "bg-primary-foreground/10" : "bg-blue-10 text-active"
          }`}
        >
          New
        </span>
      </div>
      <h3
        className={`font-display font-medium leading-tight tracking-[-0.02em] ${feature ? "text-3xl" : "text-2xl"}`}
      >
        {title}
      </h3>
      <p
        className={`mt-2 max-w-[44ch] text-[15px] leading-relaxed ${solid ? "opacity-80" : "text-muted-foreground"}`}
      >
        {body}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function Kept() {
  return (
    <section className="border-t border-border py-24 md:py-32">
      <div className={`${container} grid items-center gap-14 lg:grid-cols-[1.05fr_1fr] lg:gap-20`}>
        <Reveal>
          <div className="overflow-hidden rounded-panel border border-border bg-surface shadow-shell">
            <img
              src="/img/discord-preview.png"
              width={935}
              height={614}
              loading="lazy"
              alt="The members-only Discord premium-alerts channel with a live trade update from Arjun IFVG"
              className="block h-auto w-full"
            />
          </div>
        </Reveal>

        <div>
          <Reveal>
            <h2 className="font-display text-[clamp(2rem,4.5vw,3.4rem)] font-medium leading-[1.1] tracking-[-0.02em]">
              Plus everything already inside.
            </h2>
          </Reveal>
          <ul className="mt-9 divide-y divide-border border-y border-border">
            {KEPT.map((k, i) => (
              <li key={k.title}>
                <Reveal delay={i * 0.05} y={14}>
                  <div className="flex gap-5 py-5">
                    <k.icon className="mt-0.5 size-8 shrink-0 text-active" weight="regular" />
                    <div>
                      <h3 className="font-display text-xl font-medium tracking-[-0.02em]">
                        {k.title}
                      </h3>
                      <p className="mt-1 text-[15px] leading-relaxed text-muted-foreground">
                        {k.body}
                      </p>
                    </div>
                  </div>
                </Reveal>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */

function Curriculum() {
  const ref = useRef<HTMLOListElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 65%", "end 70%"] });
  const scaleY = useSpring(scrollYProgress, { stiffness: 110, damping: 28, mass: 0.4 });

  return (
    <section id="curriculum" className="scroll-mt-16 border-t border-border py-24 md:py-32">
      <div className={`${container} grid gap-14 lg:grid-cols-[0.85fr_1.15fr] lg:gap-24`}>
        <div className="lg:sticky lg:top-28 lg:self-start">
          <Reveal>
            <h2 className="font-display text-[clamp(2rem,4.5vw,3.4rem)] font-medium leading-[1.1] tracking-[-0.02em]">
              Nine modules. One blueprint.
            </h2>
            <p className="mt-5 max-w-[42ch] text-lg leading-relaxed text-muted-foreground">
              A guided path from your first candle to prop firm ready execution, on your own
              schedule.
            </p>
          </Reveal>
        </div>

        <ol ref={ref} className="relative pl-10 md:pl-14">
          <span
            aria-hidden
            className="absolute bottom-2 left-[7px] top-2 w-px bg-border md:left-[9px]"
          />
          <motion.span
            aria-hidden
            style={{ scaleY: reduce ? 1 : scaleY, transformOrigin: "top" }}
            className="absolute bottom-2 left-[7px] top-2 w-px bg-active md:left-[9px]"
          />
          {PHASES.map((ph) => (
            <li key={ph.name} className="pb-12 last:pb-0">
              <p className="relative font-display text-xl font-medium tracking-[-0.02em] text-muted-foreground">
                <span
                  aria-hidden
                  className="absolute -left-10 top-1.5 size-[15px] rounded-full border-2 border-active bg-background md:-left-14 md:size-[19px]"
                />
                {ph.name}
              </p>
              <ul className="mt-5 space-y-5">
                {ph.modules.map((m) => (
                  <li key={m.n}>
                    <Reveal y={14}>
                      <div className="flex gap-5">
                        <span className="w-7 shrink-0 pt-1 font-mono text-sm tabular text-active">
                          {m.n}
                        </span>
                        <span className="font-display text-xl font-medium leading-snug tracking-[-0.02em] md:text-[1.6rem]">
                          {m.t}
                        </span>
                      </div>
                    </Reveal>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */

function Questions() {
  return (
    <section id="questions" className="scroll-mt-16 border-t border-border py-24 md:py-32">
      <div className={container}>
        <Reveal>
          <h2 className="max-w-3xl font-display text-[clamp(2rem,4.5vw,3.4rem)] font-medium leading-[1.1] tracking-[-0.02em]">
            Questions about the offer.
          </h2>
        </Reveal>
        <div className="mt-12">
          <Faq items={FAQ} />
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */

function Close() {
  return (
    <section id="claim" className="scroll-mt-16 border-t border-border py-24 md:py-32">
      <div className={container}>
        <Reveal>
          <div
            className="relative overflow-hidden rounded-shell border border-active/25 p-8 md:p-14"
            style={{
              background:
                "radial-gradient(800px 420px at 100% 0%, hsl(214 90% 66% / 0.16), transparent 65%), linear-gradient(180deg, var(--blue-10), var(--surface))",
            }}
          >
            <PillCapsule
              tone="blue"
              className="absolute right-8 top-10 hidden w-40 rotate-[20deg] md:block"
            />
            <div className="relative max-w-2xl">
              <h2 className="font-display text-[clamp(2.2rem,5vw,3.8rem)] font-medium leading-[1.04] tracking-[-0.02em]">
                Take the Blue Pill, Neo. Your first month is half price.
              </h2>
              <p className="mt-8 font-display tabular text-6xl font-medium leading-none tracking-[-0.02em]">
                {FIRST_MONTH_PRICE}
                <s className="ml-4 align-middle font-sans text-2xl font-normal tracking-normal text-muted-foreground">
                  <span className="sr-only">Was </span>
                  {LIST_PRICE}
                </s>
              </p>
              <p className="mt-3 text-sm text-muted-foreground">
                For the first month, then {LIST_PRICE}/month. Billed monthly and securely through
                Razorpay. Cancel anytime.
              </p>
              <div className="mt-9 flex flex-wrap items-center gap-x-7 gap-y-4">
                <Link to="/auth" onClick={claim} className={btnPrimary}>
                  {CLAIM}
                  <ArrowRight className="size-4" weight="bold" />
                </Link>
                <Link to="/redpill" className={btnLink}>
                  Want live mentorship? Take the Red Pill
                </Link>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
