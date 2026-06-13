import { Loader2, Zap } from "lucide-react";
import { SignIn, ClerkLoaded, ClerkLoading } from "@clerk/nextjs";

export default function Page() {
  return (
    <div className="min-h-screen flex" style={{ background: "#080d0d" }}>
      {/* Left: branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center px-12" style={{ background: "#0d1515", borderRight: "1px solid #1e3030" }}>
        <div className="max-w-sm text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-6" style={{ background: "linear-gradient(135deg,#0d9488,#6366f1)" }}>
            <Zap className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-3xl font-bold" style={{ color: "#e0faf8", fontFamily: "'Space Grotesk', sans-serif" }}>Welcome back to Skillync</h2>
          <p className="text-base" style={{ color: "#7a9e9c" }}>Your AI-powered job intelligence platform. Match smarter, apply faster.</p>
        </div>
      </div>
      {/* Right: clerk */}
      <div className="flex-1 flex flex-col items-center justify-center px-4">
        <div className="text-center space-y-2 mb-8">
          <h1 className="font-bold text-2xl" style={{ color: "#e0faf8" }}>Sign in to Skillync</h1>
          <p className="text-sm" style={{ color: "#7a9e9c" }}>Don&apos;t have an account? <a href="/sign-up" style={{ color: "#2dd4bf" }}>Sign up free</a></p>
        </div>
        <div className="flex items-center justify-center mt-2">
          <ClerkLoaded>
            <SignIn path="/sign-in" />
          </ClerkLoaded>
          <ClerkLoading>
            <Loader2 className="animate-spin text-muted-foreground" />
          </ClerkLoading>
        </div>
      </div>
    </div>
  );
}