import { createFileRoute } from "@tanstack/react-router";
import {
  Bullets,
  CONTACT_EMAIL,
  Facts,
  LegalPage,
  Mail,
  P,
  strongText,
  type LegalSection,
} from "@/components/site/legal-kit";

const TITLE = "Privacy Policy | Blueprint";
const DESCRIPTION =
  "What Blueprint by Arjun IFVG collects, why, who it is shared with, and how to ask for your data to be corrected or deleted.";
const URL = "https://blueprint.ifvg.in/privacy";

/** Bump this whenever the text below changes in substance. */
const UPDATED = "18 November 2026";

export const Route = createFileRoute("/privacy")({
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
  component: PrivacyPage,
});

/* ------------------------------------------------------------------ */
/* Content                                                             */
/* ------------------------------------------------------------------ */

const SECTIONS: LegalSection[] = [
  {
    id: "who-we-are",
    title: "Who we are",
    body: (
      <>
        <P>
          Blueprint by Arjun IFVG (“Blueprint”, “we”, “us”) runs blueprint.ifvg.in: IFVG trading
          education and community, with the Blue Pill membership, the Red Pill program and the
          application forms around them. This policy covers this site and the emails we send from
          it.
        </P>
        <P>
          The IFVG Journal at journal.ifvg.in is a separate app on its own database. This policy
          covers only what this site sends to it (see “Who we share it with”).
        </P>
      </>
    ),
  },
  {
    id: "what-we-collect",
    title: "What we collect",
    body: (
      <>
        <P>Only what is needed to run your membership or answer your application.</P>
        <Facts
          rows={[
            {
              label: "Account",
              body: (
                <>
                  Your email address. If you sign in with Google we also receive the name and
                  profile picture on that Google account. During setup you choose a handle and can
                  add your full name and a profile photo.
                </>
              ),
            },
            {
              label: "Membership and payments",
              body: (
                <>
                  Your plan, its status and renewal or end date, any promo code you used, and
                  Razorpay’s order, subscription and payment IDs with the amount and result.{" "}
                  <span className={strongText}>
                    We never receive or store your card number, CVV or UPI ID.
                  </span>
                </>
              ),
            },
            {
              label: "Applications and waitlist",
              body: (
                <>
                  Red Pill application: name, email, WhatsApp number, age, trading stage and whether
                  you are ready to pay. 1-1 training application: name, email, WhatsApp number,
                  trading experience and stage, your answer on why you, and whether you are ready to
                  invest. Earlier versions of that form also asked for location, goals and
                  availability, so older entries may include them. Red Pill waitlist: email, phone
                  and, optionally, name. When Arjun reviews an application we add a status and
                  private notes.
                </>
              ),
            },
            {
              label: "Learning activity",
              body: <>Which lessons you have marked as complete.</>,
            },
            {
              label: "Discord",
              body: (
                <>
                  If you connect Discord, your Discord user ID. We use it to add you to the members’
                  server and give you your role. The connection does not let us read your direct
                  messages or see which other servers you are in. What you post inside our server is
                  visible to its members and moderators under Discord’s own rules.
                </>
              ),
            },
            {
              label: "Emails",
              body: (
                <>
                  A record of the emails we send you (type, address and delivery result, such as
                  bounced or reported as spam) and any unsubscribe.
                </>
              ),
            },
            {
              label: "Technical data",
              body: (
                <>
                  Our hosting and database providers log standard request data such as IP address,
                  browser and time, so the site can run and be kept secure.
                </>
              ),
            },
          ]}
        />
      </>
    ),
  },
  {
    id: "how-we-use-it",
    title: "How we use it",
    body: (
      <>
        <Bullets>
          <>Create your account, sign you in with one-time email codes and keep you signed in.</>
          <>
            Take payment, run your subscription and send receipts, payment reminders and
            cancellation notices.
          </>
          <>
            Unlock the course library, your Discord role and the IFVG Journal while your membership
            is active, and remove them when it ends.
          </>
          <>Review applications and contact applicants on WhatsApp or email.</>
          <>Show your lesson progress back to you.</>
          <>Keep the service secure, stop abuse and enforce bans.</>
          <>Meet legal, tax and accounting duties and settle disputes.</>
        </Bullets>
        <P>We do not use your information for advertising, and we do not sell or rent it.</P>
      </>
    ),
  },
  {
    id: "who-we-share-it-with",
    title: "Who we share it with",
    body: (
      <>
        <P>
          Only the services that help us run Blueprint, and only what each one needs to do its job.
        </P>
        <Facts
          rows={[
            {
              label: "Supabase",
              body: (
                <>
                  Database, sign-in and private file storage (profile photos, course covers and
                  lesson videos). Holds your account, membership, application and progress records.
                </>
              ),
            },
            { label: "Cloudflare", body: <>Hosts the site and serves its pages.</> },
            {
              label: "Razorpay",
              body: (
                <>
                  Payments. You enter card or UPI details in Razorpay’s checkout, or in our payment
                  form, which passes them straight to Razorpay. Razorpay tells us whether the
                  payment worked, and its own privacy policy covers what it holds.
                </>
              ),
            },
            {
              label: "Resend",
              body: <>Delivers our emails, so it sees your email address and the message.</>,
            },
            {
              label: "Discord",
              body: <>Adds you to the members’ server and gives you your role.</>,
            },
            {
              label: "Google",
              body: (
                <>
                  If you choose “Continue with Google”, Google tells us your email, name and
                  picture. The site also loads its fonts from Google Fonts, so Google sees your IP
                  address and browser details when a page loads.
                </>
              ),
            },
            {
              label: "YouTube and Vimeo",
              body: (
                <>
                  Some lessons are embedded videos. Opening one loads the player from YouTube or
                  Vimeo, which can set cookies and collect data under their own policies. The intro
                  video on the Red Pill page loads from YouTube only when you press play.
                </>
              ),
            },
            {
              label: "IFVG Journal",
              body: (
                <>
                  We send your email address, whether your membership is active and when it ends, so
                  the Journal can unlock or lock itself for you.
                </>
              ),
            },
            {
              label: "Arjun and admins",
              body: (
                <>
                  Arjun and the admins he authorises can see your account, membership and
                  applications in the admin area.
                </>
              ),
            },
          ]}
        />
        <P>
          We may also disclose information when the law requires it, or to protect Blueprint, our
          members or others from fraud and abuse. If Blueprint changes hands, your information may
          move to the new owner.
        </P>
      </>
    ),
  },
  {
    id: "cookies",
    title: "Cookies and browser storage",
    body: (
      <>
        <P>
          We do not run advertising trackers, and the site loads no analytics scripts. A few things
          are kept in your browser so it works:
        </P>
        <Bullets>
          <>
            Your sign-in session, held by our sign-in provider in your browser’s local storage, so
            you stay signed in until you sign out.
          </>
          <>Your light or dark theme choice.</>
          <>
            Short-lived notes: a Red Pill invite link you opened, and that you are returning from
            connecting Discord.
          </>
        </Bullets>
        <P>
          Razorpay, Google, YouTube and Vimeo can set their own cookies when you use them. You can
          clear site data or block cookies in your browser settings. You will be signed out, and
          some pages may stop working.
        </P>
      </>
    ),
  },
  {
    id: "how-long",
    title: "How long we keep it",
    body: (
      <>
        <P>We keep personal information only as long as we need it for the purposes above:</P>
        <Bullets>
          <>Account details and lesson progress, while your account exists.</>
          <>Payment and tax records, for as long as accounting and tax rules require.</>
          <>Applications and waitlist entries, until you ask us to delete them.</>
          <>
            Email suppression records, for as long as needed so that an address that bounced or
            unsubscribed is not emailed again.
          </>
        </Bullets>
      </>
    ),
  },
  {
    id: "your-rights",
    title: "Your choices and rights",
    body: (
      <>
        <Bullets>
          <>
            <span className={strongText}>See or correct your data.</span> Change your name and photo
            in Settings. For anything else, write to <Mail subject="Privacy request" />.
          </>
          <>
            <span className={strongText}>Delete your account.</span> Email us from the address on
            the account. We remove your profile, membership record, lesson progress and sign-in,
            cancel any live subscription and switch off your Journal access. We also delete any
            application or waitlist entry under your email. We keep payment records that tax rules
            require, and a short internal log that the account was deleted, which includes your
            email and name.
          </>
          <>
            <span className={strongText}>Cancel your membership.</span> Do it any time in Settings.
            You keep access to the end of the period you paid for.
          </>
          <>
            <span className={strongText}>Stop our emails.</span> Use the unsubscribe link in them.
          </>
          <>
            <span className={strongText}>Withdraw consent or ask a question.</span> Write to us. We
            reply as soon as we can and aim to settle requests within 30 days.
          </>
        </Bullets>
        <P>
          If you are in India, the Digital Personal Data Protection Act, 2023 also gives you rights
          to access, correct and erase your personal data and to have a grievance heard. Raise it
          with us first at <Mail subject="Privacy grievance" />. If it is not resolved you may take
          it to the Data Protection Board of India.
        </P>
      </>
    ),
  },
  {
    id: "security",
    title: "Security and where data is processed",
    body: (
      <>
        <P>
          The database lets a member read only their own records. Profile photos and course videos
          sit in private storage and are served through short-lived links. Card details never reach
          our servers. Wider access is limited to admins. No online service can promise perfect
          security, and if a breach affects you we will tell you as the law requires.
        </P>
        <P>
          Our providers run servers in several countries, so your information may be processed
          outside India. We use established providers and rely on their security and data-transfer
          commitments.
        </P>
      </>
    ),
  },
  {
    id: "children",
    title: "Children",
    body: (
      <P>
        Blueprint is trading education for adults and is not meant for anyone under 18. We do not
        knowingly collect personal information from children. If you think a child has given us
        theirs, write to <Mail subject="Privacy request" /> and we will delete it.
      </P>
    ),
  },
  {
    id: "changes",
    title: "Changes to this policy",
    body: (
      <P>
        When this policy changes we update the date at the top. If the change is significant we will
        email members or put a notice on the site.
      </P>
    ),
  },
  {
    id: "contact",
    title: "Contact",
    body: (
      <>
        <P>
          Questions, requests and grievances about your personal information go to{" "}
          <Mail subject="Privacy request" />. Put “Privacy” in the subject so it reaches the right
          person.
        </P>
        <P>Blueprint by Arjun IFVG, blueprint.ifvg.in</P>
      </>
    ),
  },
];

const SUMMARY = [
  "We collect what running your membership takes: your email, name, payment status and lesson progress.",
  "Your card or UPI details go straight to Razorpay. They never reach our servers.",
  "We do not sell your data, and the site runs no advertising trackers or analytics scripts.",
  `To correct or delete anything, email ${CONTACT_EMAIL}.`,
];

function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      intro="What we collect, why we collect it, who sees it, and how to get it corrected or deleted. Plain language, no tricks."
      updated={UPDATED}
      summary={SUMMARY}
      sections={SECTIONS}
      related={[{ to: "/terms", label: "Terms of Service" }]}
    />
  );
}
