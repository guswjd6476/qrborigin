import { isAdmin } from "@/lib/auth";
import { AdminLogin } from "@/components/dashboard/AdminLogin";
import { Dashboard } from "@/components/dashboard/Dashboard";

export const metadata = { title: "관리자 · B:Origin" };
export const dynamic = "force-dynamic";

export default async function Page() {
  return (await isAdmin()) ? <Dashboard /> : <AdminLogin />;
}
