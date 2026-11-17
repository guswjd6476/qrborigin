"use client";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { RealtimeConfig } from "./jwt";

/**
 * 본인 attendance 행 변경을 구독한다. 연결(재연결 포함)될 때마다 onSync 로 최신 데이터를 다시 받게 한다.
 * 반환값: { setToken, close }
 */
export function subscribeAttendance(cfg: RealtimeConfig, userId: string, onSync: () => void) {
  const sb: SupabaseClient = createClient(cfg.url, cfg.anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  sb.realtime.setAuth(cfg.token);
  const channel = sb
    .channel(`attendance:${userId}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "attendance", filter: `user_id=eq.${userId}` }, onSync)
    .subscribe((status) => {
      if (status === "SUBSCRIBED") onSync();
    });
  return {
    setToken: (t: string) => sb.realtime.setAuth(t),
    close: () => {
      sb.removeChannel(channel);
    },
  };
}
