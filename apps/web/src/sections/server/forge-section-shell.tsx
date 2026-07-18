import { ForgeSection } from "../forge-section";

export function ForgeSectionShell() {
  return (
    <section className="relative w-full lg:min-h-screen overflow-hidden bg-zinc-950">
      <div className="sr-only">
        <h2>Style Engine — 6 phong cách AI</h2>
        <p>Cinematic, Anime, Cyberpunk, Fantasy, Minimalist, Realistic</p>
      </div>
      <ForgeSection hideText />
    </section>
  );
}
