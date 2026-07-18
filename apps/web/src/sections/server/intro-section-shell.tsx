import { IntroSection } from "../intro-section";

export function IntroSectionShell() {
  return (
    <section className="relative w-full lg:min-h-screen overflow-hidden bg-[#030305] flex items-center justify-center py-24 lg:py-0">
      <div className="sr-only">
        <h2>Sáng Tạo Video AI</h2>
        <p>Giải pháp sáng tạo video dành riêng cho nền tảng mạng xã hội</p>
      </div>
      <IntroSection hideText />
    </section>
  );
}
