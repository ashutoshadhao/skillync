// ── Scam Job Detector ───────────────────────────────────────────────────────────
// Rule-first detection over the job description. Returns a base score, the matched
// flags, and whether the case is borderline enough to warrant an AI confirmation
// pass (kept optional to protect Gemini quota).

interface ScamRule {
  flag: string;
  weight: number;
  test: (text: string) => boolean;
}

function has(text: string, ...needles: string[]): boolean {
  return needles.some((n) => text.includes(n));
}

const RULES: ScamRule[] = [
  {
    flag: "asks for a fee/deposit",
    weight: 45,
    test: (t) =>
      has(t, "registration fee", "registration charge", "security deposit", "refundable deposit", "processing fee", "training fee", "joining fee"),
  },
  {
    flag: "asks you to pay money",
    weight: 40,
    test: (t) => /pay\s*(₹|rs\.?|inr)\s?\d/i.test(t) || has(t, "pay to apply", "deposit to confirm"),
  },
  {
    flag: "requests sensitive documents upfront",
    weight: 30,
    test: (t) =>
      (has(t, "aadhaar", "aadhar", "pan card", "bank details", "account number", "otp")) &&
      has(t, "send", "share", "submit", "provide", "upfront"),
  },
  {
    flag: "unrealistic earnings claim",
    weight: 22,
    test: (t) => has(t, "earn from home", "easy money", "guaranteed income", "earn upto", "earn up to", "work from home and earn", "no experience needed"),
  },
  {
    flag: "personal free-mail contact",
    weight: 15,
    test: (t) => has(t, "gmail.com", "yahoo.com", "hotmail.com", "rediffmail.com"),
  },
  {
    flag: "high-pressure / limited seats",
    weight: 10,
    test: (t) => has(t, "limited seats", "limited vacancies", "apply fast", "immediate joining bonus", "100% job guarantee"),
  },
];

export interface ScamRuleResult {
  scamScore: number;
  scamFlags: string[];
  needsAiConfirm: boolean;
}

export function detectScamRules(description: string | null, title: string | null = ""): ScamRuleResult {
  const text = `${title || ""} ${description || ""}`.toLowerCase();
  if (!text.trim()) return { scamScore: 0, scamFlags: [], needsAiConfirm: false };

  let score = 0;
  const flags: string[] = [];
  for (const rule of RULES) {
    if (rule.test(text)) {
      score += rule.weight;
      flags.push(rule.flag);
    }
  }
  score = Math.min(100, score);

  // Borderline (some soft signal but not clearly a scam) → worth an AI second opinion.
  const needsAiConfirm = score >= 15 && score < 55;
  return { scamScore: score, scamFlags: flags, needsAiConfirm };
}
