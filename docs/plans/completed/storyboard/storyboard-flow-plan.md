# Storyboard Flow — Remaining Features Plan

## 1. AI Co-pilot Sinh Kịch Bản Tự Động (Google Flow style)

### Concept
Nút "AI Phác thảo" trong toolbar. User nhập ý tưởng → Gemini API phân tích → tự động tạo 4-5 node trên canvas với prompt, camera, style, narration được điền sẵn.

### Implementation

| Layer | Task |
|-------|------|
| **Backend** | New endpoint `POST /api/storyboards/ai-draft` |
| | Accept `{concept: string, video_type: string}` |
| | Call Gemini API with prompt: "Create a storyboard of 4-5 scenes for: {concept}" |
| | Parse JSON response → array of scene objects |
| | Return scenes ready for canvas |
| **Frontend** | Add "AI Phác thảo" button in toolbar with Sparkles icon |
| | Text input popup cho user nhập ý tưởng |
| | Loading state: AI đang suy nghĩ... |
| | Auto-populate nodes on canvas |

### API Contract
```json
POST /api/storyboards/ai-draft
{
  "concept": "Quảng cáo nước tăng lực cyberpunk",
  "video_type": "brand_tvc"
}

Response:
{
  "scenes": [
    {
      "prompt": "...",
      "duration_seconds": 5,
      "camera_movement": "Dolly In",
      "style": "Cyberpunk",
      "narration": "...",
      "edge_label": null
    },
    ...
  ]
}
```

### Dependencies
- Gemini API key in `.env`
- Prompt engineering for consistent JSON output
- Error handling: API key missing, rate limit, bad response format

---

## 2. Character Lock Node (Hedra style)

### Concept
Special "Character Node" hoặc "Style Node" trên canvas. Khi nối vào các scene, nó broadcast reference_image/style cho tất cả scene con, đảm bảo nhân vật đồng nhất xuyên suốt.

### Implementation

| Layer | Task |
|-------|------|
| **DB** | Thêm `node_type` column vào `storyboard_scenes` (values: 'scene', 'character', 'style') |
| **Backend** | Khi render, propagate character/style node properties to connected children |
| | Character node: truyền `reference_image` sang tất cả scene con |
| | Style node: truyền `style`, `mood`, `lighting` |
| **Frontend** | New node design: Character node (hình chân dung), Style node (palette màu) |
| | Visual indicator trên scene node có character/style lock |

---

## 3. Performance & Responsive

### Tasks
| Priority | Task |
|----------|------|
| High | `React.memo(SceneNode)` để tránh re-render hàng loạt |
| High | `useMemo` edges computation trong viewer |
| Medium | Mobile: collapse panels, zoom controls touch-friendly |
| Medium | Lazy load VoiceSelector + ReferencePicker |
| Low | Canvas virtual scrolling for 50+ nodes |

---

## 4. Edge Delete UX

### Tasks
- Click edge hiển thị popup edit label + delete (✅ đã làm)
- Right-click edge → context menu "Xóa kết nối"
- Keyboard: Delete key khi edge selected

---

## 5. Storyboard List Page Upgrade

### Tasks
- Show flow mini-map thumbnail on each card
- Status color border similar to builder nodes
- Quick actions: duplicate, archive
