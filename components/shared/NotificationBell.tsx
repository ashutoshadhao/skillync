"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import Link from "next/link";
import type { Notification } from "@/types";

export function NotificationBell() {
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      if (!res.ok) return;
      const data = await res.json();
      setItems(data.notifications || []);
      setUnread(data.unread || 0);
    } catch {
      /* silent — bell is non-critical */
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 60_000);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const markAllRead = async () => {
    setUnread(0);
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAll: true }),
    }).catch(() => {});
  };

  const toggle = () => {
    setOpen((o) => {
      const next = !o;
      if (next && unread > 0) markAllRead();
      return next;
    });
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={toggle}
        className="relative p-2 rounded-lg transition-colors text-gray-500 hover:text-gray-700 hover:bg-gray-100"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unread > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full text-[10px] font-bold flex items-center justify-center text-white bg-rose-500"
          >
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-xl z-50">
          <div className="px-4 py-3 border-b border-gray-100 text-sm font-semibold text-gray-900">
            Notifications
          </div>
          {items.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-gray-500">
              No notifications yet
            </div>
          ) : (
            items.map((n) => {
              const inner = (
                <>
                  <p className="text-sm font-medium text-gray-900">{n.title}</p>
                  {n.body && <p className="text-xs mt-0.5 leading-snug text-gray-500">{n.body}</p>}
                </>
              );
              return n.jobId ? (
                <Link key={n.id} href={`/job/${n.jobId}`} onClick={() => setOpen(false)} className="block px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  {inner}
                </Link>
              ) : (
                <div key={n.id} className="px-4 py-3 border-b border-gray-100">
                  {inner}
                </div>
              );
            })
          )}
          <Link href="/alerts" onClick={() => setOpen(false)} className="block px-4 py-2.5 text-center text-xs text-teal-600 hover:text-teal-700">
            Manage alerts →
          </Link>
        </div>
      )}
    </div>
  );
}
