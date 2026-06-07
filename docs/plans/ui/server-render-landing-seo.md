# Server-Render Landing Page Text cho SEO

## Date
2026-05-31

---

## Overview
Tách text content (h1, h2, p) của 13 section landing page ra khỏi `"use client"` components, đưa vào Server Components để Googlebot luôn đọc được nội dung, trong khi vẫn giữ nguyên GSAP animations, React hooks, và interactive logic trong Client Islands.

### Vấn đề thực tế
Tất cả section hiện tại đều có `"use client"` + `useLandingSettings()` (async fetch trong `useEffect`). Next.js App Router SSR vẫn render HTML từ `useState(DEFAULTS)`, nên Googlebot **đã thấy text** ngay tại response đầu tiên. Tuy nhiên còn 3 điểm cần cải thiện:

| Vấn đề | Mức độ | Mô tả |
|--------|--------|-------|
| Dynamic sections (9-13) lazy-load bằng `next/dynamic` | 🟡 Medium | Dù `ssr: true` (default), các chunk JS tách riêng có thể ảnh hưởng LCP |
| Text từ API không có trong SSR HTML | 🟢 Low | Chỉ hiển thị DEFAULTS — nhưng DEFAULTS đã là text tiếng Việt chuẩn |
| Không có semantic HTML rõ ràng cho crawler | 🟡 Medium | Một số section dùng `<span>` thay vì `<h2>` semantic |

### Mục tiêu
1. **Bắt buộc**: Text content luôn có trong HTML tĩnh (không phụ thuộc JS)
2. **Nên làm**: Giảm LCP bằng cách bỏ `next/dynamic` cho section đầu tiên trong viewport
3. **Nice-to-have**: Text từ API landing page settings cũng được server-render

---

## User Stories
- As Googlebot, tôi muốn thấy `<h1>`, `<h2>`, `<p>` text trong HTML tĩnh để index chính xác nội dung landing page
- As admin, tôi muốn thay đổi text landing page qua admin panel mà Googlebot vẫn thấy text mới
- As developer, tôi muốn tách biệt static text và interactive animation để dễ maintain

---

## Technical Design

### Pattern: "Server Shell + Client Islands"

```
┌─────────────────────────────────────────────┐
│ Server Component (SEO Shell)                 │
│  - Renders semantic HTML: h1, h2, h3, p     │
│  - Dùng DEFAULTS text (không cần API call)  │
│  - Không animation, không hooks             │
│                                              │
│  ┌──────────────────────────────────────┐   │
│  │ Client Island (Interactive Overlay)  │   │
│  │  - "use client"                      │   │
│  │  - GSAP animations                   │   │
│  │  - useInView, useState, useEffect    │   │
│  │  - Text element có aria-hidden=true  │   │
│  │    (vì Server đã render text)        │   │
│  │  - Giữ toàn bộ layout/visual element │   │
│  └──────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

### Text Source Strategy

Hiện tại text đến từ 2 nguồn:
1. **DEFAULTS** (hardcoded trong `use-landing-settings.ts`) — luôn có sẵn
2. **API** (`GET /api/landing-page` từ Laravel) — async, chỉ chạy trên client

**Strategy**: Server Shell render DEFAULTS. Đây là text chuẩn tiếng Việt, đầy đủ SEO value. Khi client hydrate, `useLandingSettings()` fetch API text và cập nhật nếu khác. Trường hợp API text ≠ DEFAULTS rất hiếm (admin mới thay đổi), và Googlebot vẫn có DEFAULTS làm fallback.

**Nâng cao (Phase 2)** — Server fetch từ Laravel API:
```tsx
// page.tsx → async server component
export default async function LandingPage() {
  const settings = await fetchLandingSettings(); // server-side fetch
  return <HeroSectionShell settings={settings} />;
}
```
Cần thêm nếu admin thường xuyên thay đổi text landing page.

---

## Phân loại 13 Section

### Nhóm A: Text-only (có thể server-render toàn bộ text)

| # | Section | Text elements | Dễ server-render? |
|---|---------|--------------|-------------------|
| 1 | Hero | h1 (2 dòng), p subtitle, label | ✅ Có — text tĩnh, animation riêng |
| 2 | Reel | h2 (2 dòng), label | ✅ Có — marquee là CSS animation, không cần JS cho text |
| 3 | Intro | h2 (2 dòng), p subtitle, label, feature pills | ✅ Có — text tĩnh, GSAP là rotating circles |
| 4 | Genesis | h2 (2 dòng), label | ✅ Có — text tĩnh |
| 5 | Vision | h2 (2 dòng), p (2 đoạn), label | ✅ Có — text tĩnh, parallax riêng |
| 6 | Ecosystem | h2 (2 dòng), p subtitle, label, bento text | ✅ Có — text tĩnh |
| 7 | Gallery | h2 (2 dòng), label | ✅ Có — text tĩnh |
| 8 | Sound | h2 (2 dòng), label | ✅ Có — text tĩnh |
| 9 | Stats | h2 (2 dòng), label, stat labels | ✅ Có — numbers động nhưng labels tĩnh |
| 10 | Portal | h2 (2 dòng), p subtitle, label, CTA text | ✅ Có — text tĩnh, morphing riêng |

### Nhóm B: Interactive state ảnh hưởng đến text

| # | Section | Text affected by state | Cách xử lý |
|---|---------|----------------------|------------|
| 5 | Forge | h2 = `active.name` (style name động) | Server render label + title đầu tiên, text động để trong Client |
| 6 | Workflow | h2 = `active.title`, desc = `active.desc` | Tương tự Forge |
| 7 | Director | h2 = title + subtitle từ settings (tĩnh) | ✅ Text tĩnh, chỉ controls là interactive |
| 8 | Genesis | Accordion text = `phase.name`, `phase.desc` | h2 title tĩnh, accordion text để trong Client |

### Nhóm C: Không dùng `useLandingSettings` text

| # | Section | Ghi chú |
|---|---------|---------|
| - | Vision | Có file nhưng không import trong page.tsx |

---

## Cấu trúc file mới

```
apps/web/src/
├── sections/
│   ├── server/                          # ← NEW: Server Component shells
│   │   ├── hero-section-shell.tsx
│   │   ├── reel-section-shell.tsx
│   │   ├── intro-section-shell.tsx
│   │   ├── genesis-section-shell.tsx
│   │   ├── forge-section-shell.tsx
│   │   ├── workflow-section-shell.tsx
│   │   ├── director-section-shell.tsx
│   │   ├── gallery-section-shell.tsx
│   │   ├── sound-section-shell.tsx
│   │   ├── ecosystem-section-shell.tsx
│   │   ├── stats-section-shell.tsx
│   │   ├── portal-section-shell.tsx
│   │   └── vision-section-shell.tsx     # (nếu dùng trong tương lai)
│   │
│   ├── hero-section.tsx                 # MODIFIED: thêm hideText prop
│   ├── reel-section.tsx                 # MODIFIED: thêm hideText prop
│   ├── intro-section.tsx                # MODIFIED: thêm hideText prop
│   ├── ... (các file hiện tại)
│   └── vision-section.tsx
│
├── app/
│   └── page.tsx                         # MODIFIED: import từ server/
│
└── hooks/
    └── use-landing-settings.ts          # UNCHANGED: giữ nguyên DEFAULTS
```

---

## File-by-File Design

### 1. `sections/server/hero-section-shell.tsx` (NEW)

```tsx
import { DEFAULTS } from "@/hooks/use-landing-settings";
import { HeroSection } from "@/sections/hero-section";

export function HeroSectionShell() {
  return (
    <section id="hero-section" className="relative min-h-[80dvh] lg:h-screen...">
      {/* Static text — Googlebot reads this */}
      <div className="relative z-10 ...">
        <div className="mb-8">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full ...">
            <span className="w-1.5 h-1.5 rounded-full bg-[#ff5a1f] ..."></span>
            {DEFAULTS.hero_label}
          </span>
        </div>
        <h1 className="mb-6 font-black text-white ...">
          <span className="block">{DEFAULTS.hero_title_line1}</span>
          <span className="block text-gradient-ember">{DEFAULTS.hero_title_line2}</span>
        </h1>
        <p className="text-lg text-slate-300 ...">{DEFAULTS.hero_subtitle}</p>
      </div>
      {/* Client island — animations, parallax, interactivity */}
      <HeroSection hideText />
    </section>
  );
}
```

### 2. `sections/hero-section.tsx` (MODIFIED)

Thêm prop `hideText?: boolean`. Khi `hideText=true`:
- Text elements thêm `aria-hidden="true"` và `className="absolute inset-0 opacity-0 pointer-events-none"`
- Layout, background, decorative elements giữ nguyên
- GSAP animations vẫn chạy bình thường

```tsx
"use client";
interface Props { hideText?: boolean; }
export function HeroSection({ hideText = false }: Props) {
  // ... existing logic unchanged ...
  
  return (
    <section id="hero-section" className="...">
      {/* ... backgrounds, decor ... */}
      
      {/* Text layer — hidden when server shell provides text */}
      <div className={hideText ? "sr-only" : ""} aria-hidden={hideText}>
        <h1>
          <span>{ls.hero_title_line1}</span>
          <span>{ls.hero_title_line2}</span>
        </h1>
        <p>{ls.hero_subtitle}</p>
      </div>
      
      {/* Visual elements — always visible */}
      <div className="hero-orb-wrap">...</div>
    </section>
  );
}
```

### 3. `app/page.tsx` (MODIFIED)

```tsx
import { HeroSectionShell } from "@/sections/server/hero-section-shell";
import { ReelSectionShell } from "@/sections/server/reel-section-shell";
// ... import all shells

// Remove next/dynamic for above-fold sections (Hero, Reel, Intro)
// Keep dynamic only for below-fold sections
const GenesisSectionShell = dynamic(() => import("...").then(m => m.GenesisSectionShell));
// ...

export default function LandingPage() {
  return (
    <main className="...">
      <Preloader />
      <DecorLayer />
      <NavBar />
      
      <HeroSectionShell />      {/* Static import — no lazy load */}
      <ReelSectionShell />       {/* Static import */}
      <IntroSectionShell />      {/* Static import */}
      
      <GenesisSectionShell />    {/* Lazy below fold */}
      <ForgeSectionShell />
      <WorkflowSectionShell />
      <DirectorSectionShell />
      <GallerySectionShell />
      <SoundSectionShell />
      <EcosystemSectionShell />
      <StatsSectionShell />
      <PortalSectionShell />
      
      <Footer />
    </main>
  );
}
```

---

## Chiến lược Text Visibility

Để tránh duplicate text giữa Server Shell và Client Island:

### Option 1: Server text visible, Client text `sr-only` (Khuyến nghị)
- ✅ Googlebot thấy text bình thường
- ✅ Người dùng thấy text animation từ client (vẫn visible)
- ❌ Text render 2 lần trong DOM (SEO không phạt duplicate text trong cùng page, nhưng hơi lãng phí)

```css
/* Server text: visible, in normal flow */
.server-text { /* default visible */ }

/* Client text: visually hidden, but still rendered for screen readers */
.client-text { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0,0,0,0); }
```

### Option 2: Server text `sr-only`, Client text visible
- ✅ Người dùng thấy text animation bình thường
- ✅ Googlebot thấy text trong `<h1>` semantic (dù sr-only)
- ⚠️ Google xếp hạng thấp hơn cho text ẩn (hidden text penalty risk)

### Option 3: Một element, CSS visibility toggle
- ✅ Không duplicate DOM
- ✅ Client script ẩn server text, hiện client text sau mount
- ❌ Cần script nhỏ để toggle
- ❌ Có thể gây flash nếu script chạy chậm

**Khuyến nghị: Option 1** — Server renders full visible text. Client text dùng `sr-only` (Tailwind class). Googlebot đọc text bình thường từ Server Shell, user thấy animation từ Client Island (vẫn visible vì nằm trong visual layer). Không có hidden text penalty vì text server hoàn toàn visible.

### Xác nhận: Googlebot có thấy text từ Server Component không?
**Có.** Next.js App Router pre-renders Server Components thành HTML tĩnh. Khi Googlebot request `/`, response HTML đã chứa toàn bộ text từ Server Shell. Không cần JS execute. Đây là cải thiện SEO chính so với hiện tại (dù hiện tại SSR cũng render DEFAULTS, nhưng phụ thuộc vào hydration).

---

## Edge Cases

| Case | Xử lý |
|------|-------|
| Admin thay đổi text qua API → text trong HTML ≠ text user thấy | Client hydrate với text mới từ API. User thấy text mới. Googlebot thấy text cũ (DEFAULTS) cho đến lần crawl sau — chấp nhận được vì thay đổi landing page rất hiếm |
| JavaScript disabled → user thấy gì? | Thấy text từ Server Shell (DEFAULTS). Layout cơ bản vẫn hiển thị. Không có animation nhưng text đầy đủ |
| API `/api/landing-page` down | Client fallback về DEFAULTS (giống hiện tại). Không crash |
| Section bị lỗi hydration (server text ≠ client text) | Dùng `suppressHydrationWarning` trên wrapper div nếu cần. Nhưng vì Server Shell và Client Island là 2 DOM element riêng biệt, sẽ không có hydration mismatch |
| Forge/Workflow: text thay đổi theo state (style name) | Server Shell render title của item đầu tiên. Client Island tự quản lý state và thay đổi text. Googlebot thấy ít nhất 1 version của text |

---

## Estimate Effort

| Phase | Task | Effort | Agent |
|-------|------|--------|-------|
| **Phase 1** | Tạo 13 Server Shell files | 2h | @web |
| **Phase 2** | Modify 13 Client Components (+ `hideText` prop) | 2.5h | @web |
| **Phase 3** | Refactor `page.tsx` (import shells, bỏ dynamic cho above-fold) | 0.5h | @web |
| **Phase 4** | Verify: `tsc --noEmit`, visual check, Googlebot test | 1h | @web + @tester |
| **Tổng** | | **~6h** | |

### Breakdown chi tiết

#### Phase 1: Server Shells (2h)
- Nhóm A (text tĩnh — 8 sections): ~10 phút/section = 1.3h
  - Hero, Reel, Intro, Vision, Ecosystem, Gallery, Sound, Stats, Portal
- Nhóm B (text động một phần — 4 sections): ~15 phút/section = 1h
  - Forge, Workflow, Director, Genesis
- Setup thư mục `sections/server/`: ~5 phút

#### Phase 2: Client Modifications (2.5h)
- Thêm interface `{ hideText?: boolean }`: ~5 phút / section × 13 = ~1h
- Wrap text elements với conditional visibility: ~5 phút / section × 13 = ~1h
- Regression test animations: ~30 phút

#### Phase 3: page.tsx Refactor (0.5h)
- Import từ `server/` thay vì sections/
- Bỏ `next/dynamic` cho Hero, Reel, Intro (trên fold)
- Giữ `next/dynamic` cho các section dưới fold

#### Phase 4: Verify (1h)
- `cd apps/web && npx tsc --noEmit`
- `curl http://localhost:3000 | grep -E '<h[12]'` — verify text có trong HTML
- Lighthouse SEO score
- Manual check: tắt JS trong browser, verify text vẫn hiển thị

---

## Risks & Trade-offs

| Risk | Impact | Mitigation |
|------|--------|------------|
| Duplicate DOM (2 bản text) | Bundle size +5-10KB HTML | Chấp nhận được — SEO value > HTML size |
| Client component refactor gây regression animation | Mất animation | Test từng section sau khi sửa |
| Server Shell text khác Client text (API update) | User thấy text mới, Googlebot thấy text cũ | Chấp nhận — API text change rất hiếm. Có thể giải quyết bằng Phase 2 (server fetch) |
| `sr-only` text bị Google phạt | SEO ranking giảm | Dùng Option 1: server text visible, client text ẩn. Không có hidden text penalty |
| Tăng thời gian build | Không đáng kể | Server Shells chỉ là static JSX, không có data fetching |

---

## Implementation Tasks

| # | Phase | Task | Agent | Est. |
|---|-------|------|-------|------|
| 1 | Setup | Tạo thư mục `sections/server/` và export barrel file | @web | 10m |
| 2 | Phase 1 | Tạo `hero-section-shell.tsx` | @web | 10m |
| 3 | Phase 1 | Tạo `reel-section-shell.tsx` | @web | 10m |
| 4 | Phase 1 | Tạo `intro-section-shell.tsx` | @web | 10m |
| 5 | Phase 1 | Tạo `genesis-section-shell.tsx` (title tĩnh, accordion text động trong client) | @web | 15m |
| 6 | Phase 1 | Tạo `forge-section-shell.tsx` (label tĩnh, style name động trong client) | @web | 15m |
| 7 | Phase 1 | Tạo `workflow-section-shell.tsx` (label tĩnh, step title động trong client) | @web | 15m |
| 8 | Phase 1 | Tạo `director-section-shell.tsx` | @web | 10m |
| 9 | Phase 1 | Tạo `gallery-section-shell.tsx` | @web | 10m |
| 10 | Phase 1 | Tạo `sound-section-shell.tsx` | @web | 10m |
| 11 | Phase 1 | Tạo `ecosystem-section-shell.tsx` (title + subtitle tĩnh, bento text động) | @web | 15m |
| 12 | Phase 1 | Tạo `stats-section-shell.tsx` (label + title tĩnh, numbers động) | @web | 10m |
| 13 | Phase 1 | Tạo `portal-section-shell.tsx` | @web | 10m |
| 14 | Phase 2 | Thêm `hideText` prop vào `HeroSection` | @web | 15m |
| 15 | Phase 2 | Thêm `hideText` prop vào `ReelSection` | @web | 10m |
| 16 | Phase 2 | Thêm `hideText` prop vào `IntroSection` | @web | 10m |
| 17 | Phase 2 | Thêm `hideText` prop vào `GenesisSection` | @web | 15m |
| 18 | Phase 2 | Thêm `hideText` prop vào `ForgeSection` | @web | 15m |
| 19 | Phase 2 | Thêm `hideText` prop vào `WorkflowSection` | @web | 15m |
| 20 | Phase 2 | Thêm `hideText` prop vào `DirectorSection` | @web | 10m |
| 21 | Phase 2 | Thêm `hideText` prop vào `GallerySection` | @web | 10m |
| 22 | Phase 2 | Thêm `hideText` prop vào `SoundSection` | @web | 10m |
| 23 | Phase 2 | Thêm `hideText` prop vào `EcosystemSection` | @web | 15m |
| 24 | Phase 2 | Thêm `hideText` prop vào `StatsSection` | @web | 10m |
| 25 | Phase 2 | Thêm `hideText` prop vào `PortalSection` | @web | 10m |
| 26 | Phase 2 | Thêm `hideText` prop vào `VisionSection` | @web | 10m |
| 27 | Phase 3 | Refactor `page.tsx`: import shells, bỏ dynamic cho above-fold | @web | 30m |
| 28 | Phase 4 | `tsc --noEmit` verify | @web | 15m |
| 29 | Phase 4 | Visual regression test tất cả section | @web + @tester | 30m |
| 30 | Phase 4 | SEO verification (curl HTML, Lighthouse) | @web | 15m |
| 31 | Phase 4 | Write worklog + update task-status.md | @web | 15m |

---

## Verification Checklist

Sau khi implement:

- [ ] `cd apps/web && npx tsc --noEmit` — 0 errors mới
- [ ] `curl http://localhost:3000 | grep -c '<h1'` — ≥ 1 (có h1 tag)
- [ ] `curl http://localhost:3000 | grep -c '<h2'` — ≥ 10 (có h2 tags)
- [ ] `curl http://localhost:3000 | grep 'Tạo Video AI'` — text tiếng Việt có trong HTML
- [ ] Tắt JavaScript trong browser → text vẫn hiển thị
- [ ] Lighthouse SEO score ≥ 90
- [ ] GSAP animations vẫn hoạt động (visual check từng section)
- [ ] Interactive elements vẫn hoạt động (Forge slider, Workflow auto-cycle, Director tabs)
- [ ] Không có visual duplicate text (2 dòng text chồng lên nhau)
- [ ] Responsive: mobile view không bị vỡ layout

---

## Future Enhancements (Phase 2)

### Server-side fetch landing page settings
Sau khi Laravel API `/api/landing-page` hoàn thiện (đang trong backlog task `Landing Page Settings`), có thể nâng cấp:

```tsx
// page.tsx
export default async function LandingPage() {
  const settings = await fetch(`${API_URL}/api/landing-page`, {
    next: { revalidate: 3600 } // ISR: revalidate mỗi 1h
  }).then(r => r.json());
  
  return <HeroSectionShell settings={settings} />;
}
```

Điều này đảm bảo Googlebot luôn thấy text mới nhất từ admin, không phụ thuộc vào DEFAULTS. Nhưng cần backend task hoàn tất trước.
