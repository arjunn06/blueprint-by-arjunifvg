import * as React from 'react'
import { Body, Container, Heading, Html, Img, Preview, Text } from '@react-email/components'

/* Brand tokens for every email in this project. They mirror the sign-in flow in src/styles.css
   (the "Essential Colors" light palette, with the dark palette used for dark mail clients):

               light      dark
   canvas      #ffffff    #0b0c0f
   tile        #f9f9f9    #191b1f    (--surface-2: code box, info boxes)
   hairline    #e7ecf4    #272a30    (--border)
   text        #000000    #edf0f2    (--foreground)
   body copy   #666666    #9ba2ab    (--muted-foreground, solid, as mail clients drop rgba)
   hint        #6d6d6d    #8b94a0
   button      #262626    #f3f5f6    (--primary: a dark pill, white text)
   account     #2469ff    #70a0ff    (--action)
   focus ring  #2381ed    #5a9ef6    (--active, the focused OTP box)
   Red Pill    #dd382c    #e95449    (--pill-red)

   Type is Inter (display and body) with Geist Mono for numbers, like the site. Only Apple Mail,
   iOS Mail and a few others load web fonts, so every stack ends in what the phone or desktop
   already has: SF Pro / Segoe UI / Roboto look close to Inter.

   Layout is tables and inline styles. Dark mode is two layers: clients that run their own dark
   conversion (Gmail, Outlook) recolour a design that is already fully explicit; clients that
   honour prefers-color-scheme (Apple Mail, iOS Mail) get the dark palette from DARK_CSS below. */

export const BLUE = '#2469ff'
export const RED = '#dd382c'
export const AMBER = '#FFC107'

const PRIMARY = '#262626'
const TEXT = '#000000'
const MUTED = '#666666'
const HINT = '#6d6d6d'
const TILE = '#f9f9f9'
const HAIRLINE = '#e7ecf4'
const ACTIVE = '#2381ed'

// Served from /public/email, so it travels with the site on any host.
const EMAIL_ASSETS = 'https://blueprint.ifvg.in/email'
/** Legacy white mark. Delivered emails still load it, so the file stays; new emails use the tile. */
export const LOGO_URL = `${EMAIL_ASSETS}/blueprint-mark.png`
/** The black mark in the light rounded tile (the sign-in header), 192px for a 64px slot. */
export const LOGO_TILE_URL = `${EMAIL_ASSETS}/blueprint-tile.png`
/** The white mark in the dark tile, swapped in by clients that honour prefers-color-scheme. */
export const LOGO_TILE_DARK_URL = `${EMAIL_ASSETS}/blueprint-tile-dark.png`

const SANS =
  '"Inter", -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
const MONO =
  '"Geist Mono", ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", "Roboto Mono", monospace'

type Style = React.CSSProperties

/* ---------- Type and block styles shared by every template ---------- */

export const main: Style = {
  margin: 0,
  padding: 0,
  backgroundColor: '#ffffff',
  color: TEXT,
  fontFamily: SANS,
  WebkitTextSizeAdjust: '100%',
}
export const h1: Style = {
  fontFamily: SANS,
  fontSize: '32px',
  lineHeight: '1.2',
  fontWeight: 600,
  letterSpacing: '-0.02em',
  color: TEXT,
  margin: '0 0 12px',
}
export const text: Style = {
  fontFamily: SANS,
  fontSize: '16px',
  lineHeight: '1.5',
  color: MUTED,
  margin: '0 0 28px',
}
export const strong: Style = { color: TEXT, fontWeight: 600 }
export const link: Style = { color: TEXT, textDecoration: 'underline' }
export const footnote: Style = {
  fontFamily: SANS,
  fontSize: '13px',
  lineHeight: '20px',
  color: HINT,
  margin: '20px 0 0',
}

/** A hairline tile: the app-card / input-field look (20px radius, 1px border, light fill). */
const tile: Style = {
  backgroundColor: TILE,
  border: `1px solid ${HAIRLINE}`,
  borderRadius: '20px',
}
export const infoBox: Style = { ...tile, padding: '20px 24px', margin: '0 0 28px' }
export const rowLabel: Style = {
  fontFamily: SANS,
  fontSize: '12px',
  lineHeight: '16px',
  fontWeight: 500,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: MUTED,
  margin: '0 0 4px',
}
export const rowValue: Style = {
  fontFamily: SANS,
  fontSize: '16px',
  lineHeight: '24px',
  fontWeight: 600,
  color: TEXT,
  margin: '0 0 16px',
}
/** Nested block with a title, body copy and usually a CTA. */
export const stepBox: Style = { ...tile, padding: '24px', margin: '0 0 28px' }
export const stepTitle: Style = {
  fontFamily: SANS,
  fontSize: '18px',
  lineHeight: '1.3',
  fontWeight: 600,
  letterSpacing: '-0.01em',
  color: TEXT,
  margin: '0 0 8px',
}
export const stepText: Style = {
  fontFamily: SANS,
  fontSize: '14px',
  lineHeight: '1.55',
  color: MUTED,
  margin: '0 0 20px',
}

/** The pill CTA: dark `--primary`, white text, fully rounded (Outlook for Windows draws it square). */
export function buttonWith(accent: string = PRIMARY): Style {
  return {
    backgroundColor: accent,
    borderRadius: '999px',
    color: '#ffffff',
    fontFamily: SANS,
    fontSize: '15px',
    fontWeight: 500,
    padding: '16px 28px',
    textDecoration: 'none',
    display: 'inline-block',
  }
}
export const button = buttonWith()

/** Small mono label above the heading, in the account blue or a pill colour. */
export function eyebrowStyle(color: string = BLUE): Style {
  return {
    fontFamily: MONO,
    fontSize: '12px',
    lineHeight: '16px',
    fontWeight: 500,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    color,
    margin: '0 0 16px',
  }
}

/* ---------- One-time code ---------- */

const codeText: Style = {
  fontFamily: MONO,
  fontSize: '44px',
  lineHeight: '52px',
  fontWeight: 600,
  color: TEXT,
  letterSpacing: '0.26em',
  // letter-spacing also trails the last digit; pad the other side so the code sits dead centre.
  paddingLeft: '0.26em',
  margin: 0,
  textAlign: 'center',
  // One click or tap selects all six digits, which is the whole point of the email.
  WebkitUserSelect: 'all',
  userSelect: 'all',
}

/**
 * The code, as one run of text (so it copies cleanly) in the focused-field look of the sign-in
 * page's OTP boxes: 20px radius, active-blue border and a soft ring.
 */
export function CodeTile({ code }: { code?: string }) {
  return (
    <table
      role="presentation"
      width="100%"
      cellPadding={0}
      cellSpacing={0}
      border={0}
      className="bp-tile bp-focus"
      style={{
        ...tile,
        backgroundColor: '#ffffff',
        border: `1px solid ${ACTIVE}`,
        boxShadow: '0 0 0 4px rgba(35,129,237,0.10)',
        margin: '0 0 20px',
      }}
    >
      <tbody>
        <tr>
          <td align="center" style={{ padding: '28px 8px' }}>
            <Text className="bp-code bp-fg" style={codeText}>
              {code}
            </Text>
          </td>
        </tr>
      </tbody>
    </table>
  )
}

/** Quiet line under the code. */
export const codeHint: Style = { ...footnote, margin: '0 0 28px' }

/* ---------- Dark mode ---------- */

const DARK_CSS = `
:root { color-scheme: light dark; }
body, table, td, p, a, h1 { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
@media (prefers-color-scheme: dark) {
  .bp-page { background-color: #0b0c0f !important; }
  .bp-fg { color: #edf0f2 !important; }
  .bp-muted { color: #9ba2ab !important; }
  .bp-hint { color: #8b94a0 !important; }
  .bp-blue { color: #70a0ff !important; }
  .bp-red { color: #e95449 !important; }
  .bp-tile { background-color: #191b1f !important; border-color: #272a30 !important; }
  .bp-focus { border-color: #5a9ef6 !important; box-shadow: 0 0 0 4px rgba(90,158,246,0.16) !important; }
  .bp-rule { border-top-color: #272a30 !important; }
  .bp-btn { background-color: #f3f5f6 !important; color: #0f1115 !important; }
  .bp-logo-light { display: none !important; max-height: 0 !important; overflow: hidden !important; }
  .bp-logo-dark { display: block !important; max-height: none !important; overflow: visible !important; }
}`

const MSO_CSS = `
body, table, td, p, a, h1, span { font-family: Arial, Helvetica, sans-serif !important; }
.bp-code { font-family: Consolas, "Courier New", monospace !important; }`

// Fonts are linked for the clients that load them; Outlook for Windows is kept away from the link
// because it can answer an unknown web font with Times New Roman.
const FONT_LINK =
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Geist+Mono:wght@500;600&display=swap'

// Static markup, no interpolated user data. dangerouslySetInnerHTML is only here because
// conditional comments cannot be written as React elements.
const HEAD_HTML = `
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="format-detection" content="telephone=no, date=no, address=no, email=no, url=no">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<!--[if !mso]><!--><link rel="stylesheet" href="${FONT_LINK}"><!--<![endif]-->
<!--[if mso]><style>${MSO_CSS}</style><![endif]-->
<style>${DARK_CSS}</style>`

/** Maps a token colour to the class the dark stylesheet recolours. */
function darkClass(style?: Style): string {
  if (!style) return ''
  const out: string[] = []
  if (style.color === TEXT) out.push('bp-fg')
  else if (style.color === MUTED) out.push('bp-muted')
  else if (style.color === HINT) out.push('bp-hint')
  else if (style.color === BLUE) out.push('bp-blue')
  else if (style.color === RED) out.push('bp-red')
  if (style.backgroundColor === TILE) out.push('bp-tile')
  else if (style.backgroundColor === PRIMARY) out.push('bp-btn')
  return out.join(' ')
}

/**
 * Templates style their content with the tokens above. This walks that content once and adds the
 * matching dark-mode class to each element, so a new template is dark-aware without remembering
 * class names. Elements it cannot see into (custom components) just keep their light colours.
 */
function themed(node: React.ReactNode): React.ReactNode {
  return React.Children.map(node, (child) => {
    if (!React.isValidElement(child)) return child
    const props = child.props as { style?: Style; className?: string; children?: React.ReactNode }
    const className = [props.className, darkClass(props.style)].filter(Boolean).join(' ')
    const next = className ? { className } : {}
    return props.children === undefined
      ? React.cloneElement(child, next)
      : React.cloneElement(child, next, themed(props.children))
  })
}

/* ---------- Shell ---------- */

const logoBase: Style = { display: 'block', border: 0, outline: 'none' }
const logoDark: Style = {
  ...logoBase,
  display: 'none',
  maxHeight: 0,
  overflow: 'hidden',
  // Outlook ignores display:none on images; this hides the dark tile there.
  ...({ msoHide: 'all' } as Style),
}
const footer: Style = {
  fontFamily: SANS,
  fontSize: '13px',
  lineHeight: '20px',
  color: HINT,
  margin: 0,
}

export function EmailShell({
  preview,
  eyebrow,
  eyebrowColor,
  accent,
  children,
}: {
  preview: string
  eyebrow?: string
  eyebrowColor?: string
  accent?: string
  children: React.ReactNode
}) {
  const tone = accent ?? eyebrowColor ?? BLUE
  return (
    <Html lang="en" dir="ltr">
      <head dangerouslySetInnerHTML={{ __html: HEAD_HTML }} />
      <Preview>{preview}</Preview>
      <Body className="bp-page" style={main}>
        <table
          role="presentation"
          width="100%"
          cellPadding={0}
          cellSpacing={0}
          border={0}
          className="bp-page"
          style={{ backgroundColor: '#ffffff' }}
        >
          <tbody>
            <tr>
              <td align="center" style={{ padding: '40px 24px 48px' }}>
                <Container width={480} style={{ width: '100%', maxWidth: '480px', textAlign: 'left' }}>
                  <Img
                    className="bp-logo-light"
                    src={LOGO_TILE_URL}
                    width="64"
                    height="64"
                    alt="Blueprint"
                    style={logoBase}
                  />
                  <Img
                    className="bp-logo-dark"
                    src={LOGO_TILE_DARK_URL}
                    width="64"
                    height="64"
                    alt=""
                    style={logoDark}
                  />
                  <div style={{ height: '40px', lineHeight: '40px', fontSize: '1px' }}>&nbsp;</div>
                  {eyebrow ? (
                    <Text
                      className={tone === RED ? 'bp-red' : tone === BLUE ? 'bp-blue' : undefined}
                      style={eyebrowStyle(tone)}
                    >
                      {eyebrow}
                    </Text>
                  ) : null}
                  {themed(children)}
                  <table
                    role="presentation"
                    width="100%"
                    cellPadding={0}
                    cellSpacing={0}
                    border={0}
                    style={{ marginTop: '36px' }}
                  >
                    <tbody>
                      <tr>
                        <td
                          className="bp-rule"
                          style={{ borderTop: `1px solid ${HAIRLINE}`, padding: '20px 0 0' }}
                        >
                          <Text className="bp-hint" style={footer}>
                            <span className="bp-fg" style={{ color: TEXT, fontWeight: 600 }}>
                              Blueprint
                            </span>{' '}
                            · by Arjun IFVG
                          </Text>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </Container>
              </td>
            </tr>
          </tbody>
        </table>
      </Body>
    </Html>
  )
}

export { Heading, Text as EmailText }
