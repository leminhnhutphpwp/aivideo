import { GenesisSection } from "../genesis-section";

export function GenesisSectionShell() {
  return (
    <section className="relative w-full lg:min-h-screen overflow-hidden bg-[#030305] flex items-center py-20 lg:py-0">
      <div className="sr-only">
        <h2>Một Ý Tưởng. Vô Hạn Sáng Tạo. — Cốt Lõi Công Nghệ</h2>
        <p>Nắm bắt xu hướng, tạo video, tối ưu tương tác</p>
      </div>
      <GenesisSection hideText />
    </section>
  );
}
