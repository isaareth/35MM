"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  adminFetch,
  clearSession,
  getToken,
  getUsername,
  leaderOf,
  type DashboardData,
  type RegistrationRecord,
} from "@/lib/adminApi";

type Status = "loading" | "ready" | "error";

export default function AdminDashboardPage() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("loading");
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [registrations, setRegistrations] = useState<RegistrationRecord[]>([]);
  const [search, setSearch] = useState("");
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!getToken()) {
      router.replace("/admin/login");
      return;
    }

    setStatus("loading");
    try {
      const [dashboardRes, listRes] = await Promise.all([
        adminFetch("/api/admin/dashboard/"),
        adminFetch("/api/admin/registrations/"),
      ]);

      if (dashboardRes.status === 401 || dashboardRes.status === 403) {
        router.replace("/admin/login");
        return;
      }
      if (!dashboardRes.ok || !listRes.ok) throw new Error("request failed");

      setDashboard(await dashboardRes.json());
      setRegistrations(await listRes.json());
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  const handleLogout = async () => {
    await adminFetch("/api/auth/logout/", { method: "POST" }).catch(() => {});
    clearSession();
    router.push("/admin/login");
  };

  const handleExport = async () => {
    setExporting(true);
    setExportError(null);
    try {
      const res = await adminFetch("/api/admin/registrations/export/");
      if (!res.ok) throw new Error("export failed");

      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") || "";
      const filenameMatch = disposition.match(/filename="?([^"]+)"?/);
      const filename = filenameMatch?.[1] || "inscripciones_35mm.xlsx";

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      setExportError("No pudimos generar el Excel. Intenta de nuevo.");
    } finally {
      setExporting(false);
    }
  };

  const filtered = registrations.filter((r) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return r.participants.some(
      (p) =>
        p.full_name.toLowerCase().includes(q) ||
        p.institution.toLowerCase().includes(q) ||
        p.institutional_email.toLowerCase().includes(q)
    );
  });

  if (status === "loading") {
    return (
      <div className="bg-ink min-h-screen flex items-center justify-center">
        <p className="font-body text-white/40 text-sm tracking-widest uppercase">Cargando…</p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="bg-ink min-h-screen flex items-center justify-center px-6 text-center">
        <div>
          <p className="font-body text-red-400 text-sm mb-4">No pudimos cargar el panel.</p>
          <button
            onClick={load}
            className="font-body text-sm tracking-widest uppercase px-6 py-3 border border-white/20 text-white/70 hover:text-white hover:border-white/40 transition-colors"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-ink min-h-screen">
      {/* Header */}
      <header className="border-b border-white/10 px-6 md:px-12 py-6 flex items-center justify-between">
        <div className="flex items-baseline gap-4">
          <span className="font-display font-black text-2xl text-purple">35mm</span>
          <span className="font-body text-xs text-white/40 tracking-[0.3em] uppercase hidden md:inline">
            Panel administrativo
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="font-body text-xs text-white/40 hidden md:inline">{getUsername()}</span>
          <button
            onClick={handleLogout}
            className="font-body text-xs tracking-widest uppercase text-white/50 hover:text-neon transition-colors"
          >
            Cerrar sesión
          </button>
        </div>
      </header>

      <main className="px-6 md:px-12 py-10 max-w-screen-xl mx-auto">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-px bg-white/10 mb-10">
          <div className="bg-ink p-6 md:p-8">
            <p className="font-display font-black text-neon text-4xl md:text-5xl leading-none mb-2">
              {dashboard?.total_teams ?? 0}
            </p>
            <p className="font-body text-white/40 text-xs tracking-widest uppercase">Equipos inscritos</p>
          </div>
          <div className="bg-ink p-6 md:p-8">
            <p className="font-display font-black text-neon text-4xl md:text-5xl leading-none mb-2">
              {dashboard?.total_participants ?? 0}
            </p>
            <p className="font-body text-white/40 text-xs tracking-widest uppercase">Participantes</p>
          </div>
          <div className="bg-purple p-6 md:p-8 flex flex-col justify-between col-span-2 md:col-span-1">
            <div>
              <p className="font-body text-white/70 text-xs tracking-widest uppercase mb-3">Exportar</p>
              <button
                onClick={handleExport}
                disabled={exporting}
                className="font-body font-semibold text-sm tracking-widest uppercase px-6 py-3 bg-neon text-ink hover:bg-white transition-all duration-300 disabled:opacity-50 w-full"
              >
                {exporting ? "Generando…" : "Descargar Excel"}
              </button>
              {exportError && <p className="font-body text-xs text-red-200 mt-2">{exportError}</p>}
            </div>
          </div>
        </div>

        {/* Últimas inscripciones */}
        <section className="mb-12">
          <h2 className="font-display font-bold text-white text-xl uppercase mb-4">
            Últimas inscripciones
          </h2>
          {dashboard?.recent_registrations.length === 0 ? (
            <p className="font-body text-white/40 text-sm">Todavía no hay inscripciones.</p>
          ) : (
            <div className="flex flex-col divide-y divide-white/8 border-t border-b border-white/8">
              {dashboard?.recent_registrations.map((r) => {
                const leader = leaderOf(r);
                return (
                  <div key={r.id} className="py-4 flex items-center justify-between gap-4">
                    <div>
                      <p className="font-body text-white text-sm">{leader?.full_name ?? "—"}</p>
                      <p className="font-body text-white/40 text-xs">{leader?.institution}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-body text-white/60 text-xs">{r.participants.length} integrantes</p>
                      <p className="font-body text-white/30 text-xs">
                        {new Date(r.created_at).toLocaleString("es-CO", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Listado completo */}
        <section>
          <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
            <h2 className="font-display font-bold text-white text-xl uppercase">
              Todas las inscripciones ({filtered.length})
            </h2>
            <input
              type="text"
              placeholder="Buscar por nombre, institución o correo…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent border border-white/20 font-body text-white text-sm px-4 py-2 outline-none focus:border-neon transition-colors w-full md:w-80"
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="border-b border-white/20">
                  {["Fecha", "Líder", "Correo institucional", "Institución", "Integrantes"].map((h) => (
                    <th
                      key={h}
                      className="font-body text-xs text-white/40 tracking-widest uppercase py-3 pr-4"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const leader = leaderOf(r);
                  return (
                    <tr key={r.id} className="border-b border-white/8 hover:bg-white/5 transition-colors">
                      <td className="font-body text-white/60 text-sm py-3 pr-4 whitespace-nowrap">
                        {new Date(r.created_at).toLocaleDateString("es-CO")}
                      </td>
                      <td className="font-body text-white text-sm py-3 pr-4">{leader?.full_name}</td>
                      <td className="font-body text-white/60 text-sm py-3 pr-4">
                        {leader?.institutional_email}
                      </td>
                      <td className="font-body text-white/60 text-sm py-3 pr-4">{leader?.institution}</td>
                      <td className="font-body text-white/60 text-sm py-3 pr-4">{r.participants.length}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <p className="font-body text-white/40 text-sm py-8 text-center">Sin resultados.</p>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
