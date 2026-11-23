/**
 * Whether the page is running inside another app's embedded browser (Instagram, Facebook, LinkedIn, TikTok,
 * a bare Android WebView, ...). Google refuses OAuth sign-in there ("disallowed_useragent"), so the Google
 * button is hidden and members use the emailed code instead. Browser only: pass `navigator.userAgent`
 * from an effect, never during render on the server.
 */
const EMBEDDED_APP =
  /FBAN|FBAV|FB_IAB|FBIOS|Instagram|LinkedInApp|Snapchat|TikTok|musical_ly|BytedanceWebview|\bLine\/\d|; wv\)/i;

export function isEmbeddedBrowser(userAgent: string): boolean {
  if (EMBEDDED_APP.test(userAgent)) return true;
  // iOS web views leave out the "Safari/" token that Safari, Chrome, Firefox and Edge on iOS all send.
  return /\b(iPhone|iPad|iPod)\b/.test(userAgent) && !/Safari\//.test(userAgent);
}
