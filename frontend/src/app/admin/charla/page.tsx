"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  adminFetch,
  clearSession,
  getToken,
  getUsername,
  type TalkRegistrationRecord,
} from "@/lib/adminApi";

type Status = "loading" | "ready" | "error";

export default function AdminTalkPage() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("loading");
  const [registrations, setRegistrations] = useState<TalkRegistrationRecord[]>([]);
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
      const res = await adminFetch("/api/admin/talk-registrations/");
      if (res.status === 401 || res.status === 403) {
        router.replace("/admin/login");
        return;
      }
      if (!res.ok) throw new Error("request failed");
      setRegistrations(await res.json());
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
      const res = await adminFetch("/api/admin/talk-registrations/export/");
      if (!res.ok) throw new Error("export failed");
      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") || "";
      const filename = disposition.match(/filename="?([^"]+)"?/)?.[1] || "inscritos_charla.xlsx";
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
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      r.full_name.toLowerCase().includes(q) ||
      r.institution.toLowerCase().includes(q) ||
      r.email.toLowerCase().includes(q)
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
          <p className="font-body text-red-400 text-sm mb-4">No pudimos cargar los inscritos.</p>
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
      <header className="border-b border-white/10 px-6 md:px-12 py-6 flex items-center justify-between">
        <div className="flex items-baseline gap-4">
          <span className="font-display font-black text-2xl text-purple">35mm</span>
          <span className="font-body text-xs text-white/40 tracking-[0.3em] uppercase hidden md:inline">
            Panel administrativo
          </span>
        </div>
        <div className="flex items-center gap-4">
          <a
            href="/admin"
            className="font-body text-xs tracking-widest uppercase text-white/50 hover:text-neon transition-colors"
          >
            ← Festival
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

      <main className="px-6 md:px-12 py-10 max-w-screen-xl mx-auto">
        <p className="font-body text-xs text-white/40 tracking-widest uppercase mb-2">Charla</p>
        <h1 className="font-display font-black text-white text-3xl uppercase mb-8">
          Yesenia Valencia
        </h1>

        <div className="grid grid-cols-2 gap-px bg-white/10 mb-10">
          <div className="bg-ink p-6 md:p-8">
            <p className="font-display font-black text-neon text-4xl md:text-5xl leading-none mb-2">
              {registrations.length}
            </p>
            <p className="font-body text-white/40 text-xs tracking-widest uppercase">Inscritos</p>
          </div>
          <div className="bg-purple p-6 md:p-8">
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

        <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
          <h2 className="font-display font-bold text-white text-xl uppercase">
            Todos los inscritos ({filtered.length})
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
                {["Fecha", "Nombre", "Documento", "Institución", "Correo", "Celular"].map((h) => (
                  <th key={h} className="font-body text-xs text-white/40 tracking-widest uppercase py-3 pr-4">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-b border-white/8">
                  <td className="font-body text-white/60 text-sm py-3 pr-4 whitespace-nowrap">
                    {new Date(r.created_at).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" })}
                  </td>
                  <td className="font-body text-white text-sm py-3 pr-4">{r.full_name}</td>
                  <td className="font-body text-white/60 text-sm py-3 pr-4">{r.document_id}</td>
                  <td className="font-body text-white/60 text-sm py-3 pr-4">{r.institution}</td>
                  <td className="font-body text-white/60 text-sm py-3 pr-4">{r.email}</td>
                  <td className="font-body text-white/60 text-sm py-3 pr-4">{r.phone}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <p className="font-body text-white/40 text-sm py-8 text-center">Sin resultados.</p>
          )}
        </div>
      </main>
    </div>
  );
}
