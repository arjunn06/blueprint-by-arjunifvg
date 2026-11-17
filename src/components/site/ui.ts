// Shared class recipes for the public site. Figma shape rule: buttons are pills (500px), fields and
// cards 20px, panels 24px. Type is Inter Medium 14px at -2% tracking.
const base =
  "inline-flex h-[49px] items-center justify-center gap-1 whitespace-nowrap rounded-full px-5 text-btn transition duration-200 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none";

/** Buttons/Primary: #262626 fill, white label. Disabled is the flat grey from the design. */
export const btnPrimary = `${base} bg-primary text-primary-foreground hover:opacity-90 disabled:bg-primary-disabled disabled:text-primary-disabled-foreground`;
/** Buttons/Secondary: #f9f9f9 fill, hairline border, soft glow. */
export const btnSecondary = `${base} border border-border bg-surface-2 text-foreground shadow-btn hover:bg-hover disabled:opacity-60`;
export const btnGhost = btnSecondary;
/** Buttons/Medium: the compact size used in toolbars and nav. */
export const btnSm = "!h-11 !px-4";
export const btnLink =
  "inline-flex items-center gap-1.5 text-body font-medium text-foreground underline decoration-border decoration-1 underline-offset-[6px] transition-colors hover:decoration-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring";

export const container = "mx-auto w-full max-w-[1240px] px-5 sm:px-8";
