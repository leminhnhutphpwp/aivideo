# Credit Pack Purchase UI — Design Plan

## Date
2026-06-01

## Overview
Redesign the credit purchase flow from a free-form "nhập tay số tiền" (manual amount input) to a **fixed credit pack selector** with 3 pre-defined packages. User selects a pack → sees bank info + transfer code → completes bank transfer → SePay auto-confirms → credits auto-credited.

The backend (`POST /api/credits/purchase`, SePay webhook, `GET /api/credits/pending-purchases`) is fully complete — this task is **frontend only** (web agent).

## User Stories
- As a user, I want to see 3 clear credit pack options with pricing so I can quickly choose a pack without calculating.
- As a user, I want to select a pack and immediately see bank transfer details + a unique transfer code so I can complete payment.
- As a user, I want to copy the transfer code with one click so I don't mistype it in my banking app.
- As a user, I want to see my pending purchase status update automatically so I know when credits arrive.
- As a user, I want clear visual feedback on which pack I selected and the credits I'll receive.

---

## 1. Credit Pack Options (Fixed — Source of Truth)

| Pack | VND | Credits | Giá/credit | Value Badge |
|------|----:|:-------:|:----------:|-------------|
| Thử | 30,000 | 2,500 | 12đ | — |
| Nhỏ | 50,000 | 6,000 | 16.7đ | — |
| Vừa | 100,000 | 12,000 | 8.3đ | "Phổ biến nhất" |
| Trung | 150,000 | 18,000 | 8.3đ | — |
| Lớn | 200,000 | 25,000 | 8đ | "Giá tốt nhất" |
| Cao | 300,000 | 40,000 | 7.5đ | "Siêu tiết kiệm" |
| Premium | 500,000 | 70,000 | 7.1đ | "Dành cho pro" |

> These values are **hardcoded constants** in the frontend, NOT fetched from API. The backend receives only `amount: number` — the `credits_to_receive` is calculated server-side by `CreditSetting::exchangeRate()` for accuracy. The frontend displays credits as informational preview only.

---

## 2. Technical Design

### 2.1 Data Flow

```
User opens /billing
    │
    ├─ CreditPackSection renders 3 pack cards
    │
    ├─ User clicks "Chọn gói" on a card
    │       │
    │       ├─ Optimistic: show selected state on card
    │       └─ API: POST /api/credits/purchase { amount: <pack.price> }
    │              │
    │              ├─ Success → show BankInfoModal (receipt)
    │              │            display: bank info, transfer_code, credits, amount
    │              │            copy button for transfer_code
    │              │
    │              └─ Error → toast error message
    │
    ├─ BankInfoModal dismissed → refresh page data
    │       │
    │       └─ PendingPurchases list refreshes (polls every 10s when pending items exist)
    │
    └─ User does bank transfer → SePay webhook fires
            │
            └─ Laravel: PendingCreditPurchase → status='paid', credits added
               PendingPurchases polling detects status change → auto-refreshes credits balance
```

### 2.2 API Calls

| # | API | Method | When | Request | Response |
|---|-----|--------|------|---------|----------|
| 1 | `/api/credits/purchase` | POST | After pack selection + confirm | `{ amount: number }` | `{ bank, amount, content (transfer_code), credits_to_receive, note }` |
| 2 | `/api/credits/pending-purchases` | GET | Page load + poll every 10s | — | `{ data: [{ id, transfer_code, amount, credits, status, created_at }] }` |
| 3 | `/api/auth/me` | GET | After receipt dismissed (refresh credits) | — | `{ user, plan, ... }` |
| 4 | `/api/credits/balance` | GET | After receipt dismissed (refresh balance) | — | `{ balance: number }` |

### 2.3 State Management

All state lives in the billing `page.tsx` — local React state, no Zustand needed (scope is page-local).

```typescript
// In BillingPage
const [selectedPack, setSelectedPack] = useState<CreditPack | null>(null); // pack being confirmed
const [purchaseLoading, setPurchaseLoading] = useState(false);
const [purchaseReceipt, setPurchaseReceipt] = useState<PurchaseData | null>(null); // bank info modal
```

### 2.4 Component Tree

```
BillingPage
├── BillingModals (existing — REFACTOR)
│   ├── UpgradeConfirmModal (existing — KEEP)
│   ├── BankInfoModal (EXTRACT from existing ReceiptModal)
│   │   ├── Amount + credits highlight
│   │   ├── Bank info (3-col grid)
│   │   ├── Transfer code + copy button
│   │   ├── Warning note
│   │   └── "Đã chuyển khoản" dismiss button
│   └── ❌ Manual amount input modal (REPLACE with CreditPackSection)
│
├── BillingHero (MODIFY — change "Nạp ngay" to scroll to packs)
├── PricingPlans (KEEP — no change)
├── CreditPackSection (NEW)
│   ├── Section header + description
│   ├── CreditPackCard × 3 (new cards)
│   │   ├── Pack name + icon
│   │   ├── Price (VND)
│   │   ├── Credits received
│   │   ├── Value badge (optional)
│   │   └── Select button → POST /api/credits/purchase
│   └── Selected state + confirmation step (inline or mini confirm)
│
├── UpgradeHistoryTable (KEEP)
├── PendingPurchases (KEEP — works as-is)
└── TransactionHistory (KEEP)
```

---

## 3. Files to Create / Modify

### 3.1 NEW Files

| File | Purpose | Lines (est.) |
|------|---------|:-----------:|
| `apps/web/src/components/billing/CreditPackSection.tsx` | Section component: renders 3 pack cards, handles selection, inline confirm step, calls API | ~200 |

### 3.2 MODIFIED Files

| File | Change | Lines (est.) |
|------|--------|:-----------:|
| `apps/web/src/components/billing/types.ts` | Add `CreditPackConfig` interface + `PACK_OPTIONS` constant | +25 |
| `apps/web/src/app/(dashboard)/billing/page.tsx` | Add `CreditPackSection`, wire purchase receipt to `BillingModals` (BankInfoModal), adjust `loadData` | ~40 changed |
| `apps/web/src/components/billing/BillingModals.tsx` | Refactor: extract bank info display into reusable `BankInfoModal` sub-component, remove manual amount input flow, accept external `purchaseReceipt` state | ~80 changed |
| `apps/web/src/components/billing/BillingHero.tsx` | Change "Nạp ngay" button from `onOpenPurchaseModal` to smooth-scroll to `#credit-packs` section | ~5 changed |
| `apps/web/src/lib/i18n/vi.ts` | Add new billing i18n keys for credit packs | +10 |
| `apps/web/src/lib/api/client.ts` | Verify `creditsPurchase()` + `pendingCreditsPurchases()` exist (they do — no change needed) | 0 |

### 3.3 Files NOT Changed (work as-is)

- `PendingPurchases.tsx` — already polls, displays status, triggers refresh
- `PricingPlans.tsx` — subscription plans, unrelated
- `UpgradeHistoryTable.tsx` — unrelated
- `TransactionHistory.tsx` — unrelated

---

## 4. Component Specifications

### 4.1 `CreditPackSection.tsx`

```typescript
// Constants (hardcoded — match docs/plans/billing/credit-pack-ui.md section 1)
export const PACK_OPTIONS = [
  { id: 'trial', name: 'Thử', price: 30000, credits: 2500, value: null },
  { id: 'small', name: 'Gói Nhỏ', price: 50000, credits: 6000, value: null },
  { id: 'medium', name: 'Gói Vừa', price: 100000, credits: 12000, value: 'Phổ biến nhất' },
  { id: 'mid', name: 'Gói Trung', price: 150000, credits: 18000, value: null },
  { id: 'large', name: 'Gói Lớn', price: 200000, credits: 25000, value: 'Giá tốt nhất' },
  { id: 'xlarge', name: 'Gói Cao', price: 300000, credits: 40000, value: 'Siêu tiết kiệm' },
  { id: 'premium', name: 'Premium', price: 500000, credits: 70000, value: 'Dành cho pro' },
] as const;

export type CreditPack = typeof PACK_OPTIONS[number];
```

**States to handle:**

| State | Visual |
|-------|--------|
| **Default** | 3 cards in grid, none selected |
| **Selected** (user clicked) | Card highlights with orange border, shows inline confirm area |
| **Loading** | Card shows spinner, other cards dimmed |
| **Success** | Transitions to BankInfoModal (external) |
| **Error** | Toast error, card returns to default |
| **Locked** (if user has >= MAX_PENDING_PURCHASES pending) | All cards disabled, warning message |

**UI Layout:**
- 3-column grid on desktop, stacked on mobile
- Card: rounded-3xl, dark bg `#0c0c0c` → `#080808`, border `white/5`
- Selected: border `#FF5A1F/30`, subtle orange glow
- Value badge: positioned top-right, small pill with gradient background
- Inline confirm step (after selection):
  - Summary: "Bạn sẽ nhận X credits với giá Yđ"
  - Two buttons: "Xác nhận" (calls API) + "Đổi gói khác" (deselects)
- Loading spinner overlay on the selected card

### 4.2 `BankInfoModal` (Refactored from `BillingModals.tsx`)

The existing "Receipt Modal" in `BillingModals.tsx` already has the exact bank info display needed. The refactor:

1. **Extract the receipt display into a named sub-component** `BankInfoModal`
2. **Accept props:** `{ data: PurchaseData, onClose: () => void }`
3. **Remove the manual amount input modal entirely** (the flow with `purchaseAmount` state, `handleConfirmStep`, `handlePurchase` in `BillingModals`)
4. The page now controls when `BankInfoModal` is shown via `purchaseReceipt` state
5. The existing upgrade receipt modal stays (upgrade flow is separate)

**Props:**
```typescript
interface BankInfoModalProps {
  data: PurchaseData;          // { success, bank, amount, content, credits_to_receive, note }
  type: 'purchase' | 'upgrade';
  onClose: () => void;
}
```

### 4.3 `BillingHero.tsx` Modifications

- Change "Nạp ngay" button `onClick` from `onOpenPurchaseModal` to:
  ```typescript
  onClick={() => document.getElementById('credit-packs')?.scrollIntoView({ behavior: 'smooth' })}
  ```
- This replaces the "open modal" behavior with "scroll to packs section"

### 4.4 `page.tsx` Modifications

```typescript
// New state
const [purchaseReceipt, setPurchaseReceipt] = useState<PurchaseData | null>(null);
const [purchaseLoading, setPurchaseLoading] = useState(false);

// handlePackSelect called from CreditPackSection
const handlePackSelect = async (pack: CreditPack) => {
  setPurchaseLoading(true);
  try {
    const data = await laravel.creditsPurchase(pack.price);
    setPurchaseReceipt({
      success: true,
      message: data.message || '',
      bank: data.bank,
      amount: data.amount,
      content: data.content,
      credits_to_receive: data.credits_to_receive,
      note: data.note,
    });
  } catch (err: any) {
    addToast(err.message || 'Có lỗi xảy ra', 'error');
  } finally {
    setPurchaseLoading(false);
  }
};
```

---

## 5. Edge Cases

| # | Scenario | Handling |
|---|----------|----------|
| 1 | User has 3+ pending purchases (MAX_PENDING_PURCHASES) | Show warning banner: "Bạn đang có X yêu cầu nạp đang chờ. Vui lòng hoàn tất trước khi nạp thêm." Cards disabled |
| 2 | API returns 429 (rate limit) | Toast: "Bạn thao tác quá nhanh, vui lòng chờ trong giây lát!" |
| 3 | API returns validation error (amount < min) | Toast with server error message |
| 4 | User clicks pack multiple times while loading | Loading state prevents re-click. Spinner overlay on card |
| 5 | User dismisses BankInfoModal, closes/reopens browser | Transfer code persists in PendingPurchases list; info available again |
| 6 | Network error during purchase | Toast: "Lỗi kết nối, vui lòng thử lại" |
| 7 | `credits_to_receive` differs from preview | Show server response value in BankInfoModal (source of truth). Frontend preview is informational only |
| 8 | Scroll to packs section | Use `scrollIntoView({ behavior: 'smooth' })` with `id="credit-packs"` on section wrapper |
| 9 | Mobile layout | Cards stack vertically on mobile. Grid 1-col on mobile, 3-col on md+ |
| 10 | SePay processing delay | PendingPurchases component already polls every 10s — no change needed |

---

## 6. Risks & Trade-offs

| Risk | Severity | Mitigation |
|------|:--------:|------------|
| Hardcoded pack values vs API exchange_rate | Low | Backend is single source of truth for final credits. Frontend shows estimated credits from constants — minor discrepancy (< 1%) is acceptable |
| Removing free-form amount input is a UX regression for some users | Medium | The task explicitly requires fixed packs only. If needed later, free-form can be re-added as sub-option |
| BillingModals refactor could break upgrade flow | Medium | Extract carefully, keep upgrade flow intact, verify both flows |
| Exchange rate change requires code change | Low | PACK_OPTIONS constant should be easy to find and update. Future: could be fetched from `GET /api/credits/settings` but out of scope |

---

## 7. Implementation Tasks

| # | Layer | Task | Agent | Est. |
|---|-------|------|-------|:---:|
| 1 | Web | Add `PACK_OPTIONS` constant + `CreditPack` type to `types.ts` | @web | 10m |
| 2 | Web | Add new i18n keys to `vi.ts` | @web | 5m |
| 3 | Web | Create `CreditPackSection.tsx` component | @web | 1.5h |
| 4 | Web | Refactor `BillingModals.tsx`: extract `BankInfoModal`, remove manual input flow | @web | 1h |
| 5 | Web | Modify `BillingHero.tsx`: change "Nạp ngay" to scroll-to-section | @web | 5m |
| 6 | Web | Modify `billing/page.tsx`: wire `CreditPackSection`, new state, receipt flow | @web | 45m |
| 7 | Web | Verify: tsc --noEmit, visual test (3 packs, select, bank info, copy code) | @web | 30m |
| 8 | Web | Write worklog `apps/web/worklogs/2026-06-01-credit-pack-ui.md` | @web | 10m |
| 9 | Coord | Update `task-status.md` | @planner | 5m |

**Total estimated effort: ~4.5h** (web agent only, no backend/daemon changes)

### Dependency Order
```
Task 1  ─┬─► Task 3 (CreditPackSection depends on types + i18n)
Task 2  ─┘
Task 4  (BillingModals refactor — independent)
Task 5  (BillingHero mod — independent, can parallel with 3+4)
Task 6  (page.tsx — depends on 3 + 4 + 5)
Task 7  (Verify — depends on 6)
Task 8  (Worklog — depends on 7)
Task 9  (task-status — depends on 8)
```

---

## 8. Verify Checklist

### TypeScript
- [ ] `cd apps/web && npx tsc --noEmit` — 0 new errors
- [ ] All new components properly typed

### Functional
- [ ] 3 pack cards render correctly with prices + credits
- [ ] Clicking a card highlights it with orange border
- [ ] Selected card shows inline confirm (amount + credits preview)
- [ ] "Xác nhận" calls `POST /api/credits/purchase` with correct `amount`
- [ ] On success, BankInfoModal shows with bank info + transfer code
- [ ] Copy button copies transfer code to clipboard
- [ ] "Đã chuyển khoản" dismisses modal, refreshes page data
- [ ] On error, toast shows error message, card resets
- [ ] "Nạp ngay" in BillingHero scrolls to CreditPackSection
- [ ] PendingPurchases list updates correctly (existing functionality)
- [ ] Upgrade flow still works (upgrade modal, confirm, receipt)

### Mobile
- [ ] Packs stack vertically (1-col grid)
- [ ] Cards are touch-friendly (min 44px tap targets)
- [ ] BankInfoModal is scrollable, fits mobile viewport

### Edge Cases
- [ ] User with 3+ pending purchases sees warning + disabled cards
- [ ] Loading spinner prevents double-clicks
- [ ] Network error shows toast, card resets
- [ ] Dismissing BankInfoModal works correctly with Escape key + backdrop click

---

## 9. Handoff Notes

### @web Agent — Before Starting
1. Read this plan fully
2. Read existing `BillingModals.tsx` carefully — understand the current receipt modal structure
3. Read existing `page.tsx` — understand state management
4. Read `client.ts` for `creditsPurchase()` and `pendingCreditsPurchases()` signatures
5. Read `types.ts` for existing type patterns

### @web Agent — Style Reference
- Color: accent `#FF5A1F`, bg `#000000`, cards `#080808` to `#0c0c0c`
- Border: `white/5` default, `white/10` hover, `#FF5A1F/30` selected
- Typography: font-sans, Vietnamese labels, `text-[10px] tracking-widest uppercase` for section headers
- Animation: `motion/react` (framer-motion), same spring config as existing cards
- Icons: Lucide React (`Coins`, `Sparkles`, `ArrowRight`, `Loader2`)
- Rounding: `rounded-2xl` or `rounded-3xl` consistent with existing billing cards

### @backend Agent — No Changes Needed
Backend is already fully built:
- `POST /api/credits/purchase` validates amount, creates purchase, returns bank info
- `GET /api/credits/pending-purchases` returns pending list
- SePay webhook auto-confirms and adds credits
- If exchange_rate changes, the frontend pack constants should also be updated (but minor discrepancy is acceptable since backend is source of truth)
