import nodemailer from "nodemailer";

export interface EmailConfig {
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  smtp_pass: string;
  from_email: string;
}

export function createTransport(config: EmailConfig) {
  return nodemailer.createTransport({
    host: config.smtp_host,
    port: config.smtp_port,
    secure: false,
    auth: {
      user: config.smtp_user,
      pass: config.smtp_pass,
    },
  });
}

export async function sendTestEmail(config: EmailConfig, toEmail: string) {
  const transport = createTransport(config);
  await transport.sendMail({
    from: config.from_email,
    to: toEmail,
    subject: "Skillync — Email configuration verified ✓",
    html: `
      <div style="font-family: sans-serif; max-width: 500px; margin: auto; background: #111118; color: #f0f0ff; padding: 32px; border-radius: 16px; border: 1px solid #2a2a3a;">
        <h2 style="color: #7c3aed; margin-top: 0;">✓ Email Connected!</h2>
        <p>Your SMTP configuration is working correctly with <strong>Skillync</strong>.</p>
        <p style="color: #8888aa;">You'll now receive job alerts and daily digests at this address.</p>
      </div>`,
  });
}

export async function sendDailyDigest(
  config: EmailConfig,
  userEmail: string,
  matches: Array<{
    title: string;
    company: string;
    matchScore: number;
    location: string;
    salaryMin?: number;
    salaryMax?: number;
    jobId: string;
  }>
) {
  const transport = createTransport(config);
  await transport.sendMail({
    from: config.from_email,
    to: userEmail,
    subject: `Your top ${matches.length} job matches today — Skillync`,
    html: generateDigestHTML(matches),
  });
}

function generateDigestHTML(matches: Array<{
  title: string;
  company: string;
  matchScore: number;
  location: string;
  salaryMin?: number;
  salaryMax?: number;
  jobId: string;
}>) {
  const cards = matches
    .map(
      (m) => `
    <div style="background: #1a1a24; border: 1px solid #2a2a3a; border-radius: 12px; padding: 20px; margin-bottom: 16px;">
      <div style="display: flex; justify-content: space-between; align-items: flex-start;">
        <div>
          <h3 style="margin: 0 0 4px; color: #f0f0ff; font-size: 18px;">${m.title}</h3>
          <p style="margin: 0 0 8px; color: #8888aa;">${m.company} · ${m.location}</p>
          ${m.salaryMin ? `<p style="margin: 0; color: #06b6d4; font-size: 14px;">₹${(m.salaryMin / 100000).toFixed(0)}L – ₹${(m.salaryMax! / 100000).toFixed(0)}L</p>` : ""}
        </div>
        <div style="background: ${m.matchScore >= 80 ? "#10b981" : m.matchScore >= 60 ? "#f59e0b" : "#ef4444"}22; color: ${m.matchScore >= 80 ? "#10b981" : m.matchScore >= 60 ? "#f59e0b" : "#ef4444"}; border-radius: 999px; padding: 6px 14px; font-weight: 700; font-size: 16px; white-space: nowrap;">
          ${m.matchScore}% Match
        </div>
      </div>
      <a href="${process.env.NEXT_PUBLIC_APP_URL}/job/${m.jobId}" style="display: inline-block; margin-top: 14px; background: linear-gradient(135deg, #7c3aed, #06b6d4); color: white; text-decoration: none; padding: 8px 20px; border-radius: 8px; font-size: 14px;">
        View & Apply →
      </a>
    </div>`
    )
    .join("");

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="background: #0a0a0f; margin: 0; padding: 32px; font-family: sans-serif;">
  <div style="max-width: 600px; margin: auto;">
    <div style="text-align: center; margin-bottom: 32px;">
      <h1 style="color: #7c3aed; font-size: 28px; margin: 0;">Skillync</h1>
      <p style="color: #8888aa; margin: 8px 0 0;">Your AI Job Search Co-pilot</p>
    </div>
    <h2 style="color: #f0f0ff; font-size: 22px;">🎯 Your top matches today</h2>
    ${cards}
    <p style="color: #8888aa; font-size: 12px; text-align: center; margin-top: 32px;">
      You're receiving this because you set up daily job alerts on Skillync.
      <a href="${process.env.NEXT_PUBLIC_APP_URL}/alerts" style="color: #7c3aed;">Manage alerts</a>
    </p>
  </div>
</body>
</html>`;
}
