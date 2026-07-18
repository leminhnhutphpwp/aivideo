import { GallerySection } from "../gallery-section";

export function GallerySectionShell() {
  return (
    <section className="relative w-full lg:min-h-screen overflow-hidden flex flex-col pt-20 lg:pt-24 pb-8 lg:pb-12 bg-[#050508]">
      <div className="sr-only">
        <h2>Tạo ra bởi AI. Đẹp chuẩn chuyên nghiệp. — Phong Cách</h2>
        <p>Thư viện video AI: Cinematic, Anime, Cyberpunk, Fantasy, Minimalist</p>
      </div>
      <GallerySection hideText />
    </section>
  );
}
