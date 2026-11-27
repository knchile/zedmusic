import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/auth/password-reset-forms";

export const metadata: Metadata = { title: "Forgot password", robots: { index: false } };

export default function ForgotPasswordPage() {
  return (
    <div className="grid gap-6">
      <div className="grid gap-1.5">
        <h1 className="font-display text-3xl font-bold">Forgot your password?</h1>
        <p className="text-sm text-muted">Enter your email and we&apos;ll send you a reset link.</p>
      </div>
      <ForgotPasswordForm />
    </div>
  );
}
