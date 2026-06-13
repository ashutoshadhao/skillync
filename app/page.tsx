"use client";

import Link from "next/link";
import { motion, MotionConfig } from "framer-motion";
import {
  Sparkles, Brain, Target, Bell, BarChart3, Shield,
  ArrowRight, Zap, CheckCircle2, FileText, Building2,
  Play
} from "lucide-react";
import { SignedIn, SignedOut } from "@clerk/nextjs";

const features = [
  {
    icon: Brain,
    title: "AI-Powered Matching",
    description: "Gemini AI scores every job 0–100 based on your skill alignment, experience level, and role fit — and explains the reasoning behind each score.",
    color: "#0d9488",
    tag: "AI Engine",
    span: "md:col-span-2 md:row-span-2",
    big: true,
  },
  {
    icon: Target,
    title: "Smart Job Scraping",
    description: "Jobs pulled from Indeed, Naukri, and Internshala — refreshed every 6 hours.",
    color: "#6366f1",
    tag: "Data",
    span: "md:col-span-2",
  },
  {
    icon: BarChart3,
    title: "Application Tracker",
    description: "Kanban board: Saved → Applied → Interview → Offer.",
    color: "#10b981",
    tag: "Tracker",
    span: "md:col-span-1",
  },
  {
    icon: Bell,
    title: "Instant Alerts",
    description: "Daily digests for new high-match jobs.",
    color: "#f59e0b",
    tag: "Alerts",
    span: "md:col-span-1",
  },
  {
    icon: FileText,
    title: "Resume Tailoring",
    description: "AI rewrites your bullet points to match a specific JD. One click — done.",
    color: "#0d9488",
    tag: "AI Tools",
    span: "md:col-span-2",
  },
  {
    icon: Shield,
    title: "Ghost Job Detection",
    description: "We flag listings older than 45 days so you don't waste time on zombie postings.",
    color: "#f43f5e",
    tag: "Safety",
    span: "md:col-span-2",
  },
];

const integrations = [
  { name: "Indeed", color: "#2557A7" },
  { name: "Naukri", color: "#ff7555" },
  { name: "Internshala", color: "#00a5ec" },
  { name: "Gmail", color: "#EA4335" },
];

const valueProps = [
  {
    icon: Building2,
    title: "Built for India",
    text: "Sources roles from Indeed, Naukri, and Internshala — the boards Indian job seekers actually use, not generic global feeds.",
    color: "#0d9488",
  },
  {
    icon: Brain,
    title: "AI that explains itself",
    text: "Gemini scores every job 0–100 and tells you why it fits your skills and experience — no black-box ranking.",
    color: "#6366f1",
  },
  {
    icon: Zap,
    title: "Free, forever",
    text: "Every feature is included for every user. No credit card, no Pro tier, no paywalls — ever.",
    color: "#10b981",
  },
];

const glass: React.CSSProperties = {
  background: "rgba(255, 255, 255, 0.85)",
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
  border: "1px solid rgba(0, 0, 0, 0.06)",
  boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)",
};

export default function LandingPage() {
  return (
    <MotionConfig reducedMotion="user">
    <div className="min-h-screen relative overflow-hidden bg-white">
      {/* ── Aurora mesh background (subtle ambient) ──────────────────── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <motion.div
          className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full blur-[160px]"
          style={{ background: "#0d9488", opacity: 0.06 }}
          animate={{ x: [0, 80, 0], y: [0, 60, 0], scale: [1, 1.15, 1] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute top-1/4 right-0 w-[520px] h-[520px] rounded-full blur-[160px]"
          style={{ background: "#6366f1", opacity: 0.05 }}
          animate={{ x: [0, -70, 0], y: [0, 90, 0], scale: [1, 1.2, 1] }}
          transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-0 left-1/3 w-[560px] h-[560px] rounded-full blur-[170px]"
          style={{ background: "#10b981", opacity: 0.04 }}
          animate={{ x: [0, 60, 0], y: [0, -50, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 26, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <div className="relative z-10">
      {/* ── Navbar ────────────────────────────────────────────────────── */}
      <nav className="fixed top-4 left-4 right-4 z-50 rounded-2xl shadow-sm" style={glass}>
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #0d9488, #6366f1)" }}>
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg text-gray-900">Skillync</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            {[
              { label: "Features", href: "#features" },
              { label: "How It Works", href: "#how" },
              { label: "Why Skillync", href: "#testimonials" },
            ].map((item) => (
              <Link key={item.label} href={item.href}
                className="text-sm text-gray-500 transition-colors hover:text-gray-900">
                {item.label}
              </Link>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <SignedOut>
              <Link href="/sign-in"
                className="text-sm px-4 py-2 rounded-lg text-gray-500 transition-colors hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500">
                Log In
              </Link>
              <Link href="/sign-up"
                className="text-sm px-4 py-2 rounded-lg font-semibold text-white bg-teal-600 hover:bg-teal-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2">
                Get Started Free
              </Link>
            </SignedOut>
            <SignedIn>
              <Link href="/dashboard"
                className="text-sm px-4 py-2 rounded-lg font-semibold text-white flex items-center gap-2 bg-teal-600 hover:bg-teal-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2">
                Dashboard <ArrowRight className="w-3 h-3" />
              </Link>
            </SignedIn>
          </div>
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────────────────────────────── */}
      <section className="pt-40 pb-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6 text-sm text-teal-700 bg-teal-50 ring-1 ring-teal-200">
                <Sparkles className="w-3.5 h-3.5" />
                Powered by Google Gemini AI
              </div>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="text-5xl md:text-7xl font-bold mb-6 leading-tight text-gray-900 tracking-tight"
            >
              Find Your Dream Job{" "}
              <span className="gradient-text">Smarter &amp; Faster</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              className="text-xl mb-10 max-w-2xl mx-auto text-gray-500"
              style={{ lineHeight: 1.7 }}
            >
              Upload your resume. Get AI-matched jobs from across the web. Track applications and land interviews — all in one place.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-4 justify-center"
            >
              <Link href="/sign-up"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-semibold text-white text-base bg-teal-600 hover:bg-teal-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2">
                Get Started Free <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="#how"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-semibold text-base text-gray-700 hover:bg-gray-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
                style={glass}>
                <Play className="w-4 h-4" /> Watch Demo
              </Link>
            </motion.div>
          </div>

          {/* Floating profile cards */}
          <motion.div
            initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
            className="relative flex justify-center gap-4 flex-wrap"
          >
            {[
              { name: "Rahul Gupta", role: "Senior Dev", match: 94, color: "#0d9488" },
              { name: "Priya S.", role: "Product Manager", match: 88, color: "#6366f1" },
              { name: "Amit K.", role: "Data Scientist", match: 91, color: "#10b981" },
            ].map((card, i) => (
              <motion.div
                key={i}
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 3 + i * 0.5, repeat: Infinity, ease: "easeInOut", delay: i * 0.8 }}
                className="flex items-center gap-3 px-4 py-3 rounded-2xl"
                style={glass}
              >
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white"
                  style={{ background: card.color }}>
                  {card.name.split(" ").map(n => n[0]).join("")}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{card.name}</p>
                  <p className="text-xs text-gray-500">{card.role}</p>
                </div>
                <div className="ml-2 text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{ background: `${card.color}22`, color: card.color }}>
                  {card.match}%
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Stats ─────────────────────────────────────────────────────── */}
      <section className="py-16 px-6">
        <div className="max-w-5xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { value: "0–100", label: "AI Match Score per Job", icon: Brain, color: "#0d9488" },
            { value: "3", label: "Sources: Indeed · Naukri · Internshala", icon: Target, color: "#6366f1" },
            { value: "Every 6h", label: "Job Listings Refreshed", icon: Building2, color: "#10b981" },
            { value: "45-day", label: "Ghost-Job Filter", icon: Shield, color: "#f59e0b" },
          ].map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ delay: i * 0.1 }}
              className="p-5 rounded-2xl"
              style={glass}
            >
              <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3"
                style={{ background: `${stat.color}18` }}>
                <stat.icon className="w-4 h-4" style={{ color: stat.color }} />
              </div>
              <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
              <div className="text-xs mt-1 text-gray-500">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Features (Bento grid) ──────────────────────────────────────── */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="text-center mb-16">
            <span className="text-xs font-semibold tracking-widest uppercase text-teal-600">
              // Our Features //
            </span>
            <h2 className="text-4xl font-bold mt-3 mb-4 text-gray-900">
              Streamline Your Job Search From Start To Finish
            </h2>
            <p className="text-lg max-w-2xl mx-auto text-gray-500">
              Built for Indian job seekers. Powered by the latest AI.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-4 md:auto-rows-[200px] gap-4">
            {features.map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.08 }}
                whileHover={{ translateY: -4 }}
                className={`relative p-6 rounded-3xl overflow-hidden flex flex-col ${feature.span}`}
                style={glass}
              >
                {feature.big && (
                  <div className="absolute -bottom-16 -right-16 w-56 h-56 rounded-full blur-[80px] pointer-events-none"
                    style={{ background: feature.color, opacity: 0.08 }} />
                )}
                <div className="flex items-start justify-between mb-4 relative">
                  <div className={`${feature.big ? "w-14 h-14" : "w-11 h-11"} rounded-xl flex items-center justify-center`}
                    style={{ background: `${feature.color}15` }}>
                    <feature.icon className={feature.big ? "w-7 h-7" : "w-5 h-5"} style={{ color: feature.color }} />
                  </div>
                  <span className="text-xs px-2 py-1 rounded-full"
                    style={{ background: `${feature.color}15`, color: feature.color }}>
                    #{feature.tag}
                  </span>
                </div>
                <h3 className={`${feature.big ? "text-2xl" : "text-base"} font-semibold mb-2 relative text-gray-900`}>
                  {feature.title}
                </h3>
                <p className={`${feature.big ? "text-base" : "text-sm"} leading-relaxed relative text-gray-500`}>
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ───────────────────────────────────────────────── */}
      <section id="how" className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="text-center mb-16">
            <span className="text-xs font-semibold tracking-widest uppercase text-teal-600">
              // How It Works //
            </span>
            <h2 className="text-4xl font-bold mt-3 text-gray-900">
              Up and running in 3 minutes
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { step: "01", title: "Upload Your Resume", desc: "Drag & drop your PDF. Gemini AI extracts skills, experience, and job titles automatically.", color: "#0d9488", icon: FileText },
              { step: "02", title: "Get AI-Matched Jobs", desc: "We score thousands of jobs against your profile and surface the best matches with detailed reasoning.", color: "#6366f1", icon: Brain },
              { step: "03", title: "Apply & Track", desc: "One-click apply, track your pipeline on a Kanban board, and get AI-tailored resumes.", color: "#10b981", icon: BarChart3 },
            ].map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.15 }}
                className="relative p-6 rounded-3xl text-center"
                style={glass}
              >
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
                  style={{ background: `${step.color}15` }}>
                  <step.icon className="w-6 h-6" style={{ color: step.color }} />
                </div>
                <div className="text-xs font-bold mb-2" style={{ color: step.color }}>{step.step}</div>
                <h3 className="text-base font-semibold mb-2 text-gray-900">{step.title}</h3>
                <p className="text-sm leading-relaxed text-gray-500">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Integrations ───────────────────────────────────────────────── */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <h2 className="text-3xl font-bold mb-3 text-gray-900">
              Connect With The{" "}
              <span style={{ color: "#0d9488" }}>Platforms You Already Use</span>
            </h2>
            <p className="text-sm mb-10 text-gray-500">
              Effortlessly pull jobs from your favourite platforms with an all-in-one hiring experience.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              {integrations.map((it, i) => (
                <motion.div
                  key={it.name}
                  initial={{ opacity: 0, scale: 0.8 }} whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }} transition={{ delay: i * 0.07 }}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-700"
                  style={glass}
                >
                  <span className="w-2 h-2 rounded-full" style={{ background: it.color }} />
                  {it.name}
                </motion.div>
              ))}
            </div>
            <div className="mt-8">
              <Link href="/sign-up"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white text-sm bg-teal-600 hover:bg-teal-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2">
                Get Started <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Why Skillync ──────────────────────────────────────────────── */}
      <section id="testimonials" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="text-center mb-12">
            <span className="text-xs font-semibold tracking-widest uppercase text-teal-600">
              // Why Skillync //
            </span>
            <h2 className="text-3xl font-bold mt-3 text-gray-900">
              A Job Search Built Around You
            </h2>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {valueProps.map((v, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.12 }}
                className="p-6 rounded-3xl"
                style={glass}
              >
                <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4"
                  style={{ background: `${v.color}15` }}>
                  <v.icon className="w-5 h-5" style={{ color: v.color }} />
                </div>
                <h3 className="text-base font-semibold mb-2 text-gray-900">{v.title}</h3>
                <p className="text-sm leading-relaxed text-gray-500">{v.text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────────────────────────── */}
      <section className="py-24 px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="max-w-3xl mx-auto text-center p-12 rounded-[2rem] relative overflow-hidden"
          style={glass}
        >
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: "radial-gradient(ellipse at center, #0d948810 0%, transparent 70%)" }} />
          <h2 className="text-4xl font-bold mb-4 relative text-gray-900">
            Start your AI job search today
          </h2>
          <p className="text-lg mb-8 relative text-gray-500">
            Free forever. No credit card required. All features included.
          </p>
          <Link href="/sign-up"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-semibold text-white text-lg bg-teal-600 hover:bg-teal-700 transition-colors relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2">
            Get Started Free <ArrowRight className="w-5 h-5" />
          </Link>
          <div className="flex items-center justify-center gap-6 mt-8 flex-wrap relative">
            {["No credit card", "Free forever", "All features included"].map((item) => (
              <div key={item} className="flex items-center gap-1.5 text-sm text-gray-500">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                {item}
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <footer className="border-t border-gray-100 py-12 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 pb-8 border-b border-gray-100">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, #0d9488, #6366f1)" }}>
                <Zap className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="font-bold text-gray-900">Skillync</span>
            </div>
            <p className="text-xs leading-relaxed text-gray-500">
              AI-powered job search platform built for Indian professionals.
            </p>
          </div>
          {[
            { title: "Navigation", links: ["Home", "Features", "How It Works", "Blog"] },
            { title: "Features", links: ["AI Matching", "Job Tracker", "Resume Tailor", "Alerts"] },
            { title: "Support", links: ["FAQ", "Articles", "Community", "Help Center"] },
          ].map((col) => (
            <div key={col.title}>
              <h4 className="text-sm font-semibold mb-3 text-gray-900">{col.title}</h4>
              <ul className="space-y-2">
                {col.links.map((l) => (
                  <li key={l}>
                    <Link href="#" className="text-xs text-gray-500 transition-colors hover:text-gray-900">{l}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="pt-6 flex flex-col md:flex-row items-center justify-between gap-3">
          <p className="text-xs text-gray-500">©2026 Skillync. All Rights Reserved. | Terms of Use</p>
        </div>
      </footer>
      </div>
    </div>
    </MotionConfig>
  );
}
