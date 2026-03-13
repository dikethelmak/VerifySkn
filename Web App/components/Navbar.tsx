"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "Scan", href: "/scan" },
  { label: "History", href: "/history" },
] as const;

export function Navbar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  // Close mobile menu on route change
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  return (
    <header className="fixed inset-x-0 top-0 z-50 h-16 border-b border-border bg-surface">
      <nav className="mx-auto flex h-full max-w-5xl items-center justify-between px-5">
        {/* ── Wordmark ── */}
        <Link
          href="/"
          className="font-fraunces text-[22px] font-semibold leading-none text-primary"
        >
          VerifySkn
        </Link>

        {/* ── Desktop links ── */}
        <ul className="hidden items-center gap-7 md:flex">
          {NAV_LINKS.map(({ label, href }) => {
            const active = pathname === href;
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={cn(
                    "relative pb-0.5 font-rethink text-sm font-medium transition-colors",
                    active
                      ? "text-primary"
                      : "text-text-secondary hover:text-text-primary"
                  )}
                >
                  {label}
                  {active && (
                    <motion.span
                      layoutId="nav-underline"
                      className="absolute inset-x-0 -bottom-0.5 h-[2px] rounded-full bg-primary"
                    />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>

        {/* ── Hamburger (mobile) ── */}
        <button
          onClick={() => setIsOpen((o) => !o)}
          aria-label={isOpen ? "Close menu" : "Open menu"}
          aria-expanded={isOpen}
          className="flex h-9 w-9 flex-col items-center justify-center gap-[5px] rounded-md md:hidden"
        >
          <motion.span
            animate={isOpen ? { rotate: 45, y: 7 } : { rotate: 0, y: 0 }}
            transition={{ duration: 0.2 }}
            className="block h-[2px] w-5 origin-center rounded-full bg-text-primary"
          />
          <motion.span
            animate={isOpen ? { opacity: 0, scaleX: 0 } : { opacity: 1, scaleX: 1 }}
            transition={{ duration: 0.15 }}
            className="block h-[2px] w-5 rounded-full bg-text-primary"
          />
          <motion.span
            animate={isOpen ? { rotate: -45, y: -7 } : { rotate: 0, y: 0 }}
            transition={{ duration: 0.2 }}
            className="block h-[2px] w-5 origin-center rounded-full bg-text-primary"
          />
        </button>
      </nav>

      {/* ── Mobile dropdown ── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22, ease: "easeInOut" }}
            className="overflow-hidden border-b border-border bg-surface md:hidden"
          >
            <ul className="flex flex-col px-5 py-4 gap-1">
              {NAV_LINKS.map(({ label, href }) => {
                const active = pathname === href;
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      className={cn(
                        "block rounded-lg px-3 py-2.5 font-rethink text-base font-medium transition-colors",
                        active
                          ? "bg-primary/8 text-primary"
                          : "text-text-secondary hover:bg-background hover:text-text-primary"
                      )}
                      style={
                        active ? { backgroundColor: "rgba(26,60,46,0.07)" } : {}
                      }
                    >
                      {label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
