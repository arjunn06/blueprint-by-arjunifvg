import * as React from 'react'
import { Button, Link, Section, Text } from '@react-email/components'
import {
  EmailShell,
  Heading,
  button,
  h1,
  infoBox,
  link,
  rowLabel,
  rowValue,
  strong,
  text,
} from './_shell'
import { JOURNAL_URL } from '../journal'
import type { TemplateEntry } from './registry'

interface Props {
  name?: string
  amount?: string
  nextChargeDate?: string
  appUrl?: string
}

const BluePillSubscriptionStarted = ({ name, amount, nextChargeDate, appUrl }: Props) => (
  <EmailShell
    preview="Your Blue Pill membership is active — here's what's unlocked"
    eyebrow="BLUE PILL · SUBSCRIPTION ACTIVE"
  >
    <Heading style={h1}>{name ? `Welcome in, ${name}.` : 'Welcome in.'}</Heading>
    <Text style={text}>
      Your Blue Pill membership is live. Every recorded session, the live NY calls and the
      members-only Discord are unlocked from right now.
    </Text>

    <Section style={infoBox}>
      <Text style={rowLabel}>Plan</Text>
      <Text style={rowValue}>Blue Pill · Monthly {amount ? `· ${amount}` : '· ₹499'}</Text>
      <Text style={rowLabel}>Next charge</Text>
      <Text style={{ ...rowValue, margin: 0 }}>
        {nextChargeDate ?? 'One month from today'}
      </Text>
    </Section>

    <Button style={button} href={appUrl ?? 'https://blueprint.ifvg.in/app'}>
      Open my dashboard
    </Button>

    <Text style={{ ...text, margin: '24px 0 0' }}>
      <strong style={strong}>Next step:</strong> claim your Discord role from the dashboard so you
      get session links and trade breakdowns as they're posted. Cancel anytime from Settings — no
      lock-in.
    </Text>

    <Text style={{ ...text, margin: '16px 0 0' }}>
      <strong style={strong}>Your trading journal is included:</strong> sign up at{' '}
      <Link href={JOURNAL_URL} style={link}>
        journal.ifvg.in
      </Link>{' '}
      with this same email address and it opens straight away.
    </Text>
  </EmailShell>
)

export const template = {
  component: BluePillSubscriptionStarted,
  subject: 'Arjun IFVG — Your Blue Pill membership is active',
  displayName: 'Blue Pill subscription started',
  previewData: {
    name: 'Arjun',
    amount: '₹499/month',
    nextChargeDate: '10 September 2026',
    appUrl: 'https://blueprint.ifvg.in/app',
  },
} satisfies TemplateEntry

export default BluePillSubscriptionStarted
