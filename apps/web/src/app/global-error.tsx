'use client';

import { useEffect } from 'react';

/**
 * Global error boundary.
 *
 * Bắt các lỗi phát sinh trong chính root `layout.tsx` (render tree /
 * generateMetadata) — những trường hợp mà `error.tsx` KHÔNG bắt được.
 * Vì layout gốc đã hỏng, component này phải tự render `<html>`/`<body>`
 * của riêng nó với UI dự phòng tối giản (không phụ thuộc font/CSS toàn cục).
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') return;
    console.error(error);
  }, [error]);

  return (
    <html lang="vi">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#000000',
          color: '#ffffff',
          fontFamily:
            'system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            padding: '24px',
            maxWidth: '32rem',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '16px',
              background: 'rgba(239, 68, 68, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '24px',
              fontSize: '28px',
            }}
            aria-hidden="true"
          >
            ⚠️
          </div>

          <h2
            style={{
              fontSize: '1.75rem',
              fontWeight: 700,
              letterSpacing: '-0.02em',
              margin: '0 0 8px',
            }}
          >
            Đã xảy ra lỗi nghiêm trọng
          </h2>

          <p
            style={{
              fontSize: '0.875rem',
              color: '#94a3b8',
              fontWeight: 500,
              lineHeight: 1.6,
              margin: '0 0 32px',
              maxWidth: '24rem',
            }}
          >
            Ứng dụng gặp sự cố khi khởi tạo. Vui lòng thử tải lại trang.
          </p>

          <button
            onClick={() => reset()}
            style={{
              height: '48px',
              padding: '0 32px',
              borderRadius: '12px',
              background: '#FF5A1F',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '0.875rem',
              letterSpacing: '-0.01em',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Tải lại trang
          </button>
        </div>
      </body>
    </html>
  );
}
