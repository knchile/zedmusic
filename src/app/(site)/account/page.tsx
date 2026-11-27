import { and, eq } from "drizzle-orm";
import type { Metadata } from "next";
import { Suspense } from "react";
import { PasswordForm, ProfileForm, ResendVerification, SessionsForm } from "@/components/account/account-forms";
import { Alert, Badge, Skeleton } from "@/components/ui/primitives";
import { getDb, schema } from "@/db";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Account settings", robots: { index: false } };

const roleLabels = { listener: "Listener", artist: "Artist", manager: "Artist manager", label: "Record label", admin: "Administrator" } as const;

export default function AccountPage({ searchParams }: PageProps<"/account">) {
  return (
    <div className="mx-auto grid max-w-3xl gap-6">
      <h1 className="font-display text-3xl font-bold sm:text-4xl">Account settings</h1>
      <Suspense fallback={<AccountSkeleton />}>
        <AccountContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function AccountContent({ searchParams }: { searchParams: PageProps<"/account">["searchParams"] }) {
  const user = await requireUser("/account");
  const { verified } = await searchParams;
  const [credential] = await getDb()
    .select({ id: schema.accounts.id })
    .from(schema.accounts)
    .where(and(eq(schema.accounts.userId, user.id), eq(schema.accounts.providerId, "credential")))
    .limit(1);

  return (
    <div className="grid gap-6">
      {verified === "1" && user.emailVerified && (
        <Alert tone="success" title="Email confirmed">
          Welcome to Zed Music Online!
        </Alert>
      )}
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
        <span>{user.email}</span>
        <Badge tone={user.emailVerified ? "green" : "yellow"}>{user.emailVerified ? "Email confirmed" : "Email not confirmed"}</Badge>
        <Badge>{roleLabels[user.role]}</Badge>
      </div>
      {!user.emailVerified && <ResendVerification email={user.email} />}
      <ProfileForm name={user.name} />
      <PasswordForm hasPassword={!!credential} />
      <SessionsForm />
    </div>
  );
}

function AccountSkeleton() {
  return (
    <div className="grid gap-6">
      <Skeleton className="h-6 w-64" />
      <Skeleton className="h-48" />
      <Skeleton className="h-72" />
    </div>
  );
}
