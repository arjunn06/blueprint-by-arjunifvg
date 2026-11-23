import { Link } from "@tanstack/react-router";
import { Children, type ReactNode } from "react";
import { SiteShell, SiteNav, SiteFooter } from "./shell";
import { container } from "./ui";

/**
 * Shared pieces for the legal pages (/privacy, /terms): one layout, one set of text styles, one contact address.
 * Change the address here and every legal page, link and mailto follows.
 */

export const CONTACT_EMAIL = "support@ifvg.in";

export const bodyText = "text-[15.5px] leading-[1.75] text-muted-foreground";
export const strongText = "font-medium text-foreground";
export const inlineLink =
  "text-foreground underline decoration-border decoration-1 underline-offset-[5px] transition-colors hover:decoration-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring";

export function P({ children }: { children: ReactNode }) {
  return <p className={bodyText}>{children}</p>;
}

/** Each child becomes one bullet. */
export function Bullets({ children }: { children: ReactNode }) {
  return (
    <ul className={`space-y-2.5 ${bodyText}`}>
      {Children.toArray(children).map((c, i) => (
        <Bullet key={i}>{c}</Bullet>
      ))}
    </ul>
  );
}

function Bullet({ children }: { children: ReactNode }) {
  return (
    <li className="flex gap-3">
      <span aria-hidden className="mt-[0.8em] size-1 shrink-0 rounded-full bg-foreground/40" />
      <span>{children}</span>
    </li>
  );
}

/** A labelled list: label on the left on wide screens, stacked on phones. */
export function Facts({ rows }: { rows: { label: string; body: ReactNode }[] }) {
  return (
    <dl className="divide-y divide-border rounded-2xl border border-border bg-surface">
      {rows.map((r) => (
        <div key={r.label} className="grid gap-1.5 p-5 sm:grid-cols-[170px_1fr] sm:gap-6">
          <dt className={`${strongText} text-[15px]`}>{r.label}</dt>
          <dd className={bodyText}>{r.body}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Mail({ subject }: { subject?: string }) {
  const href = subject
    ? `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}`
    : `mailto:${CONTACT_EMAIL}`;
  return (
    <a href={href} className={inlineLink}>
      {CONTACT_EMAIL}
    </a>
  );
}

export type LegalSection = { id: string; title: string; body: ReactNode };

export function LegalPage({
  title,
  intro,
  updated,
  summary,
  sections,
  related,
}: {
  title: string;
  intro: string;
  /** Shown as "Last updated …". Bump it whenever the text changes in substance. */
  updated: string;
  /** The "short version" box: a few plain lines. */
  summary: ReactNode[];
  sections: LegalSection[];
  /** Links to the sibling legal pages, shown under the last section. */
  related: { to: "/privacy" | "/terms"; label: string }[];
}) {
  return (
    <SiteShell>
      <SiteNav cta={false} />
      <main id="main" className={`${container} py-14 md:py-20`}>
        <header className="max-w-3xl">
          <p className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground">
            <span aria-hidden className="size-1.5 rounded-full bg-primary" />
            Last updated {updated}
          </p>
          <h1 className="mt-6 font-display text-[clamp(2.4rem,5vw,3.6rem)] font-extrabold leading-[1.04] tracking-[-0.04em]">
            {title}
          </h1>
          <p className="mt-6 max-w-[56ch] text-lg leading-relaxed text-muted-foreground">{intro}</p>
        </header>

        <div className="mt-14 grid gap-12 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-20">
          <nav
            aria-label="On this page"
            className="hidden lg:sticky lg:top-24 lg:block lg:self-start"
          >
            <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
              On this page
            </p>
            <ol className="mt-4 space-y-2.5 text-sm">
              {sections.map((s, i) => (
                <li key={s.id}>
                  <a
                    href={`#${s.id}`}
                    className="flex gap-3 text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <span className="font-mono text-[12px] leading-5 text-muted-foreground/70">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    {s.title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          <div className="max-w-3xl">
            <section
              aria-labelledby="short-version"
              className="rounded-2xl border border-border bg-surface p-6 md:p-8"
            >
              <h2
                id="short-version"
                className="font-display text-xl font-extrabold tracking-[-0.03em]"
              >
                The short version
              </h2>
              <ul className={`mt-4 space-y-3 ${bodyText}`}>
                {summary.map((line, i) => (
                  <li key={i} className="flex gap-3">
                    <span
                      aria-hidden
                      className="mt-[0.8em] size-1 shrink-0 rounded-full bg-primary"
                    />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </section>

            <div className="mt-14 space-y-14">
              {sections.map((s, i) => (
                <section
                  key={s.id}
                  id={s.id}
                  aria-labelledby={`${s.id}-h`}
                  className="scroll-mt-24"
                >
                  <h2
                    id={`${s.id}-h`}
                    className="flex items-baseline gap-4 font-display text-[1.65rem] font-extrabold leading-tight tracking-[-0.03em]"
                  >
                    <span className="font-mono text-[13px] font-medium tracking-normal text-muted-foreground">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    {s.title}
                  </h2>
                  <div className="mt-5 space-y-5">{s.body}</div>
                </section>
              ))}
            </div>

            <p className="mt-16 flex flex-wrap gap-x-6 gap-y-2 border-t border-border pt-6 text-sm text-muted-foreground">
              {related.map((r) => (
                <Link key={r.to} to={r.to} className={inlineLink}>
                  {r.label}
                </Link>
              ))}
              <Link to="/" className={inlineLink}>
                Back to Blueprint
              </Link>
            </p>
          </div>
        </div>
      </main>
      <SiteFooter />
    </SiteShell>
  );
}
