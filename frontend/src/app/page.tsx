"use client";

import { useEffect, useState } from "react";
import Lenis from "lenis";
import GrainOverlay from "@/components/GrainOverlay";
import CustomCursor, { type CursorState } from "@/components/CustomCursor";
import Navbar from "@/components/Navbar";
import Hero from "@/components/sections/Hero";
import About from "@/components/sections/About";
import NumberSection from "@/components/sections/NumberSection";
import Timeline from "@/components/sections/Timeline";
import Stats from "@/components/sections/Stats";
import Winners from "@/components/sections/Winners";
import Registration from "@/components/sections/Registration";
import Brands from "@/components/sections/Brands";
import TVU from "@/components/sections/TVU";
import Footer from "@/components/sections/Footer";

export default function Home() {
  const [cursorState, setCursorState] = useState<CursorState>("default");
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(pointer: coarse)");
    setIsMobile(mq.matches);

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
        <Winners onCursorChange={setCursor} />
        <Registration onCursorChange={setCursor} />
        <Brands onCursorChange={setCursor} />
        <TVU />
        <Footer />
      </main>
    </div>
  );
}
