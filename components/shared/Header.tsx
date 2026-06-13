"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Menu, X, Zap, LayoutDashboard, Kanban, FileText, Bell, Settings } from "lucide-react";
import { UserButton, ClerkLoaded, ClerkLoading } from "@clerk/nextjs";
import { Loader2 } from "lucide-react";
import { NotificationBell } from "@/components/shared/NotificationBell";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/tracker", label: "Tracker", icon: Kanban },
  { href: "/resume", label: "Resume", icon: FileText },
  { href: "/alerts", label: "Alerts", icon: Bell },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function DashboardHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const currentPage = navItems.find(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`)
  );

  return (
    <>
      <header
        className="lg:hidden fixed top-0 left-0 right-0 z-50 border-b h-14 flex items-center px-4 justify-between bg-white/95 border-gray-200"
        style={{ backdropFilter: "blur(8px)" }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg text-gray-700"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #0d9488, #6366f1)" }}
            >
              <Zap className="w-3 h-3 text-white" />
            </div>
            <span className="font-bold text-gray-900">Skillync</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">{currentPage?.label}</span>
          <NotificationBell />
          <ClerkLoaded>
            <UserButton afterSignOutUrl="/" />
          </ClerkLoaded>
          <ClerkLoading>
            <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
          </ClerkLoading>
        </div>
      </header>

      {/* Mobile drawer */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div className="absolute inset-0 bg-gray-900/40" />
          <nav
            className="absolute left-0 top-14 bottom-0 w-64 border-r p-4 bg-white border-gray-200"
            onClick={(e) => e.stopPropagation()}
          >
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <button
                  key={item.href}
                  onClick={() => { router.push(item.href); setMobileMenuOpen(false); }}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium w-full text-left transition-colors mb-1",
                    isActive
                      ? "bg-teal-50 text-teal-700"
                      : "text-gray-500 hover:bg-gray-100"
                  )}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>
      )}
    </>
  );
}
