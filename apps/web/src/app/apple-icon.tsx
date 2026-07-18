import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 180,
          height: 180,
          borderRadius: 32,
          background: 'linear-gradient(135deg, #FF5A1F, #6B2415)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 80,
          fontWeight: 900,
          color: 'white',
          fontFamily: 'sans-serif',
        }}
      >
        H
      </div>
    ),
    { ...size },
  );
}
