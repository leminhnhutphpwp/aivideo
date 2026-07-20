import type { MouseEvent } from 'react';

/**
 * Hạn chế tải xuống tài nguyên "dễ dàng" trên các nơi CHỈ hiển thị (không có
 * tính năng download hợp lệ): chặn chuột phải "Lưu ảnh", kéo-thả, nút download
 * của trình duyệt trên <video>, Picture-in-Picture.
 *
 * Lưu ý: trình duyệt KHÔNG thể chặn 100% (bytes vẫn về client) — đây chỉ là rào
 * cản các đường tải phổ biến. Nơi có nút download chính thức thì KHÔNG dùng props này.
 */
const preventContextMenu = (e: MouseEvent) => e.preventDefault();

/** Gắn vào <img> hiển thị tài nguyên: `<img {...noDownloadImg} />` */
export const noDownloadImg = {
  onContextMenu: preventContextMenu,
  draggable: false,
};

/** Gắn vào <video> hiển thị tài nguyên: `<video {...noDownloadVideo} />` */
export const noDownloadVideo = {
  onContextMenu: preventContextMenu,
  controlsList: 'nodownload noremoteplayback',
  disablePictureInPicture: true,
};
