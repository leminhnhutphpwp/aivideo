'use client';

import { create } from 'zustand';
import { laravel } from '@/lib/api/client';

interface NotificationState {
  /** Số thông báo chưa đọc — nguồn dữ liệu chung cho badge topbar và các trang. */
  unreadCount: number;
  /** Ghi đè trực tiếp (dùng khi topbar fetch theo interval/focus). */
  setUnreadCount: (count: number) => void;
  /** Giảm số chưa đọc (mark-read từng thông báo). */
  decrementUnread: (by?: number) => void;
  /** Đưa về 0 (đánh dấu tất cả đã đọc). */
  resetUnread: () => void;
  /** Fetch lại số chưa đọc từ API và cập nhật store. */
  refreshUnread: () => Promise<void>;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  unreadCount: 0,
  setUnreadCount: (count) => set({ unreadCount: Math.max(0, count) }),
  decrementUnread: (by = 1) => set((s) => ({ unreadCount: Math.max(0, s.unreadCount - by) })),
  resetUnread: () => set({ unreadCount: 0 }),
  refreshUnread: async () => {
    try {
      const count = await laravel.notificationsUnreadCount();
      set({ unreadCount: typeof count === 'number' ? Math.max(0, count) : 0 });
    } catch {
      // im lặng — giữ giá trị hiện tại
    }
  },
}));

/**
 * Minimal HTML sanitizer cho `notif.body` trước khi inject qua dangerouslySetInnerHTML.
 * Chỉ giữ một allowlist thẻ định dạng an toàn; loại bỏ script/style/iframe, mọi
 * attribute không nằm trong allowlist (gồm on*), và URL javascript:/data:.
 * Không thêm dependency nặng (DOMPurify chưa có trong package.json).
 */
const ALLOWED_TAGS = new Set([
  'B', 'STRONG', 'I', 'EM', 'U', 'A', 'BR', 'P', 'SPAN', 'UL', 'OL', 'LI', 'DIV', 'CODE',
]);
const ALLOWED_ATTRS: Record<string, Set<string>> = {
  A: new Set(['href', 'target', 'rel']),
};

export function sanitizeNotificationBody(html: string | null | undefined): string {
  if (!html) return '';

  // SSR / môi trường không có DOM → strip toàn bộ thẻ về text thuần (an toàn tuyệt đối).
  if (typeof window === 'undefined' || typeof DOMParser === 'undefined') {
    return html.replace(/<[^>]*>/g, '');
  }

  const doc = new DOMParser().parseFromString(html, 'text/html');

  const walk = (node: Element) => {
    for (const el of Array.from(node.children)) {
      const tag = el.tagName;

      if (!ALLOWED_TAGS.has(tag)) {
        // Thay thẻ không hợp lệ bằng text content của nó (giữ chữ, bỏ markup nguy hiểm).
        el.replaceWith(doc.createTextNode(el.textContent || ''));
        continue;
      }

      const allowed = ALLOWED_ATTRS[tag] || new Set<string>();
      for (const attr of Array.from(el.attributes)) {
        const name = attr.name.toLowerCase();
        if (!allowed.has(name)) {
          el.removeAttribute(attr.name);
          continue;
        }
        if (name === 'href') {
          const v = attr.value.trim().toLowerCase();
          if (v.startsWith('javascript:') || v.startsWith('data:') || v.startsWith('vbscript:')) {
            el.removeAttribute(attr.name);
          }
        }
      }

      if (tag === 'A' && el.hasAttribute('href')) {
        el.setAttribute('rel', 'noopener noreferrer nofollow');
        el.setAttribute('target', '_blank');
      }

      walk(el);
    }
  };

  walk(doc.body);
  return doc.body.innerHTML;
}
