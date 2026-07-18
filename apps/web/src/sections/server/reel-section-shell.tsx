import { ReelSection } from "../reel-section";

export function ReelSectionShell() {
  return (
    <section className="relative w-full min-h-[80vh] lg:min-h-screen py-24 lg:py-0 flex flex-col justify-center overflow-hidden bg-[#050508]">
      <div className="sr-only">
        <h2>Mọi phong cách. Mọi thế giới. — Showreel</h2>
        <p>Khám phá thư viện video AI đa dạng phong cách</p>
      </div>
      <ReelSection hideText />
    </section>
  );
}
