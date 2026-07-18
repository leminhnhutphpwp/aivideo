import { VisionSection } from "../vision-section";

export function VisionSectionShell() {
  return (
    <section className="relative min-h-[100dvh] w-full flex items-center overflow-hidden py-24 md:py-32 bg-zinc-950">
      <div className="sr-only">
        <h2>Bạn là Director. — Điều Khiển</h2>
        <p>Chọn góc máy. Điều chỉnh ánh sáng. Định tâm trạng. Kiểm soát từng khung hình.</p>
      </div>
      <VisionSection hideText />
    </section>
  );
}
