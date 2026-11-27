import { AdminNav } from "@/components/admin/admin-nav";

/** Static admin chrome; every page performs its own admin check inside Suspense. */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto grid max-w-6xl gap-6">
      <AdminNav />
      {children}
    </div>
  );
}
