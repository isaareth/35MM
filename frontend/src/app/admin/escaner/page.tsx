"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import AdminHeader from "@/components/AdminHeader";
import { adminFetch, getToken } from "@/lib/adminApi";
import { RSVP_LABEL, extractToken, type TicketLookup } from "@/lib/gala";

type Phase = "scanning" | "looking" | "ticket" | "result";

interface Outcome {
  ok: boolean;
  title: string;
  detail?: string;
}

interface ScannerHandle {
  pause: (pauseVideo?: boolean) => void;
  resume: () => void;
  stop: () => Promise<void>;
  clear: () => void;
}

const READER_ID = "gala-qr-reader";

export default function GateScannerPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("scanning");
  const [token, setToken] = useState<string | null>(null);
  const [ticket, setTicket] = useState<TicketLookup | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [admitting, setAdmitting] = useState(false);
  const [manual, setManual] = useState("");

  const scannerRef = useRef<ScannerHandle | null>(null);
  const phaseRef = useRef<Phase>("scanning");
  const setPhaseBoth = (next: Phase) => {
    phaseRef.current = next;
    setPhase(next);
  };

  // Both throw when the camera never started (permission denied); the manual
  // entry must keep working in that case.
  const pauseCamera = () => {
    try {
      scannerRef.current?.pause(true);
    } catch {}
  };
  const resumeCamera = () => {
    try {
      scannerRef.current?.resume();
    } catch {}
  };

  const unauthorized = useCallback(() => router.replace("/admin/login"), [router]);

  const lookup = useCallback(
    async (raw: string) => {
      const found = extractToken(raw);
      if (!found) {
        setOutcome({ ok: false, title: "Este QR no es una invitación de 35mm" });
        setPhaseBoth("result");
        return;
      }
      setToken(found);
      setPhaseBoth("looking");
      pauseCamera();

      try {
        const res = await adminFetch(`/api/admin/gala/tickets/${found}/`);
        if (res.status === 401 || res.status === 403) return unauthorized();
        const data = await res.json().catch(() => null);

        if (!res.ok) {
          setOutcome({ ok: false, title: data?.message || "Invitación no válida o falsa" });
          setPhaseBoth("result");
          return;
        }
        const info = data as TicketLookup;
        setTicket(info);
        if (info.expired) {
          setOutcome({ ok: false, title: "Invitación vencida", detail: info.guest_name });
          setPhaseBoth("result");
        } else if (info.remaining_capacity <= 0) {
          const when = info.checkin_at
            ? new Date(info.checkin_at).toLocaleTimeString("es-CO", { hour: "numeric", minute: "2-digit" })
            : "";
          setOutcome({
            ok: false,
            title: "Invitación ya utilizada",
            detail: `${info.guest_name}${when ? ` · ingresó a las ${when}` : ""}`,
          });
          setPhaseBoth("result");
        } else {
          setPhaseBoth("ticket");
        }
      } catch {
        setOutcome({ ok: false, title: "Sin conexión con el servidor", detail: "Intenta de nuevo." });
        setPhaseBoth("result");
      }
    },
    [unauthorized]
  );

  // Camera scanner. The start promise is awaited on cleanup so React's dev
  // double-mount can never leave two scanners fighting over the camera.
  useEffect(() => {
    if (!getToken()) {
      unauthorized();
      return;
    }
    let scanner: ScannerHandle | null = null;
    let started: Promise<unknown> = Promise.resolve();

    started = import("html5-qrcode")
      .then(async ({ Html5Qrcode }) => {
        const instance = new Html5Qrcode(READER_ID);
        scanner = instance as unknown as ScannerHandle;
        scannerRef.current = scanner;
        await instance.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 240, height: 240 } },
          (text) => {
            if (phaseRef.current === "scanning") lookup(text);
          },
          () => {}
        );
      })
      .catch(() => {
        setCameraError(
          "No pudimos abrir la cámara. Revisa el permiso del navegador, o pega el enlace de la invitación abajo."
        );
      });

    return () => {
      started.then(() => scanner?.stop().then(() => scanner?.clear()).catch(() => {}));
    };
  }, [lookup, unauthorized]);

  const admit = async (count: 1 | 2) => {
    if (!token) return;
    setAdmitting(true);
    try {
      const res = await adminFetch("/api/admin/gala/validate/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, checkin_count: count }),
      });
      if (res.status === 401 || res.status === 403) return unauthorized();
      const data = await res.json().catch(() => null);
      if (res.ok && data?.valid) {
        setOutcome({
          ok: true,
          title: data.message,
          detail: `${data.guest_name}${data.remaining_capacity > 0 ? ` · quedan ${data.remaining_capacity} cupo(s)` : ""}`,
        });
      } else {
        setOutcome({ ok: false, title: data?.message || "No se pudo registrar el ingreso", detail: ticket?.guest_name });
      }
      setPhaseBoth("result");
    } catch {
      setOutcome({ ok: false, title: "Sin conexión con el servidor", detail: "No se registró el ingreso." });
      setPhaseBoth("result");
    } finally {
      setAdmitting(false);
    }
  };

  const next = () => {
    setTicket(null);
    setToken(null);
    setOutcome(null);
    setManual("");
    setPhaseBoth("scanning");
    resumeCamera();
  };

  const showReader = phase === "scanning" || phase === "looking";

  return (
    <div className="bg-ink min-h-screen">
      <AdminHeader backHref="/admin/gala" backLabel="← Gala" />

      <main className="px-4 md:px-12 py-6 max-w-xl mx-auto">
        <h1 className="font-display font-black text-white text-2xl uppercase mb-4">Entrada · gala</h1>

        <div className={showReader ? "" : "hidden"}>
          <div id={READER_ID} className="w-full overflow-hidden bg-black/40 min-h-[200px]" />
          {cameraError ? (
            <p className="font-body text-sm text-red-300 border border-red-400/30 bg-red-400/10 px-4 py-3 mt-3">
              {cameraError}
            </p>
          ) : (
            <p className="font-body text-xs text-white/40 mt-3">
              {phase === "looking" ? "Consultando la invitación…" : "Apunta la cámara al código QR del invitado."}
            </p>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (manual.trim() && phase === "scanning") lookup(manual);
            }}
            className="mt-6 flex gap-2"
          >
            <input
              type="text"
              value={manual}
              onChange={(e) => setManual(e.target.value)}
              placeholder="O pega el enlace de la invitación"
              className="flex-1 min-w-0 bg-transparent border border-white/20 font-body text-white text-sm px-4 py-3 outline-none focus:border-neon transition-colors"
            />
            <button
              type="submit"
              className="font-body text-xs font-semibold tracking-widest uppercase px-5 border border-white/20 text-white/70 hover:text-white transition-colors"
            >
              Buscar
            </button>
          </form>
        </div>

        {phase === "ticket" && ticket && (
          <div className="flex flex-col gap-5">
            <div className="border border-white/15 p-5">
              <p className="font-display font-black text-white text-2xl uppercase leading-tight">
                {ticket.guest_name}
              </p>
              {ticket.team && <p className="font-body text-white/50 text-sm mt-1">{ticket.team}</p>}
              <dl className="grid grid-cols-2 gap-4 mt-5">
                <Detail label="Confirmación" value={RSVP_LABEL[ticket.rsvp_status]} />
                <Detail
                  label="Acompañante"
                  value={ticket.has_plus_one ? ticket.plus_one_name || "Sí" : "No registrado"}
                />
                <Detail label="Cupos disponibles" value={`${ticket.remaining_capacity} de ${ticket.total_capacity}`} />
              </dl>
              {ticket.rsvp_status === "DECLINED" && (
                <p className="font-body text-xs text-yellow-300 mt-4">
                  Esta persona avisó que no asistiría; verifica antes de admitir.
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={() => admit(1)}
                disabled={admitting}
                className={`font-body font-semibold text-sm tracking-widest uppercase px-6 py-5 transition-colors disabled:opacity-50 ${
                  ticket.has_plus_one && ticket.remaining_capacity >= 2
                    ? "border border-white/30 text-white hover:bg-white/10"
                    : "bg-neon text-ink hover:bg-white"
                }`}
              >
                Admitir 1 persona
              </button>
              <button
                onClick={() => admit(2)}
                disabled={admitting || ticket.remaining_capacity < 2}
                className={`font-body font-semibold text-sm tracking-widest uppercase px-6 py-5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
                  ticket.has_plus_one && ticket.remaining_capacity >= 2
                    ? "bg-neon text-ink hover:bg-white"
                    : "border border-white/30 text-white hover:bg-white/10"
                }`}
              >
                Admitir 2 personas
              </button>
            </div>
            <button
              onClick={next}
              disabled={admitting}
              className="font-body text-xs tracking-widest uppercase text-white/50 hover:text-white transition-colors"
            >
              Cancelar y escanear otro
            </button>
          </div>
        )}

        {phase === "result" && outcome && (
          <div className="flex flex-col gap-5">
            <div
              role="status"
              className={`p-6 ${outcome.ok ? "bg-green-600" : "bg-red-600"} text-white`}
            >
              <p className="font-display font-black text-3xl uppercase leading-tight">
                {outcome.ok ? "✓ Adelante" : "✕ No pasa"}
              </p>
              <p className="font-body text-lg mt-2">{outcome.title}</p>
              {outcome.detail && <p className="font-body text-sm mt-1 opacity-90">{outcome.detail}</p>}
            </div>
            <button
              onClick={next}
              className="font-body font-semibold text-sm tracking-widest uppercase px-6 py-5 bg-neon text-ink hover:bg-white transition-colors"
            >
              Escanear siguiente
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-body text-[10px] tracking-widest uppercase text-white/30 mb-1">{label}</dt>
      <dd className="font-body text-white text-sm">{value}</dd>
    </div>
  );
}
