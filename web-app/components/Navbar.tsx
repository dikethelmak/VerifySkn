"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";

const PUBLIC_NAV: { label: string; href: string }[] = [
  { label: "About",   href: "/about"   },
  { label: "Support", href: "/support" },
];

const FOREST = "#0b1e0f";
const LIME   = "#7dc98a";
const BORDER = "rgba(255,255,255,0.07)";

export function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Home page has its own inline nav
  if (pathname === "/") return null;

  return (
    <header
      className="fixed inset-x-0 top-0 z-50"
      style={{ background: FOREST, borderBottom: `0.5px solid ${BORDER}`, height: "56px" }}
    >
      <div className="flex h-full items-center justify-between px-4 sm:px-8">

        {/* ── Wordmark ── */}
        <Link
          href="/"
          className="text-[17px] font-semibold leading-none text-white"
          style={{ fontFamily: "var(--font-syne, system-ui)", letterSpacing: "-0.04em", textDecoration: "none" }}
        >
          .verify<span style={{ color: LIME }}>skn</span>
        </Link>

        {/* ── Desktop links ── */}
        <nav className="hidden sm:flex items-center gap-7">
          {PUBLIC_NAV.map(({ label, href }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                className="text-xs transition-colors hover:text-white"
                style={{
                  color: active ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.4)",
                  textDecoration: "none",
                }}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        {/* ── Mobile hamburger ── */}
        <button
          className="flex sm:hidden items-center justify-center p-2 transition-colors"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Close menu" : "Open menu"}
          style={{ color: "rgba(255,255,255,0.5)" }}
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* ── Mobile dropdown ── */}
      {open && (
        <div
          className="sm:hidden absolute inset-x-0 top-[56px]"
          style={{ background: FOREST, borderBottom: `0.5px solid ${BORDER}` }}
        >
          {PUBLIC_NAV.map(({ label, href }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className="block px-4 py-3.5 text-sm transition-colors"
                style={{
                  color: active ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.5)",
                  borderTop: `0.5px solid ${BORDER}`,
                  textDecoration: "none",
                }}
              >
                {label}
              </Link>
            );
          })}
        </div>
      )}
    </header>
  );
}
