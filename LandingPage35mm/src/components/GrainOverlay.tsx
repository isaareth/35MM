export default function GrainOverlay() {
  return (
    <div className="fixed inset-0 pointer-events-none z-[9998] overflow-hidden opacity-[0.038]">
      <div
        className="grain-animate absolute"
        style={{ top: "-50%", left: "-50%", width: "200%", height: "200%" }}
      >
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <filter id="grain-filter">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.65"
              numOctaves="3"
              stitchTiles="stitch"
            />
            <feColorMatrix type="saturate" values="0" />
          </filter>
          <rect width="100%" height="100%" filter="url(#grain-filter)" />
        </svg>
      </div>
    </div>
  );
}
