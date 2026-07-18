"use client";

import dynamic from "next/dynamic";

const DustParticles = dynamic(() => import("./dust-particles").then((m) => m.DustParticles), { ssr: false });
const Vignette = dynamic(() => import("./vignette").then((m) => m.Vignette), { ssr: false });
const ScanLines = dynamic(() => import("./scan-lines").then((m) => m.ScanLines), { ssr: false });
const LightLeak = dynamic(() => import("./light-leak").then((m) => m.LightLeak), { ssr: false });
const Timecode = dynamic(() => import("./timecode").then((m) => m.Timecode), { ssr: false });
const RecIndicator = dynamic(() => import("./rec-indicator").then((m) => m.RecIndicator), { ssr: false });
const Letterbox = dynamic(() => import("./letterbox").then((m) => m.Letterbox), { ssr: false });
const GridOverlay = dynamic(() => import("./grid-overlay").then((m) => m.GridOverlay), { ssr: false });
const CustomCursor = dynamic(() => import("./custom-cursor").then((m) => m.CustomCursor), { ssr: false });
const ScrollProgress = dynamic(() => import("./scroll-progress").then((m) => m.ScrollProgress), { ssr: false });
const ScrollSnapController = dynamic(() => import("./scroll-snap-controller").then((m) => m.ScrollSnapController), { ssr: false });
const BackToTop = dynamic(() => import("./back-to-top").then((m) => m.BackToTop), { ssr: false });

export function DecorLayer() {
  return (
    <>
      <ScrollSnapController />
      <ScrollProgress />
      <DustParticles />
      <Vignette />
      <ScanLines />
      <LightLeak />
      <Timecode />
      <RecIndicator />
      <Letterbox />
      <GridOverlay />
      <CustomCursor />
      <BackToTop />
    </>
  );
}
