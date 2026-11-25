import * as React from 'react'
import { Text } from '@react-email/components'
import { CodeTile, EmailShell, Heading, codeHint, footnote, h1, text } from './_shell'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <EmailShell preview="Your Blueprint verification code">
    <Heading style={h1}>Confirm it's you</Heading>
    <Text style={text}>
      Enter this 6-digit code to confirm the change you're making to your account. It expires
      shortly.
    </Text>
    <CodeTile code={token} />
    <Text style={codeHint}>Never share this code. Blueprint will never ask you for it.</Text>
    <Text style={footnote}>Didn't request this? You can ignore this email.</Text>
  </EmailShell>
)

export default ReauthenticationEmail
