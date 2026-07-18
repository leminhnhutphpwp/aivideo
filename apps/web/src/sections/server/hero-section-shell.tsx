import { HeroSection } from "../hero-section";

export function HeroSectionShell() {
  return (
    <section className="relative min-h-[80dvh] lg:min-h-screen w-full flex flex-col justify-center lg:justify-end pb-16 pt-32 md:pb-24 lg:pb-20 overflow-hidden bg-[#030305]">
      <div className="sr-only">
        <h1>WAVISE STUDIO — SÁNG TẠO THEO CÁCH CỦA BẠN</h1>
        <p>Nền tảng tạo video AI chuyên nghiệp. Biến ý tưởng thành video chất lượng cao chỉ trong vài phút.</p>
      </div>
      <HeroSection hideText />
    </section>
  );
}
