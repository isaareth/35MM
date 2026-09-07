"use client";

import { useEffect, useState } from "react";
import Lenis from "lenis";
import { MotionConfig } from "framer-motion";
import GrainOverlay from "@/components/GrainOverlay";
import CustomCursor, { type CursorState } from "@/components/CustomCursor";
import Navbar from "@/components/Navbar";
import Hero from "@/components/sections/Hero";
import About from "@/components/sections/About";
import NumberSection from "@/components/sections/NumberSection";
import Timeline from "@/components/sections/Timeline";
import Stats from "@/components/sections/Stats";
import Registration from "@/components/sections/Registration";
import Brands from "@/components/sections/Brands";
import TVU from "@/components/sections/TVU";
import Footer from "@/components/sections/Footer";

export default function Home() {
  const [cursorState, setCursorState] = useState<CursorState>("default");
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(pointer: coarse)");
    const touch = mq.matches;
    setIsMobile(touch);

    // Lenis re-implements scrolling on top of the native scroll for the
    // desktop wheel-smoothing effect. On touch devices native scrolling is
    // already smooth and Lenis's virtual scroll only adds overhead (a
    // permanent RAF loop plus fighting touch-momentum physics), so it's
    // skipped entirely on mobile rather than tuned down.
    if (touch) return;

    const lenis = new Lenis({
      duration: 1.3,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: "vertical",
      smoothWheel: true,
    });

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    const id = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(id);
      lenis.destroy();
    };
  }, []);

  const setCursor = (state: string) => setCursorState(state as CursorState);

  return (
    // reducedMotion="user" makes every motion.* component below respect the
    // OS-level prefers-reduced-motion setting automatically (AC-025) —
    // transform/layout animations are skipped, opacity fades still play.
    <MotionConfig reducedMotion="user">
      <div className="bg-ink min-h-screen relative">
        <GrainOverlay />
        {!isMobile && <CustomCursor state={cursorState} />}
        <Navbar onCursorChange={setCursor} />

        <main>
          <Hero onCursorChange={setCursor} />
          <About onCursorChange={setCursor} />
          <NumberSection />
          <Timeline onCursorChange={setCursor} />
          <Stats />
          <Registration onCursorChange={setCursor} />
          <Brands onCursorChange={setCursor} />
          <TVU />
          <Footer />
        </main>
      </div>
    </MotionConfig>
  );
}
