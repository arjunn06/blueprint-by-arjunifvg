import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Bullets,
  Facts,
  LegalPage,
  Mail,
  P,
  inlineLink,
  strongText,
  type LegalSection,
} from "@/components/site/legal-kit";
import {
  BLUE_PILL_BASE_PAISE,
  GST_RATE,
  RED_PILL_ACCESS_DAYS,
  RED_PILL_BASE_PAISE,
  formatRupees,
  withGst,
} from "@/lib/pricing";

const TITLE = "Terms of Service | Blueprint";
const DESCRIPTION =
  "The terms for using Blueprint by Arjun IFVG: memberships, payments, cancellation and refunds, community rules and your responsibilities.";
const URL = "https://blueprint.ifvg.in/terms";

/** Bump this whenever the text below changes in substance. */
const UPDATED = "18 November 2026";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: URL },
      { property: "og:image", content: "https://blueprint.ifvg.in/og-blueprint.jpg" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
    ],
    links: [{ rel: "canonical", href: URL }],
  }),
  component: TermsPage,
});

/* Prices come from the same file checkout uses, so these terms cannot drift from what is charged. */
const GST = `${Math.round(GST_RATE * 100)}%`;
const BLUE = formatRupees(BLUE_PILL_BASE_PAISE);
const BLUE_TOTAL = formatRupees(withGst(BLUE_PILL_BASE_PAISE));
const RED = formatRupees(RED_PILL_BASE_PAISE);
const RED_TOTAL = formatRupees(withGst(RED_PILL_BASE_PAISE));

/* ------------------------------------------------------------------ */
/* Content                                                             */
/* ------------------------------------------------------------------ */

const SECTIONS: LegalSection[] = [
  {
    id: "about",
    title: "About these terms",
    body: (
      <>
        <P>
          Blueprint by Arjun IFVG (“Blueprint”, “we”, “us”) runs blueprint.ifvg.in: IFVG trading
          education and a members community, sold as the Blue Pill membership and the Red Pill
          program. These terms are the agreement between you and Blueprint for using the site and
          anything you buy on it.
        </P>
        <P>
          By creating an account, applying or paying, you agree to these terms and to our{" "}
          <Link to="/privacy" className={inlineLink}>
            Privacy Policy
          </Link>
          . If you do not agree, please do not use Blueprint. You must be 18 or older to buy a
          membership.
        </P>
      </>
    ),
  },
  {
    id: "education",
    title: "Education only, and trading risk",
    body: (
      <>
        <P>
          Blueprint teaches a trading method (IFVG) and runs a community around it. It is education
          only. Nothing we publish, teach or post, in lessons, live sessions, the Discord or emails,
          is investment advice, a recommendation, or an offer to buy or sell anything.
        </P>
        <Bullets>
          <>
            Trade updates in the members’ Discord are Arjun’s own trades, shared so you can see the
            method applied. They are not signals. You decide whether and how to trade, and you are
            responsible for those decisions and what comes of them.
          </>
          <>
            Trading futures, forex and other leveraged products carries a high risk of loss. You can
            lose some or all of your money. Past results, and the examples, screenshots and member
            stories we show, explain a method and do not predict future results. We cannot promise
            that you will make money or become consistent.
          </>
          <>
            We do not manage money, hold your funds or place trades for you. We do not recommend or
            endorse any broker or prop firm, and their rules are theirs to set and change.
          </>
        </Bullets>
      </>
    ),
  },
  {
    id: "account",
    title: "Your account",
    body: (
      <Bullets>
        <>
          You sign in with a one-time code sent to your email, or with Google. Your email address is
          your identity here, so use the one you pay with. Memberships are matched on it.
        </>
        <>
          One account per person. Your membership is personal: do not share your login, your Discord
          access or your session links with anyone else.
        </>
        <>Give true and current information, including on applications.</>
        <>
          You are responsible for what happens under your account. If you think someone else has got
          into it, tell us at once at <Mail subject="Account problem" />.
        </>
      </Bullets>
    ),
  },
  {
    id: "memberships",
    title: "Memberships and prices",
    body: (
      <>
        <Facts
          rows={[
            {
              label: "Blue Pill",
              body: (
                <>
                  {BLUE} a month + {GST} GST ({BLUE_TOTAL} in total), billed monthly through
                  Razorpay until you cancel. Includes the library of recorded Red Pill sessions, the
                  members’ Discord with live New York session streams and trade alerts, and the IFVG
                  Journal, for as long as the membership is active.
                </>
              ),
            },
            {
              label: "Red Pill",
              body: (
                <>
                  {RED} + {GST} GST ({RED_TOTAL} in total), paid once, by application. One payment
                  buys {RED_PILL_ACCESS_DAYS} days of access from the day it succeeds: live training
                  on Zoom (the nine-module course in week 1, then live sessions and daily reviews of
                  Arjun’s own trades), the premium Discord and the IFVG Journal. It does not renew.
                </>
              ),
            },
            {
              label: "IFVG Journal",
              body: (
                <>
                  A separate app at journal.ifvg.in, included with either membership while it is
                  active. You sign up there with the same email, and access ends when your
                  membership does.
                </>
              ),
            },
            {
              label: "Prices",
              body: (
                <>
                  Prices are in Indian rupees, and {GST} GST is added at checkout. We may change
                  prices. A change never applies to a period you have already paid for, and Blue
                  Pill members can cancel before it takes effect.
                </>
              ),
            },
            {
              label: "What can change",
              body: (
                <>
                  Live sessions can be rescheduled. We may add, change or retire lessons and
                  features over time.
                </>
              ),
            },
          ]}
        />
      </>
    ),
  },
  {
    id: "payments",
    title: "Payments, renewals and cancellation",
    body: (
      <Bullets>
        <>
          Payments are processed by Razorpay, and its terms apply to your payment. We never see your
          card number, CVV or UPI ID.
        </>
        <>
          <span className={strongText}>Blue Pill renews automatically</span> every month until you
          cancel. You can cancel at any time in Settings in your members area. Cancelling stops
          future charges, and your access continues to the end of the month you have already paid
          for.
        </>
        <>
          If a renewal cannot be charged we will email you to pay. If it still does not go through,
          your access ends when the period you paid for runs out, and you can pay again from
          Settings.
        </>
        <>
          A promo code can give a discount on your first charge or a free trial. Each code has its
          own limits and expiry, and checkout shows what you will pay and when. After a free trial,
          the first charge is taken when the trial ends.
        </>
        <>
          <span className={strongText}>Red Pill is a single payment.</span> Nothing renews, and
          access ends {RED_PILL_ACCESS_DAYS} days after you pay.
        </>
        <>You are responsible for any other taxes or bank charges that apply to you.</>
      </Bullets>
    ),
  },
  {
    id: "refunds",
    title: "Refunds",
    body: (
      <>
        <P>
          Payments are not refunded automatically. We look at each request on its own merits and
          decide at our discretion.
        </P>
        <P>
          If you think you should be refunded, write to <Mail subject="Refund request" /> from the
          email on your account and tell us what happened. We will always put right a genuine
          billing error, such as a double charge.
        </P>
        <P>
          Approved refunds go back to your original payment method through Razorpay, and your bank
          decides how long they take to show up. Cancelling a Blue Pill membership is not a refund
          request: it stops future charges and keeps your access to the end of the month you paid
          for.
        </P>
      </>
    ),
  },
  {
    id: "applications",
    title: "Applications",
    body: (
      <Bullets>
        <>
          The Red Pill and 1-1 training are by application. Applying is not a purchase and does not
          guarantee you a place. Arjun reviews every application personally and may decline one
          without giving a reason.
        </>
        <>
          If you are picked, we contact you on WhatsApp or email. Any fee is shown to you before you
          pay.
        </>
        <>Your answers must be true. Applying costs nothing.</>
      </Bullets>
    ),
  },
  {
    id: "community",
    title: "Community and Discord",
    body: (
      <>
        <P>
          Membership includes the members’ Discord. Connecting your Discord account gives you your
          role, and the role is removed when your membership ends. Discord’s own terms apply to your
          use of it. In the community you agree not to:
        </P>
        <Bullets>
          <>harass, abuse or threaten anyone, or post hateful or sexual content;</>
          <>
            spam or promote other services, signal groups, brokers, prop firms or paid communities,
            including by direct message;
          </>
          <>run scams, or ask members for money, accounts or personal details;</>
          <>
            post other people’s private information, or pretend to be Arjun, a moderator or another
            member;
          </>
          <>share paid lessons, recordings or session links outside the membership.</>
        </Bullets>
        <P>
          What you post can be seen by other members and our moderators. You keep ownership of it,
          and you let us host and show it within the community. Moderators can remove content and
          members, and we can take away your role.
        </P>
      </>
    ),
  },
  {
    id: "content",
    title: "Our content and how you may use it",
    body: (
      <>
        <P>
          The lessons, recordings, live sessions, trade updates, Journal and everything else on this
          site belong to Blueprint and Arjun, or are used with permission. While your membership is
          active you get a personal, non-transferable licence to watch and use them for your own
          learning. You must not:
        </P>
        <Bullets>
          <>
            record, download, screen-capture, copy, re-upload, sell or share lessons, recordings or
            live sessions, or pass them to anyone who is not a member;
          </>
          <>
            share your login or Discord access, or use our material to run your own paid group or
            course;
          </>
          <>get around the video protections or any payment or access control;</>
          <>
            scrape or overload the site, probe it for weaknesses, or try to get into other people’s
            accounts;
          </>
          <>use Blueprint for anything unlawful.</>
        </Bullets>
        <P>The Blueprint name and logo are ours. Do not use them to suggest we endorse you.</P>
      </>
    ),
  },
  {
    id: "service",
    title: "The service and other providers",
    body: (
      <>
        <P>
          We work to keep the site running, but we do not promise it will always be available or
          error free. It is provided as it is, and we may pause it for maintenance or change or
          retire features and content.
        </P>
        <P>
          Parts of Blueprint rely on others we do not control, such as Razorpay, Discord, Zoom,
          YouTube, Vimeo and our hosting and email providers. If one has a problem, parts of
          Blueprint may stop working for a while. We are not responsible for their services or
          terms.
        </P>
      </>
    ),
  },
  {
    id: "ending",
    title: "Suspension and ending access",
    body: (
      <Bullets>
        <>
          You can stop at any time. Cancel a Blue Pill membership in Settings, or email us to close
          your account. Closing an account deletes your data as the{" "}
          <Link to="/privacy" className={inlineLink}>
            Privacy Policy
          </Link>{" "}
          describes.
        </>
        <>
          We can suspend or end your access, remove your Discord role and ban your account if you
          break these terms, share your access, abuse the community, or if a payment fails or is
          reversed. We try to tell you why, but we may act first where we need to protect the
          community or our content.
        </>
        <>
          If we end your access because you broke these terms, you are not entitled to a refund for
          the rest of the period.
        </>
      </Bullets>
    ),
  },
  {
    id: "liability",
    title: "Liability",
    body: (
      <>
        <P>
          To the extent the law allows, Blueprint is not liable for trading losses, lost profits, or
          indirect or consequential loss arising from your use of the site or anything taught on it.
          Our total liability to you for any claim is limited to the amount you paid us for the
          membership the claim relates to.
        </P>
        <P>
          Nothing in these terms limits liability that the law does not allow to be limited, and
          nothing takes away rights you have as a consumer under Indian law.
        </P>
      </>
    ),
  },
  {
    id: "law",
    title: "Governing law, disputes and general",
    body: (
      <>
        <P>
          These terms are governed by the laws of India, and the courts in India have jurisdiction
          over any dispute about them. Please write to us first at <Mail subject="Complaint" />.
          Most problems can be sorted out without a dispute.
        </P>
        <P>
          The Privacy Policy forms part of this agreement. If part of these terms cannot be
          enforced, the rest stays in force. If we do not enforce a term straight away, we have not
          given it up. You may not transfer your account or membership to anyone else.
        </P>
      </>
    ),
  },
  {
    id: "changes",
    title: "Changes to these terms",
    body: (
      <P>
        We may update these terms. We change the date at the top, and if a change is significant we
        will email members or put a notice on the site. If you keep using Blueprint after a change
        takes effect, you accept the new terms. Blue Pill members who do not accept a change can
        cancel before it applies, and a change to prices or to what a membership includes never
        applies to a period you have already paid for.
      </P>
    ),
  },
  {
    id: "contact",
    title: "Contact",
    body: (
      <>
        <P>
          Questions about these terms, refunds or your account go to{" "}
          <Mail subject="Terms question" />.
        </P>
        <P>Blueprint by Arjun IFVG, blueprint.ifvg.in</P>
      </>
    ),
  },
];

const SUMMARY = [
  "Blueprint is trading education. Nothing here is investment advice, and we promise no profits.",
  `Blue Pill is ${BLUE} + ${GST} GST a month, billed through Razorpay. Cancel any time in Settings and keep access to the end of the month you paid for.`,
  `Red Pill is ${RED} + ${GST} GST once, by application, for ${RED_PILL_ACCESS_DAYS} days of access. It does not renew.`,
  "Refunds are decided case by case, and we always fix genuine billing errors.",
  "Your membership is yours alone. Do not share your login or copy and redistribute the lessons.",
];

function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      intro="What you get, what we ask of you, and how payments, cancellation and refunds work."
      updated={UPDATED}
      summary={SUMMARY}
      sections={SECTIONS}
      related={[{ to: "/privacy", label: "Privacy Policy" }]}
    />
  );
}
