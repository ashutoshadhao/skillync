"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Bell, Plus, Trash2, Loader2, Mail, MapPin, Search, BellOff } from "lucide-react";
import type { Alert } from "@/types";
import { toast } from "sonner";

const FREQUENCIES = ["daily", "weekly"] as const;

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [hasEmailConfig, setHasEmailConfig] = useState(false);
  const [form, setForm] = useState({
    keyword: "",
    location: "",
    minSalary: "",
    isRemote: false,
    frequency: "daily" as "daily" | "weekly",
  });
  const [saving, setSaving] = useState(false);

  const fetchAlerts = useCallback(async () => {
    try {
      const [alertsRes] = await Promise.allSettled([fetch("/api/alerts")]);
      if (alertsRes.status === "fulfilled" && alertsRes.value.ok) {
        const data = await alertsRes.value.json();
        setAlerts(data.alerts || []);
      }
    } catch {
      toast.error("Failed to load alerts");
    } finally {
      setLoading(false);
    }
  }, []);

  // Check if email is configured via localStorage hint
  useEffect(() => {
    fetchAlerts();
    setHasEmailConfig(!!localStorage.getItem("skillync_smtp_configured"));
  }, [fetchAlerts]);

  const createAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.keyword.trim()) {
      toast.error("Keyword is required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keywords: [form.keyword.trim()],
          location: form.location.trim() || null,
          salaryMin: form.minSalary ? parseInt(form.minSalary) * 100000 : null,
          remoteOnly: form.isRemote,
          frequency: form.frequency,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Alert created!");
      setForm({ keyword: "", location: "", minSalary: "", isRemote: false, frequency: "daily" });
      setShowForm(false);
      fetchAlerts();
    } catch {
      toast.error("Failed to create alert");
    } finally {
      setSaving(false);
    }
  };

  const deleteAlert = async (id: string) => {
    setAlerts((a) => a.filter((x) => x.id !== id));
    try {
      await fetch(`/api/alerts?id=${id}`, { method: "DELETE" });
      toast.success("Alert deleted");
    } catch {
      fetchAlerts();
      toast.error("Delete failed");
    }
  };

  return (
    <div className="px-4 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Job Alerts
          </h1>
          <p className="text-sm mt-1 text-gray-500">
            Get notified when new matching jobs are posted
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white"
          style={{ background: "linear-gradient(135deg, #0d9488, #6366f1)", boxShadow: "0 0 16px #0d948840" }}
        >
          <Plus className="w-4 h-4" />
          New Alert
        </button>
      </div>

      {/* Email warning */}
      {!hasEmailConfig && (
        <div
          className="rounded-xl p-4 flex items-center gap-3"
          style={{ background: "#f59e0b11", border: "1px solid #f59e0b44" }}
        >
          <Mail className="w-5 h-5 shrink-0" style={{ color: "#f59e0b" }} />
          <div className="flex-1">
            <p className="text-sm font-medium" style={{ color: "#f59e0b" }}>
              SMTP not configured
            </p>
            <p className="text-xs mt-0.5 text-gray-600">
              Alerts won&apos;t be emailed until you{" "}
              <a href="/settings" className="underline" style={{ color: "#f59e0b" }}>
                configure your SMTP settings
              </a>
              .
            </p>
          </div>
        </div>
      )}

      {/* Create form */}
      {showForm && (
        <motion.form
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={createAlert}
          className="rounded-2xl p-6 space-y-4"
          style={{ background: "#162020", border: "1px solid #1e3030" }}
        >
          <h2 className="text-base font-semibold" style={{ color: "#e0faf8", fontFamily: "'Space Grotesk', sans-serif" }}>
            Create Alert
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium" style={{ color: "#7a9e9c" }}>
                Keyword *
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#7a9e9c" }} />
                <input
                  type="text"
                  value={form.keyword}
                  onChange={(e) => setForm({ ...form, keyword: e.target.value })}
                  placeholder="e.g. React Developer"
                  className="w-full pl-9 pr-3 py-2 rounded-lg border text-sm"
                  style={{ background: "#162020", borderColor: "#1e3030", color: "#e0faf8" }}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium" style={{ color: "#7a9e9c" }}>
                Location
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#7a9e9c" }} />
                <input
                  type="text"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  placeholder="e.g. Bangalore"
                  className="w-full pl-9 pr-3 py-2 rounded-lg border text-sm"
                  style={{ background: "#162020", borderColor: "#1e3030", color: "#e0faf8" }}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium" style={{ color: "#7a9e9c" }}>
                Min Salary (LPA)
              </label>
              <input
                type="number"
                value={form.minSalary}
                onChange={(e) => setForm({ ...form, minSalary: e.target.value })}
                placeholder="e.g. 10"
                min={0}
                className="w-full px-3 py-2 rounded-lg border text-sm"
                style={{ background: "#162020", borderColor: "#1e3030", color: "#e0faf8" }}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium" style={{ color: "#7a9e9c" }}>
                Frequency
              </label>
              <select
                value={form.frequency}
                onChange={(e) => setForm({ ...form, frequency: e.target.value as "daily" | "weekly" })}
                className="w-full px-3 py-2 rounded-lg border text-sm"
                style={{ background: "#162020", borderColor: "#1e3030", color: "#e0faf8" }}
              >
                {FREQUENCIES.map((f) => (
                  <option key={f} value={f} style={{ background: "#162020" }}>
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.isRemote}
              onChange={(e) => setForm({ ...form, isRemote: e.target.checked })}
              className="w-4 h-4 rounded accent-violet-600"
            />
            <span className="text-sm" style={{ color: "#e0faf8" }}>
              Remote only
            </span>
          </label>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white"
              style={{ background: "linear-gradient(135deg, #0d9488, #6366f1)" }}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bell className="w-4 h-4" />}
              Create Alert
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 rounded-lg text-sm font-medium"
              style={{ background: "#162020", color: "#7a9e9c", border: "1px solid #1e3030" }}
            >
              Cancel
            </button>
          </div>
        </motion.form>
      )}

      {/* Alerts list */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: "#0d9488" }} />
        </div>
      ) : alerts.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-20 gap-4"
        >
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{ background: "#0d948820", border: "1px solid #0d948840" }}
          >
            <BellOff className="w-8 h-8" style={{ color: "#0d9488" }} />
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold text-gray-900" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              No alerts yet
            </p>
            <p className="text-sm mt-1 text-gray-500">
              Create an alert to be notified of new matching jobs
            </p>
          </div>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {alerts.map((alert) => (
            <motion.div
              key={alert.id}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-2xl p-5 space-y-3 border transition-all duration-300"
              style={{ background: "#162020", borderColor: "#1e3030" }}
            >
              <div className="flex items-start justify-between gap-2">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: "#0d948820" }}
                >
                  <Bell className="w-4 h-4" style={{ color: "#0d9488" }} />
                </div>
                <button
                  onClick={() => deleteAlert(alert.id)}
                  className="p-1.5 rounded-lg hover:bg-red-500/10 transition-colors"
                >
                  <Trash2 className="w-4 h-4" style={{ color: "#f43f5e" }} />
                </button>
              </div>

              <div>
                <p className="font-semibold" style={{ color: "#e0faf8", fontFamily: "'Space Grotesk', sans-serif" }}>
                  {alert.keywords?.[0] ?? "Alert"}
                </p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {alert.location && (
                    <span
                      className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs"
                      style={{ background: "#1e2e2e", color: "#7a9e9c" }}
                    >
                      <MapPin className="w-3 h-3" />
                      {alert.location}
                    </span>
                  )}
                  {alert.remoteOnly && (
                    <span
                      className="px-2 py-0.5 rounded-full text-xs"
                      style={{ background: "#6366f120", color: "#818cf8" }}
                    >
                      Remote
                    </span>
                  )}
                  {alert.salaryMin && (
                    <span
                      className="px-2 py-0.5 rounded-full text-xs"
                      style={{ background: "#10b98120", color: "#10b981" }}
                    >
                      ₹{(alert.salaryMin / 100000).toFixed(0)}L+
                    </span>
                  )}
                  <span
                    className="px-2 py-0.5 rounded-full text-xs"
                    style={{ background: "#0d948820", color: "#2dd4bf" }}
                  >
                    {alert.frequency}
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
