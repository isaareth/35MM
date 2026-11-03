"use client";

import { use, useEffect, useState } from "react";
import { MotionConfig, motion } from "framer-motion";
import Countdown from "@/components/invitation/Countdown";
import DoorMode from "@/components/invitation/DoorMode";
import GalaActions from "@/components/invitation/GalaActions";
import RsvpFlow from "@/components/invitation/RsvpFlow";
import Ticket from "@/components/invitation/Ticket";
import type { GuestInvitation } from "@/lib/gala";

type Load = "loading" | "notfound" | "error" | "ready";

const apiBase = () => process.env.NEXT_PUBLIC_API_URL ?? "";

export default function InvitationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [load, setLoad] = useState<Load>("loading");
  const [invitation, setInvitation] = useState<GuestInvitation | null>(null);
  const [doorOpen, setDoorOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`${apiBase()}/api/gala/invitations/${encodeURIComponent(token)}/`)
      .then(async (res) => {
        if (cancelled) return;
        if (res.status === 404) return setLoad("notfound");
        if (!res.ok) return setLoad("error");
        setInvitation(await res.json());
        setLoad("ready");
      })
      .catch(() => !cancelled && setLoad("error"));
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (load === "loading") {
    return (
      <Shell>
        <p className="font-body text-white/40 text-sm tracking-widest uppercase text-center py-32">Cargando tu invitación…</p>
      </Shell>
    );
  }

  if (load !== "ready" || !invitation) {
    return (
      <Shell>
        <div className="text-center py-24">
          <h1 className="font-display font-black text-white text-3xl uppercase mb-4">
            {load === "notfound" ? "Invitación no encontrada" : "No pudimos cargar tu invitación"}
          </h1>
          <p className="font-body text-white/50 text-sm">
            {load === "notfound"
              ? "Revisa que estés usando el enlace o el QR que te enviamos por correo."
              : "Intenta de nuevo en unos minutos."}
          </p>
        </div>
      </Shell>
    );
  }

  if (invitation.expired) {
    return (
      <Shell>
        <div className="text-center py-24">
          <p className="font-body text-xs tracking-[0.4em] uppercase text-neon mb-3">35mm Festival de Cortos</p>
          <h1 className="font-display font-black text-white text-3xl uppercase mb-4">Gala de premiación</h1>
          <p className="font-body text-sm text-red-300 border border-red-400/30 bg-red-400/10 px-4 py-4 inline-block">
            Esta invitación ya no está vigente.
          </p>
        </div>
      </Shell>
    );
  }

  const qrSrc = `${apiBase()}${invitation.qr_path}`;

  return (
    <MotionConfig reducedMotion="user">
      <Shell>
        <Ticket
          guestName={invitation.guest_name}
          qrSrc={qrSrc}
          capacity={invitation.total_capacity}
          onOpenDoor={() => setDoorOpen(true)}
        />

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.6, ease: "easeOut" }}
          className="flex flex-col gap-6 mt-10"
        >
          <Countdown />
          <RsvpFlow token={token} apiBase={apiBase()} invitation={invitation} onSaved={setInvitation} />
          <GalaActions qrSrc={qrSrc} />
          <p className="font-body text-xs text-white/30 text-center pt-2">
            Tu invitación es personal: no la compartas. ¿Dudas? Escríbenos a tvu@eafit.edu.co.
          </p>
        </motion.div>

        {doorOpen && (
          <DoorMode
            guestName={invitation.guest_name}
            qrSrc={qrSrc}
            capacity={invitation.total_capacity}
            onClose={() => setDoorOpen(false)}
          />
        )}
      </Shell>
    </MotionConfig>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-ink min-h-screen relative overflow-hidden">
      <div
        aria-hidden
        className="absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[600px] rounded-full blur-3xl opacity-40 pointer-events-none"
        style={{ background: "radial-gradient(closest-side, #4820B7, transparent)" }}
      />
      <div className="relative max-w-xl mx-auto py-10 md:py-14 px-5">{children}</div>
    </div>
  );
}
