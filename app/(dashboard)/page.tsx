import { redirect } from "next/navigation";

// The root (dashboard) route redirects to /dashboard.
// The main dashboard page lives at app/(dashboard)/dashboard/page.tsx
export default function RootDashboardRedirect() {
  redirect("/dashboard");
}
