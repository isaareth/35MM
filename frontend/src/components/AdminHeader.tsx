"use client";

import { useRouter } from "next/navigation";
import { adminFetch, clearSession, getUsername } from "@/lib/adminApi";

export default function AdminHeader({
  backHref,
  backLabel,
}: {
  backHref: string;
  backLabel: string;
}) {
  const router = useRouter();

  const handleLogout = async () => {
    await adminFetch("/api/auth/logout/", { method: "POST" }).catch(() => {});
    clearSession();
    router.push("/admin/login");
  };

  return (
    <header className="border-b border-white/10 px-6 md:px-12 py-6 flex items-center justify-between">
      <div className="flex items-baseline gap-4">
        <span className="font-display font-black text-2xl text-purple">35mm</span>
        <span className="font-body text-xs text-white/40 tracking-[0.3em] uppercase hidden md:inline">
          Panel administrativo
        </span>
      </div>
      <div className="flex items-center gap-4">
        <a
          href={backHref}
          className="font-body text-xs tracking-widest uppercase text-white/50 hover:text-neon transition-colors"
        >
          {backLabel}
        </a>
        <span className="font-body text-xs text-white/40 hidden md:inline">{getUsername()}</span>
        <button
          onClick={handleLogout}
          className="font-body text-xs tracking-widest uppercase text-white/50 hover:text-neon transition-colors"
        >
          Cerrar sesión
        </button>
      </div>
    </header>
  );
}
