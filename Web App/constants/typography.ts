/**
 * Typography tokens — Tailwind class strings for reuse across components.
 *
 * display / heading            → Fraunces (serif accent)
 * subheading / body / label    → Rethink Sans
 * mono                         → Space Mono (barcodes, batch codes, technical data)
 */
export const typography = {
  /** Hero-level text. Fraunces 48px bold. */
  display: "font-fraunces text-5xl font-semibold leading-tight tracking-tight text-text-primary",

  /** Section headings. Fraunces 32px semibold. */
  heading: "font-fraunces text-3xl font-semibold leading-snug text-text-primary",

  /** Sub-section headings. Fraunces 22px regular. */
  subheading: "font-fraunces text-xl font-normal leading-snug text-text-primary",

  /** Standard body copy. Rethink Sans 16px regular. */
  body: "font-rethink text-base font-normal leading-relaxed text-text-primary",

  /** Small body copy. Rethink Sans 14px regular. */
  bodySmall: "font-rethink text-sm font-normal leading-relaxed text-text-secondary",

  /** All-caps label / tag. Rethink Sans 11px medium. */
  label: "font-rethink text-xs font-medium uppercase tracking-widest text-text-secondary",

  /** Batch codes, barcodes, technical IDs. Space Mono 13px. */
  mono: "font-mono text-sm tracking-wide text-text-primary",
} as const;

export type TypographyKey = keyof typeof typography;
