export const colors = {
  primary: "#1A3C2E",
  accent: "#C9A84C",
  background: "#F7F5F2",
  foreground: "#111111",
  muted: "#6B7280",
  border: "#E5E0D8",
  white: "#FFFFFF",

  // Semantic
  authentic: "#16A34A",
  suspicious: "#DC2626",
  unverified: "#D97706",
} as const;

export type ColorKey = keyof typeof colors;
