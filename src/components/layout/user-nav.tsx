import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/primitives";
import { getCurrentUser } from "@/lib/auth/session";
import { UserMenu } from "./user-menu";

/** Reads the session — always render inside <Suspense fallback={<UserNavSkeleton />}>. */
export async function UserNav() {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
          <Link href="/sign-up">Create account</Link>
        </Button>
        <Button asChild variant="primary" size="sm">
          <Link href="/sign-in">Sign in</Link>
        </Button>
      </div>
    );
  }
  return (
    <UserMenu
      user={{ name: user.name, email: user.email, image: user.image, isAdmin: user.role === "admin" }}
    />
  );
}

export function UserNavSkeleton() {
  return <Skeleton className="h-9 w-20 rounded-full" />;
}
