/** The IFVG Journal (journal.ifvg.in): a separate app, included free with the Blue and Red Pill. See journal-sync.server.ts. */
export const JOURNAL_URL = "https://journal.ifvg.in";

/**
 * Memberships (`subscriptions.pill`) that include the journal. Both pills do. The Red Pill is a one-month live
 * programme, so its journal access runs for the same month as its library access, not longer.
 */
export const JOURNAL_PILLS: readonly string[] = ["blue", "red"];
