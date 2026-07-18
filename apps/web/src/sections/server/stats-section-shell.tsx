import { StatsSection } from "../stats-section";

export function StatsSectionShell() {
  return (
    <section className="relative w-full lg:min-h-screen overflow-hidden flex flex-col pt-20 lg:pt-24 pb-8 lg:pb-12 bg-[#050508]">
      <div className="sr-only">
        <h2>Hiệu suất thực tế. Số liệu biết nói.</h2>
        <p>10M+ lượt xem, 150%+ tăng trưởng, engine video AI Qwen/Wan cùng mô hình ảnh &amp; giọng nói, 98% tỷ lệ chuyển đổi</p>
      </div>
      <StatsSection hideText />
    </section>
  );
}
