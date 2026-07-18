import { EcosystemSection } from "../ecosystem-section";

export function EcosystemSectionShell() {
  return (
    <section className="relative w-full lg:min-h-screen overflow-hidden bg-[#030305] flex flex-col pt-20 lg:pt-24 pb-10">
      <div className="sr-only">
        <h2>Một Nền Tảng. Vạn Khả Năng. — Hệ Sinh Thái Toàn Diện</h2>
        <p>Text-to-Video, Image Animation, Auto Scripting, Virtual Avatars — tất cả trong một nền tảng</p>
      </div>
      <EcosystemSection hideText />
    </section>
  );
}
