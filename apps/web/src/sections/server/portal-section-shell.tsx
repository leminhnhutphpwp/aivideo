import { PortalSection } from "../portal-section";

export function PortalSectionShell() {
  return (
    <section className="relative min-h-[100dvh] lg:min-h-screen w-full flex items-center justify-center overflow-hidden bg-zinc-950">
      <div className="sr-only">
        <h2>Câu chuyện của bạn bắt đầu từ đây. — Vào Studio</h2>
        <p>Studio sẵn sàng. Máy quay đang chờ. Ý tưởng của bạn là duy nhất còn thiếu.</p>
      </div>
      <PortalSection hideText />
    </section>
  );
}
