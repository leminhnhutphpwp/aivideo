import { DirectorSection } from "../director-section";

export function DirectorSectionShell() {
  return (
    <section className="relative min-h-[100dvh] lg:min-h-screen w-full flex items-center py-20 md:py-24 lg:py-0 overflow-hidden bg-[#050508]">
      <div className="sr-only">
        <h2>Bạn là Content Creator — Master Control</h2>
        <p>Tự thiết lập khung hình, ánh sáng &amp; chuyển động — xem kết xuất mô phỏng realtime</p>
      </div>
      <DirectorSection hideText />
    </section>
  );
}
