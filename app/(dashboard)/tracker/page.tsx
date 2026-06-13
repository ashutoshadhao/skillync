"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, BarChart3, Trophy, TrendingUp, Clock, X, Loader2, History } from "lucide-react";
import { KanbanBoard } from "@/components/tracker/KanbanBoard";
import type { Application, ApplicationStatus } from "@/types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const STATS = [
  { key: "total",     label: "Total",      icon: BarChart3,  grad: "linear-gradient(135deg, #2dd4bf, #0d9488)" },
  { key: "interview", label: "Interviews", icon: Trophy,     grad: "linear-gradient(135deg, #34d399, #10b981)" },
  { key: "offer",     label: "Offers",     icon: TrendingUp, grad: "linear-gradient(135deg, #fbbf24, #f59e0b)" },
  { key: "pending",   label: "Pending",    icon: Clock,      grad: "linear-gradient(135deg, #818cf8, #6366f1)" },
];

const STATUS_OPTIONS: { value: ApplicationStatus; label: string }[] = [
  { value: "saved",     label: "Saved" },
  { value: "applied",   label: "Applied" },
  { value: "viewed",    label: "Viewed" },
  { value: "interview", label: "Interview" },
  { value: "offer",     label: "Offer" },
  { value: "rejected",  label: "Rejected" },
];

const JOB_TITLE_PRESETS = ["Dev Ops", "AI", "Software Engineer"];

const SALARY_OPTIONS = [
  "0–3 LPA", "3–6 LPA", "6–10 LPA", "10–15 LPA",
  "15–25 LPA", "25–40 LPA", "40+ LPA", "Other…",
];

const LOCATION_OPTIONS = [
  "Remote", "Office",
  "Bangalore", "Mumbai", "Delhi NCR", "Hyderabad", "Pune", "Chennai",
  "Other…",
];

const EMPTY_FORM = {
  company: "", title: "Software Engineer", location: "Remote",
  salary: "", url: "", status: "saved" as ApplicationStatus, notes: "",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  borderRadius: "0.5rem",
  padding: "0.5rem 0.625rem",
  fontSize: "0.875rem",
  color: "#111827",
  outline: "none",
};

export default function TrackerPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [showArchived, setShowArchived] = useState(false);
  const [currentCompensation, setCurrentCompensation] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [locationOther, setLocationOther] = useState(false);
  const [salaryOther, setSalaryOther] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchApplications = useCallback(async (archived: boolean) => {
    try {
      const res = await fetch(`/api/applications?archived=${archived}`);
      const data = await res.json();
      setApplications(data.applications || []);
    } catch {
      toast.error("Failed to load applications");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch("/api/user/employment")
      .then((r) => r.json())
      .then((d) => { if (d?.compensation) setCurrentCompensation(d.compensation); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchApplications(showArchived);
  }, [fetchApplications, showArchived]);

  const handleStatusChange = async (id: string, status: ApplicationStatus) => {
    setApplications((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
    try {
      const res = await fetch("/api/applications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      if (!res.ok) throw new Error();
      toast.success("Status updated");
    } catch {
      toast.error("Failed to update status");
      fetchApplications(showArchived);
    }
  };

  const handleDelete = async (id: string) => {
    setApplications((prev) => prev.filter((a) => a.id !== id));
    try {
      const res = await fetch("/api/applications", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error();
      toast.success("Application removed");
    } catch {
      toast.error("Failed to remove application");
      fetchApplications(showArchived);
    }
  };

  const handleAcceptOffer = async (appId: string, updateEmployment: boolean) => {
    try {
      const res = await fetch("/api/applications/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appId, updateEmployment }),
      });
      if (!res.ok) throw new Error();
      toast.success(
        updateEmployment
          ? "Congrats! Employment profile updated. Your tracker is ready for your next search."
          : "Offer accepted! Search archived."
      );
      fetchApplications(false);
      if (showArchived) setShowArchived(false);
    } catch {
      toast.error("Failed to accept offer");
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.company.trim() && !form.title.trim()) {
      toast.error("Add at least a company or job title");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      toast.success("Application added");
      setForm(EMPTY_FORM);
      setLocationOther(false);
      setSalaryOther(false);
      setShowForm(false);
      fetchApplications(showArchived);
    } catch {
      toast.error("Failed to add application");
    } finally {
      setSubmitting(false);
    }
  };

  const stats = {
    total:     applications.length,
    interview: applications.filter((a) => a.status === "interview").length,
    offer:     applications.filter((a) => a.status === "offer").length,
    pending:   applications.filter((a) => a.status && ["saved", "applied"].includes(a.status)).length,
  };

  const conversionRate =
    stats.total > 0 ? Math.round((stats.interview / stats.total) * 100) : 0;

  const addButton = (
    <button
      onClick={() => setShowForm(true)}
      className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 transition-colors"
    >
      <Plus className="w-4 h-4" />
      Add Application
    </button>
  );

  return (
    <div className="px-4 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Application Tracker</h1>
          <p className="text-sm mt-1 text-gray-500">
            {showArchived ? "Viewing past job search — " : "Track every step of your job search journey"}
            {showArchived && (
              <button onClick={() => setShowArchived(false)} className="underline text-teal-600">
                back to active
              </button>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {!showArchived && (
            <div className="px-3 py-1.5 rounded-full text-sm font-medium bg-teal-50 text-teal-700 ring-1 ring-teal-200">
              {conversionRate}% interview rate
            </div>
          )}
          <button
            onClick={() => setShowArchived(!showArchived)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border transition-colors",
              showArchived
                ? "bg-teal-50 text-teal-700 border-teal-200"
                : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"
            )}
          >
            <History className="w-3.5 h-3.5" />
            Past Searches
          </button>
          {!showArchived && addButton}
        </div>
      </div>

      {/* Stats row (active view only) */}
      {!showArchived && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {STATS.map((s) => {
            const Icon = s.icon;
            const value = stats[s.key as keyof typeof stats];
            return (
              <motion.div
                key={s.key}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl px-4 py-3 flex items-center gap-3 bg-white border border-gray-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-default"
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: s.grad }}>
                  <Icon className="w-3.5 h-3.5 text-white" />
                </div>
                <div>
                  <p className="text-lg font-stat leading-tight" style={{ background: s.grad, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                    {value}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Board */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-teal-600 border-t-transparent animate-spin" />
            <p className="text-sm text-gray-500">Loading…</p>
          </div>
        </div>
      ) : applications.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-teal-50 ring-1 ring-teal-200">
            {showArchived ? <History className="w-8 h-8 text-teal-600" /> : <Plus className="w-8 h-8 text-teal-600" />}
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold text-gray-900">
              {showArchived ? "No past searches" : "No applications yet"}
            </p>
            <p className="text-sm mt-1 text-gray-500">
              {showArchived ? "Accepted offers will be archived here." : "Add your first application to start tracking it here"}
            </p>
          </div>
          {!showArchived && addButton}
        </motion.div>
      ) : (
        <KanbanBoard
          applications={applications}
          currentCompensation={currentCompensation}
          onStatusChange={handleStatusChange}
          onDelete={handleDelete}
          onAcceptOffer={handleAcceptOffer}
          readOnly={showArchived}
        />
      )}

      {/* Add Application modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.5)" }}
            onClick={() => setShowForm(false)}
          >
            <motion.form
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              onSubmit={handleAdd}
              className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-5 space-y-4 max-h-[90vh] overflow-y-auto shadow-xl"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Add Application</h2>
                <button type="button" onClick={() => setShowForm(false)} className="p-1 rounded-lg text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Company */}
              <Field label="Company *">
                <input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} placeholder="e.g. Razorpay" style={inputStyle} />
              </Field>

              {/* Job title */}
              <Field label="Job Title *">
                <div className="flex gap-1.5 mb-1.5">
                  {JOB_TITLE_PRESETS.map((p) => {
                    const active = form.title === p;
                    return (
                      <button key={p} type="button" onClick={() => setForm({ ...form, title: p })}
                        className={cn("px-2.5 py-1 rounded text-xs font-medium transition-colors border",
                          active ? "bg-teal-50 text-teal-700 border-teal-300" : "bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100"
                        )}>
                        {p}
                      </button>
                    );
                  })}
                </div>
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="or type a custom title…" style={inputStyle} />
              </Field>

              {/* Location + Salary */}
              <div className="grid grid-cols-2 gap-3">
                <Field label="Location">
                  <select value={locationOther ? "Other…" : form.location} onChange={(e) => { const v = e.target.value; if (v === "Other…") { setLocationOther(true); setForm({ ...form, location: "" }); } else { setLocationOther(false); setForm({ ...form, location: v }); } }} style={inputStyle}>
                    {LOCATION_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                  {locationOther && <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Enter location…" style={{ ...inputStyle, marginTop: "0.375rem" }} />}
                </Field>
                <Field label="Salary">
                  <select value={salaryOther ? "Other…" : (form.salary || "")} onChange={(e) => { const v = e.target.value; if (v === "Other…") { setSalaryOther(true); setForm({ ...form, salary: "" }); } else { setSalaryOther(false); setForm({ ...form, salary: v }); } }} style={inputStyle}>
                    <option value="">Select range…</option>
                    {SALARY_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                  {salaryOther && <input value={form.salary} onChange={(e) => setForm({ ...form, salary: e.target.value })} placeholder="e.g. 12 LPA or negotiable" style={{ ...inputStyle, marginTop: "0.375rem" }} />}
                </Field>
              </div>

              <Field label="Job link">
                <input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://…" style={inputStyle} />
              </Field>

              <Field label="Status">
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as ApplicationStatus })} style={inputStyle}>
                  {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </Field>

              <Field label="Notes">
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Anything to remember…" rows={3} style={{ ...inputStyle, resize: "none" }} />
              </Field>

              <button type="submit" disabled={submitting}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-60 transition-colors">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                {submitting ? "Adding…" : "Add Application"}
              </button>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-medium text-gray-500">{label}</span>
      {children}
    </label>
  );
}
