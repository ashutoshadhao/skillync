"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  User,
  Mail,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  Send,
  Eye,
  EyeOff,
  Briefcase,
  Laptop,
} from "lucide-react";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";

type Tab = "profile" | "employment" | "freelancing" | "email" | "danger";

const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: "profile",     label: "Profile",     icon: <User className="w-4 h-4" /> },
  { key: "employment",  label: "Employment",  icon: <Briefcase className="w-4 h-4" /> },
  { key: "freelancing", label: "Freelancing", icon: <Laptop className="w-4 h-4" /> },
  { key: "email",       label: "Email",       icon: <Mail className="w-4 h-4" /> },
  { key: "danger",      label: "Danger Zone", icon: <AlertTriangle className="w-4 h-4" /> },
];

// ── Profile Tab ─────────────────────────────────────────────────────────────
function ProfileTab() {
  const { user } = useUser();
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(
    `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim()
  );

  const save = async () => {
    setSaving(true);
    try {
      const parts = name.trim().split(" ");
      // Update Clerk
      await user?.update({
        firstName: parts[0] ?? "",
        lastName: parts.slice(1).join(" ") || undefined,
      });
      // Sync to DB
      await fetch("/api/user/sync", { method: "POST" });
      toast.success("Profile updated");
    } catch {
      toast.error("Update failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-lg space-y-5">
      <div className="flex items-center gap-4">
        {user?.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.imageUrl}
            alt="Avatar"
            className="w-16 h-16 rounded-full border-2"
            style={{ borderColor: "#0d948844" }}
          />
        )}
        <div>
          <p className="font-semibold text-gray-900">
            {user?.primaryEmailAddress?.emailAddress}
          </p>
          <p className="text-sm mt-0.5 text-gray-500">
            Manage avatar via Clerk profile
          </p>
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-gray-600">
          Full Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border text-sm text-gray-900 bg-white"
          style={{ borderColor: "#d1d5db" }}
        />
      </div>

      <button
        onClick={save}
        disabled={saving}
        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white"
        style={{ background: "linear-gradient(135deg, #0d9488, #6366f1)" }}
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Changes"}
      </button>
    </div>
  );
}

// ── Employment Tab ───────────────────────────────────────────────────────────
const EMPLOYMENT_TYPES = ["full-time", "part-time", "contract", "internship"];

const settingsInput: React.CSSProperties = {
  width: "100%",
  background: "#ffffff",
  border: "1px solid #d1d5db",
  borderRadius: "0.5rem",
  padding: "0.5rem 0.75rem",
  fontSize: "0.875rem",
  color: "#111827",
  outline: "none",
};

function EmploymentTab() {
  const [form, setForm] = useState({
    company: "", role: "", employmentType: "full-time",
    compensation: "", startDate: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/user/employment")
      .then((r) => r.json())
      .then((data) => {
        if (data) setForm({
          company: data.company ?? "",
          role: data.role ?? "",
          employmentType: data.employmentType ?? "full-time",
          compensation: data.compensation ?? "",
          startDate: data.startDate ?? "",
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/user/employment", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      toast.success("Employment details saved");
    } catch { toast.error("Failed to save"); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin" style={{ color: "#0d9488" }} /></div>;

  return (
    <div className="max-w-lg space-y-5">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, #0d9488, #6366f1)", boxShadow: "0 0 12px #0d948850" }}>
          <Briefcase className="w-3.5 h-3.5 text-white" />
        </div>
        <h3 className="text-sm font-semibold text-gray-900" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Current Job</h3>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {[
          { key: "company",     label: "Company",          ph: "e.g. Infosys" },
          { key: "role",        label: "Role / Title",     ph: "e.g. Software Engineer" },
          { key: "compensation",label: "Compensation",     ph: "e.g. 18 LPA" },
          { key: "startDate",   label: "Start Date",       ph: "e.g. Jan 2023" },
        ].map(({ key, label, ph }) => (
          <div key={key} className="space-y-1">
            <label className="text-xs font-medium text-gray-600">{label}</label>
            <input value={form[key as keyof typeof form]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} placeholder={ph} style={settingsInput} />
          </div>
        ))}

        <div className="space-y-1 col-span-2">
          <label className="text-xs font-medium text-gray-600">Employment Type</label>
          <select value={form.employmentType} onChange={(e) => setForm({ ...form, employmentType: e.target.value })} style={settingsInput}>
            {EMPLOYMENT_TYPES.map((t) => (
              <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
            ))}
          </select>
        </div>
      </div>

      <button onClick={save} disabled={saving} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-60" style={{ background: "linear-gradient(135deg, #0d9488, #6366f1)" }}>
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Changes"}
      </button>
    </div>
  );
}

// ── Freelancing Tab ──────────────────────────────────────────────────────────
function FreelancingTab() {
  const [form, setForm] = useState({
    hasFreelancing: false, freelanceIncome: "", freelanceType: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/user/employment")
      .then((r) => r.json())
      .then((data) => {
        if (data) setForm({
          hasFreelancing: data.hasFreelancing ?? false,
          freelanceIncome: data.freelanceIncome ?? "",
          freelanceType: data.freelanceType ?? "",
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/user/employment", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      toast.success("Freelancing details saved");
    } catch { toast.error("Failed to save"); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin" style={{ color: "#0d9488" }} /></div>;

  return (
    <div className="max-w-lg space-y-5">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, #6366f1, #a78bfa)", boxShadow: "0 0 12px #6366f150" }}>
          <Laptop className="w-3.5 h-3.5 text-white" />
        </div>
        <h3 className="text-sm font-semibold text-gray-900" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Freelancing Income</h3>
      </div>

      <div
        className="rounded-xl p-4"
        style={{ background: "#6366f111", border: "1px solid #6366f133" }}
      >
        <p className="text-sm" style={{ color: "#a78bfa" }}>
          Track additional income alongside your main role. Freelance income is kept separate so the hike calculator on the Tracker uses only your primary compensation.
        </p>
      </div>

      {/* Toggle */}
      <button type="button" onClick={() => setForm({ ...form, hasFreelancing: !form.hasFreelancing })} className="flex items-center gap-3 w-full text-left">
        <div className="w-10 h-5 rounded-full transition-colors relative flex-shrink-0" style={{ background: form.hasFreelancing ? "#6366f1" : "#d1d5db" }}>
          <div className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform" style={{ transform: form.hasFreelancing ? "translateX(1.25rem)" : "translateX(0.125rem)" }} />
        </div>
        <div>
          <p className="text-sm font-medium text-gray-900">I do freelancing</p>
          <p className="text-xs text-gray-500">Enable to log your freelance earnings</p>
        </div>
      </button>

      {form.hasFreelancing && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">Income</label>
            <input value={form.freelanceIncome} onChange={(e) => setForm({ ...form, freelanceIncome: e.target.value })} placeholder="e.g. ₹50k/mo" style={settingsInput} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">Type of Work</label>
            <input value={form.freelanceType} onChange={(e) => setForm({ ...form, freelanceType: e.target.value })} placeholder="e.g. Web dev, UI design" style={settingsInput} />
          </div>
        </motion.div>
      )}

      <button onClick={save} disabled={saving} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-60" style={{ background: "linear-gradient(135deg, #6366f1, #a78bfa)" }}>
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Changes"}
      </button>
    </div>
  );
}

// ── Email / SMTP Tab ─────────────────────────────────────────────────────────
function EmailTab() {
  const [form, setForm] = useState({
    smtp_host: "",
    smtp_port: "587",
    smtp_user: "",
    smtp_pass: "",
    from_email: "",
  });
  const [showPass, setShowPass] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [tested, setTested] = useState(false);

  const saveAndTest = async () => {
    if (!form.smtp_host || !form.smtp_user || !form.smtp_pass || !form.from_email) {
      toast.error("Please fill all SMTP fields");
      return;
    }
    setTesting(true);
    try {
      const res = await fetch("/api/email/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, smtp_port: parseInt(form.smtp_port) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Test failed");
      toast.success("Test email sent! Check your inbox.");
      setTested(true);
      localStorage.setItem("skillync_smtp_configured", "1");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "SMTP test failed");
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/email/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, smtp_port: parseInt(form.smtp_port), skipTest: true }),
      });
      if (!res.ok) throw new Error();
      toast.success("SMTP settings saved");
      localStorage.setItem("skillync_smtp_configured", "1");
    } catch {
      toast.error("Save failed");
    } finally {
      setSaving(false);
    }
  };

  const fields: { key: keyof typeof form; label: string; type?: string; placeholder: string }[] = [
    { key: "smtp_host", label: "SMTP Host", placeholder: "smtp.gmail.com" },
    { key: "smtp_port", label: "SMTP Port", type: "number", placeholder: "587" },
    { key: "smtp_user", label: "SMTP Username", placeholder: "you@gmail.com" },
    { key: "smtp_pass", label: "SMTP Password", type: showPass ? "text" : "password", placeholder: "••••••••" },
    { key: "from_email", label: "From Email", placeholder: "alerts@yourdomain.com" },
  ];

  return (
    <div className="max-w-lg space-y-5">
      <div
        className="rounded-xl p-4"
        style={{ background: "#2dd4bf11", border: "1px solid #2dd4bf44" }}
      >
        <p className="text-sm" style={{ color: "#2dd4bf" }}>
          Configure SMTP to receive daily/weekly job alert digests in your inbox.
        </p>
      </div>

      {fields.map((f) => (
        <div key={f.key} className="space-y-1.5">
          <label className="text-xs font-medium text-gray-600">
            {f.label}
          </label>
          <div className="relative">
            <input
              type={f.type ?? "text"}
              value={form[f.key]}
              onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
              placeholder={f.placeholder}
              className="w-full px-3 py-2 rounded-lg border text-sm pr-10 text-gray-900 bg-white"
              style={{ borderColor: "#d1d5db" }}
            />
            {f.key === "smtp_pass" && (
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                {showPass ? (
                  <EyeOff className="w-4 h-4 text-gray-400" />
                ) : (
                  <Eye className="w-4 h-4 text-gray-400" />
                )}
              </button>
            )}
          </div>
        </div>
      ))}

      <div className="flex gap-3">
        <button
          onClick={saveAndTest}
          disabled={testing}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white"
          style={{ background: "linear-gradient(135deg, #0d9488, #2dd4bf)" }}
        >
          {testing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : tested ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : (
            <Send className="w-4 h-4" />
          )}
          {tested ? "Tested ✓" : "Send Test Email"}
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-gray-700 bg-white border border-gray-200 hover:bg-gray-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
        </button>
      </div>
    </div>
  );
}

// ── Danger Zone Tab ──────────────────────────────────────────────────────────
function DangerTab() {
  const { user } = useUser();
  const [confirm, setConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);

  const deleteAccount = async () => {
    if (confirm !== "DELETE") {
      toast.error('Type "DELETE" to confirm');
      return;
    }
    setDeleting(true);
    try {
      await user?.delete();
      toast.success("Account deleted. Goodbye!");
    } catch {
      toast.error("Failed to delete account");
      setDeleting(false);
    }
  };

  return (
    <div className="max-w-lg space-y-5">
      <div
        className="rounded-2xl p-6 space-y-4"
        style={{ background: "#f43f5e11", border: "1px solid #f43f5e44" }}
      >
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" style={{ color: "#f43f5e" }} />
          <h3 className="font-semibold" style={{ color: "#f43f5e" }}>
            Delete Account
          </h3>
        </div>
        <p className="text-sm text-gray-600">
          This will permanently delete your account, all resumes, matches, and applications.
          This action <strong style={{ color: "#f43f5e" }}>cannot be undone</strong>.
        </p>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-gray-600">
            Type <strong style={{ color: "#f43f5e" }}>DELETE</strong> to confirm
          </label>
          <input
            type="text"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="DELETE"
            className="w-full px-3 py-2 rounded-lg border text-sm"
            style={{ background: "#fff", borderColor: "#f43f5e66", color: "#111827" }}
          />
        </div>
        <button
          onClick={deleteAccount}
          disabled={deleting || confirm !== "DELETE"}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-40"
          style={{ background: "#f43f5e" }}
        >
          {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlertTriangle className="w-4 h-4" />}
          Delete My Account
        </button>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("profile");

  const TAB_CONTENT: Record<Tab, React.ReactNode> = {
    profile:     <ProfileTab />,
    employment:  <EmploymentTab />,
    freelancing: <FreelancingTab />,
    email:       <EmailTab />,
    danger:      <DangerTab />,
  };

  return (
    <div className="px-4 lg:px-8 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          Settings
        </h1>
        <p className="text-sm mt-1 text-gray-500">
          Manage your account and email preferences
        </p>
      </div>

      <div className="flex gap-1 flex-wrap border-b border-gray-200">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors relative"
            style={{ color: activeTab === tab.key ? "#0d9488" : "#6b7280" }}
          >
            {tab.icon}
            {tab.label}
            {activeTab === tab.key && (
              <motion.div
                layoutId="settings-tab-indicator"
                className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                style={{ background: "linear-gradient(90deg, #0d9488, #6366f1)" }}
              />
            )}
          </button>
        ))}
      </div>

      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {TAB_CONTENT[activeTab]}
      </motion.div>
    </div>
  );
}

