import { isAdmin } from "@/lib/auth";
import { Kiosk } from "@/components/camera/Kiosk";
import { AdminLogin } from "@/components/dashboard/AdminLogin";

export const metadata = { title: "출석 인증 · B:Origin" };
export const dynamic = "force-dynamic";

export default async function Page() {
  if (!(await isAdmin())) return <AdminLogin title="현장 출석 인증 시작" hint="운영자가 한 번 로그인하면 이 노트북에서 30일간 유지됩니다." />;
  return <Kiosk />;
}
