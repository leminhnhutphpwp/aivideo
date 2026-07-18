import { WorkflowSection } from "../workflow-section";

export function WorkflowSectionShell() {
  return (
    <section className="relative w-full lg:min-h-screen overflow-hidden bg-zinc-950">
      <div className="sr-only">
        <h2>Quy Trình Hoạt Động — 5 bước tạo video AI</h2>
        <p>Phân tích xu hướng → Sáng tạo nội dung → Biên tập → Render → Phân phối đa kênh</p>
      </div>
      <WorkflowSection hideText />
    </section>
  );
}
