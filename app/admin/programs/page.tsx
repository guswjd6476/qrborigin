import { isAdmin } from "@/lib/auth";
import { isDemo } from "@/lib/env";
import { AdminLogin } from "@/components/dashboard/AdminLogin";
import { Programs } from "@/components/dashboard/Programs";

export const metadata = { title: "프로그램 관리 · 불안구독해지센터" };
export const dynamic = "force-dynamic";

export default async function Page() {
  return (await isAdmin()) ? <Programs demo={isDemo} /> : <AdminLogin />;
}
