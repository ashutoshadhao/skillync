import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// Model fallback chain: 2.5 flash first, then lighter models as fallback
const MODELS = ["gemini-2.5-flash-preview-04-17", "gemini-2.0-flash", "gemini-2.0-flash-lite"];

export const geminiFlash = genAI.getGenerativeModel({ model: MODELS[0] });

async function generateWithFallback(prompt: string): Promise<string> {
  for (const model of MODELS) {
    try {
      const result = await genAI.getGenerativeModel({ model }).generateContent(prompt);
      return result.response.text().trim();
    } catch (err: unknown) {
      const status = (err as { status?: number }).status;
      if (status === 429 || status === 404) {
        // quota exhausted or model not found — try next
        console.warn(`Model ${model} unavailable (${status}), trying next...`);
        continue;
      }
      throw err;
    }
  }
  throw new Error("All Gemini models quota exhausted");
}

// ── Resume Parsing ─────────────────────────────────────────────────────────────
export async function parseResume(resumeText: string) {
  const prompt = `Parse this resume text and return ONLY valid JSON (no markdown):
{
  "skills": ["string"],
  "jobTitles": ["string"],
  "experienceYears": number,
  "education": "string",
  "summary": "string"
}
Resume: ${resumeText}`;

  const text = await generateWithFallback(prompt);
  // Strip markdown code fences if present
  const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  return JSON.parse(cleaned);
}

// ── Job Match Scoring ──────────────────────────────────────────────────────────
export async function scoreJobMatch(skills: string[], jobDescription: string) {
  const prompt = `Compare this resume and job description. Return ONLY valid JSON:
{
  "matchScore": number,
  "matchedSkills": ["string"],
  "missingSkills": ["string"],
  "reasoning": "string",
  "shouldApply": boolean
}
Resume skills: ${skills.join(", ")}
Job description: ${jobDescription}`;

  const text = await generateWithFallback(prompt);
  const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  return JSON.parse(cleaned);
}

// ── Resume Quality Score ───────────────────────────────────────────────────────
export async function scoreResume(resumeText: string) {
  const prompt = `You are an expert ATS (Applicant Tracking System) and resume reviewer for the Indian job market. Analyse the resume below and return ONLY valid JSON (no markdown):
{
  "overallScore": number,        // 0-100 overall quality
  "atsScore": number,            // 0-100 ATS-parseability (formatting, standard sections, no tables/graphics issues)
  "completenessScore": number,   // 0-100 presence of contact, summary, experience, skills, education
  "clarityScore": number,        // 0-100 use of action verbs, quantified achievements, concise language
  "keywordScore": number,        // 0-100 density of relevant, role-specific keywords/skills
  "strengths": ["string"],       // up to 4 concrete strengths
  "improvements": ["string"],    // up to 5 specific, actionable fixes
  "missingSections": ["string"]  // standard sections that are absent
}
Resume: ${resumeText}`;

  const text = await generateWithFallback(prompt);
  const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  return JSON.parse(cleaned);
}

// ── Hidden Salary Estimator ──────────────────────────────────────────────────────
export async function estimateSalary(
  title: string,
  company: string,
  location: string,
  description: string,
  isRemote: boolean
) {
  const prompt = `Estimate the likely annual CTC range (in Indian Rupees) for this job. Use role seniority, company tier, location, and market signals. Return ONLY valid JSON (no markdown):
{
  "estSalaryMin": number,   // rupees per year, e.g. 800000
  "estSalaryMax": number,   // rupees per year, e.g. 1400000
  "confidence": "low" | "medium" | "high",
  "basis": "string"         // one short sentence on the reasoning
}
Title: ${title}
Company: ${company}
Location: ${location}${isRemote ? " (remote)" : ""}
Description: ${description}`;

  const text = await generateWithFallback(prompt);
  const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  return JSON.parse(cleaned);
}

// ── Scam Confirmation (borderline cases only) ────────────────────────────────────
export async function confirmScam(title: string, company: string, description: string) {
  const prompt = `Assess whether this job posting is likely a SCAM (fake job, money/document extraction, MLM, fee-for-job). Return ONLY valid JSON (no markdown):
{
  "scamScore": number,      // 0-100 likelihood it is a scam
  "scamFlags": ["string"]   // short reasons, e.g. "asks for registration fee"
}
Title: ${title}
Company: ${company}
Description: ${description}`;

  const text = await generateWithFallback(prompt);
  const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  return JSON.parse(cleaned);
}

// ── Resume Tailoring (Pro) ─────────────────────────────────────────────────────
export async function tailorResume(resumeText: string, jobDescription: string) {
  const prompt = `Rewrite only the work experience bullet points from this resume to better match this job description. Keep all facts 100% accurate — only rephrase language. Return ONLY valid JSON: { "tailoredBullets": ["string"] }
Resume: ${resumeText}
Job: ${jobDescription}`;

  const text = await generateWithFallback(prompt);
  const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  return JSON.parse(cleaned);
}

// ── Cover Letter Generator (Pro) ───────────────────────────────────────────────
export async function generateCoverLetter(
  name: string,
  skills: string[],
  jobTitle: string,
  company: string,
  jobDescription: string
) {
  const prompt = `Write a concise, professional cover letter for this job application. 3 paragraphs max. Sound human, not robotic.
Candidate: ${name}, Skills: ${skills.join(", ")}
Job: ${jobTitle} at ${company}
Description: ${jobDescription}`;

  return generateWithFallback(prompt);
}
