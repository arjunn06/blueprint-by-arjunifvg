import * as React from 'react'
import { Text } from '@react-email/components'
import { CodeTile, EmailShell, Heading, codeHint, footnote, h1, text } from './_shell'

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
  token?: string
}

// The sign-in one-time code (Supabase "magiclink" email). There is deliberately no link or
// button: members type the code into the sign-in page, and a link in a code email trains people
// to click.
export const MagicLinkEmail = ({ token }: MagicLinkEmailProps) => (
  <EmailShell preview="Your Blueprint sign-in code">
    <Heading style={h1}>Your sign-in code</Heading>
    <Text style={text}>
      Enter this 6-digit code on the Blueprint sign-in page to finish signing in. It expires
      shortly.
    </Text>
    <CodeTile code={token} />
    <Text style={codeHint}>Never share this code. Blueprint will never ask you for it.</Text>
    <Text style={footnote}>
      Didn't try to sign in? You can ignore this email. Nothing changes until the code is used.
    </Text>
  </EmailShell>
)

export default MagicLinkEmail
