"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const PUBLIC_NAV: { label: string; href: string }[] = [
  { label: "About", href: "/about" },
];

const FOREST = "#0b1e0f";
const LIME   = "#7dc98a";
const BORDER = "rgba(255,255,255,0.07)";

export function Navbar() {
  const pathname = usePathname();

  // Home page has its own inline nav
  if (pathname === "/") return null;

  const visibleNav = PUBLIC_NAV.filter(
    ({ href }) => pathname !== href && !pathname.startsWith(href + "/")
  );

  return (
    <header
      className="fixed inset-x-0 top-0 z-50 flex items-center justify-between px-4 sm:px-8"
      style={{ background: FOREST, borderBottom: `0.5px solid ${BORDER}`, height: "56px" }}
    >
      {/* ── Wordmark ── */}
      <Link
        href="/"
        className="text-[17px] font-semibold leading-none text-white"
        style={{ fontFamily: "var(--font-syne, system-ui)", letterSpacing: "-0.04em", textDecoration: "none" }}
      >
        .verify<span style={{ color: LIME }}>skn</span>
      </Link>

      {/* ── Links ── */}
      {visibleNav.length > 0 && (
        <div className="flex items-center gap-7">
          {visibleNav.map(({ label, href }) => (
            <Link
              key={href}
              href={href}
              className="text-xs transition-colors hover:text-white"
              style={{ color: "rgba(255,255,255,0.4)", textDecoration: "none" }}
            >
              {label}
            </Link>
          ))}
        </div>
      )}
    </header>
  );
}
