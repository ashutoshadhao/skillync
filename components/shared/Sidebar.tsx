"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Kanban, FileText, Bell, Settings,
  Zap
} from "lucide-react";
import { UserButton, ClerkLoaded, ClerkLoading, useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/tracker", label: "Tracker", icon: Kanban },
  { href: "/resume", label: "Resume", icon: FileText },
  { href: "/alerts", label: "Alerts", icon: Bell },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, isSignedIn } = useUser();
  const [dbName, setDbName] = useState<string | null>(null);

  useEffect(() => {
    if (!isSignedIn) return;
    fetch("/api/user/sync", { method: "POST" })
      .then((r) => r.json())
      .then((data) => { if (data?.name) setDbName(data.name); })
      .catch(() => {});
  }, [isSignedIn]);

  const displayName =
    dbName ||
    `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim() ||
    user?.primaryEmailAddress?.emailAddress ||
    "Account";

  return (
    <aside className="hidden lg:flex flex-col w-60 min-h-screen fixed left-0 top-0 bottom-0 z-40 bg-white border-r border-gray-200">
      {/* Logo */}
      <div className="p-6 pb-4 flex items-center">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-[10px] flex items-center justify-center shrink-0"
            style={{ background: "linear-gradient(135deg, #0d9488, #6366f1)" }}
          >
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-lg text-gray-900">Skillync</span>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-2 space-y-0.5">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl transition-colors",
                isActive
                  ? "bg-teal-50 text-teal-700"
                  : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"
              )}
            >
              {isActive && (
                <span
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] rounded-r-full"
                  style={{ height: "70%", background: "#0d9488" }}
                />
              )}
              <item.icon className="w-4 h-4 ml-0.5 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-3 px-1 py-2">
          <ClerkLoaded>
            <div
              className="shrink-0 rounded-full p-[2px]"
              style={{ background: "#0d9488" }}
            >
              <UserButton afterSignOutUrl="/" />
            </div>
          </ClerkLoaded>
          <ClerkLoading>
            <div className="w-8 h-8 rounded-full animate-pulse bg-gray-200" />
          </ClerkLoading>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate text-gray-900">{displayName}</p>
            <p className="text-xs truncate text-gray-500">
              {user?.primaryEmailAddress?.emailAddress}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
