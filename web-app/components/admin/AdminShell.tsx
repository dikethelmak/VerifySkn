"use client";

import { useState } from "react";
import {
  LayoutDashboard,
  Package,
  Flag,
  Building2,
  Users,
  ClipboardList,
} from "lucide-react";
import { cn } from "@/lib/utils";
import OverviewTab    from "./OverviewTab";
import ProductsTab   from "./ProductsTab";
import ReportsTab    from "./ReportsTab";
import BrandsTab     from "./BrandsTab";
import SubmissionsTab from "./SubmissionsTab";
import UsersTab      from "./UsersTab";
import type { Product, BrandSubmission, Report, Brand } from "@/lib/database.types";
import type { AdminStats, AdminUser, ActivityItem } from "@/app/admin/page";

// ── Types ─────────────────────────────────────────────────────

type Tab = "Overview" | "Products" | "Reports" | "Brands" | "Submissions" | "Users";

const NAV_ITEMS: { label: Tab; icon: React.ElementType }[] = [
  { label: "Overview",    icon: LayoutDashboard },
  { label: "Products",    icon: Package },
  { label: "Reports",     icon: Flag },
  { label: "Brands",      icon: Building2 },
  { label: "Submissions", icon: ClipboardList },
  { label: "Users",       icon: Users },
];

interface Props {
  stats:              AdminStats;
  activity:           ActivityItem[];
  products:           Product[];
  reports:            Report[];
  brands:             Brand[];
  brandProductCounts: Record<string, number>;
  submissions:        BrandSubmission[];
  users:              AdminUser[];
}

// ── Component ─────────────────────────────────────────────────

export default function AdminShell({
  stats,
  activity,
  products,
  reports,
  brands,
  brandProductCounts,
  submissions,
  users,
}: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("Overview");

  return (
    <div className="flex min-h-screen bg-background">

      {/* ── Sidebar — tablet and up ── */}
      {/*
        md:  64px icon-only
        lg:  240px full labels
        mobile: hidden — navigation is via the bottom tab bar
      */}
      <aside className="hidden md:flex md:w-16 lg:w-60 flex-col bg-[#1A3C2E] shrink-0">
        {/* Wordmark */}
        <div className="flex h-14 shrink-0 items-center gap-3 border-b border-white/10 px-4">
          <svg width="24" height="24" viewBox="0 0 32 32" className="shrink-0" aria-hidden>
            <rect width="32" height="32" rx="7" fill="rgba(255,255,255,0.15)" />
            <polyline
              points="6,7 16,25 26,7"
              fill="none"
              stroke="#C9A84C"
              strokeWidth="4.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          {/* Text: icon-only on md, full on lg */}
          <span className="hidden lg:block font-fraunces text-[18px] font-semibold text-white leading-tight">
            VerifySkn
            <br />
            <span className="text-[11px] font-rethink font-normal text-white/50 tracking-widest uppercase">
              Admin
            </span>
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-2">
          {NAV_ITEMS.map(({ label, icon: Icon }) => {
            const isActive = activeTab === label;
            return (
              <button
                key={label}
                onClick={() => setActiveTab(label)}
                title={label}
                className={cn(
                  "flex w-full items-center gap-3 border-l-4 px-4 py-2.5 font-rethink text-sm font-medium transition-colors",
                  isActive
                    ? "border-[#C9A84C] bg-white text-[#1A3C2E]"
                    : "border-transparent text-white/65 hover:bg-white/10 hover:text-white"
                )}
              >
                <Icon size={17} className="shrink-0" />
                <span className="hidden lg:block">{label}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* ── Main content ── */}
      <div className="flex min-w-0 flex-1 flex-col">

        {/* Mobile page title bar */}
        <div className="flex items-center border-b border-border bg-surface px-4 py-3 md:hidden">
          <span className="font-fraunces text-base font-semibold text-text-primary">
            {activeTab}
          </span>
        </div>

        {/* Tab content — pb-20 leaves room for the mobile bottom bar */}
        <main className="flex-1 overflow-auto p-6 pb-24 md:p-8 md:pb-8">
          {activeTab === "Overview"    && <OverviewTab stats={stats} activity={activity} />}
          {activeTab === "Products"    && <ProductsTab initialProducts={products} />}
          {activeTab === "Reports"     && <ReportsTab initialReports={reports} />}
          {activeTab === "Brands"      && <BrandsTab initialBrands={brands} brandProductCounts={brandProductCounts} />}
          {activeTab === "Submissions" && <SubmissionsTab initialSubmissions={submissions} brands={brands} />}
          {activeTab === "Users"       && <UsersTab initialUsers={users} />}
        </main>
      </div>

      {/* ── Mobile bottom tab bar ── */}
      <nav
        className="fixed bottom-0 inset-x-0 z-40 flex h-16 border-t border-border bg-[#1A3C2E] md:hidden"
        aria-label="Admin navigation"
      >
        {NAV_ITEMS.map(({ label, icon: Icon }) => {
          const isActive = activeTab === label;
          return (
            <button
              key={label}
              onClick={() => setActiveTab(label)}
              aria-label={label}
              aria-current={isActive ? "page" : undefined}
              className="flex flex-1 flex-col items-center justify-center gap-0.5 transition-colors"
            >
              <Icon
                size={19}
                className={cn(
                  "transition-colors",
                  isActive ? "text-[#C9A84C]" : "text-white/45"
                )}
              />
              <span
                className={cn(
                  "font-rethink text-[9px] font-medium transition-colors",
                  isActive ? "text-white" : "text-white/40"
                )}
              >
                {label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
