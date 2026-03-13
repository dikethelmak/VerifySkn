/**
 * Typography tokens
 * display/heading → Fraunces (serif accent)
 * body/label      → Rethink Sans
 * mono            → Space Mono (barcodes, batch codes)
 */
export const typography = {
  display: "font-display text-5xl font-bold leading-tight tracking-tight",
  heading: "font-display text-3xl font-semibold leading-snug",
  subheading: "font-sans text-xl font-semibold leading-snug",
  body: "font-sans text-base leading-relaxed",
  bodySmall: "font-sans text-sm leading-relaxed",
  label: "font-sans text-xs font-medium uppercase tracking-wide",
  mono: "font-mono text-sm tracking-wide",
} as const;

export type TypographyKey = keyof typeof typography;
