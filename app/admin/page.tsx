import { isAdmin } from "@/lib/auth";
import { AdminLogin } from "@/components/dashboard/AdminLogin";
import { Dashboard } from "@/components/dashboard/Dashboard";

export const metadata = { title: "관리자 · 불안구독해지센터" };
export const dynamic = "force-dynamic";

export default async function Page() {
  return (await isAdmin()) ? <Dashboard /> : <AdminLogin />;
}
