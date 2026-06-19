# WP Elementor AI Connector — Kế Hoạch Cải Tiến

## Ngày
2026-06-16

## Tổng Quan

Phân tích chi tiết các vấn đề kỹ thuật trong AI Generator panel của Elementor editor. Panel hiện tại cảm giác "rất tệ, không chuyên nghiệp, mỗi request mất gần 10 phút" do nhiều vấn đề nghiêm trọng: streaming bị bỏ rơi, không có timeout, thiếu song song, và feedback tối thiểu.

---

## Vấn Đề Được Xác Định

### Mức Độ Nghiêm Trọng

| Mức | Mô Tả | Ảnh Hưởng |
|-----|-------|-----------|
| **P0** | Critical — Ảnh hưởng trực tiếp đến trải nghiệm người dùng | Phải sửa ngay |
| **P1** | High — Gây khó chịu đáng kể | Nên sửa trong sprint này |
| **P2** | Medium — Cải thiện chất lượng | Lên kế hoạch sửa |

---

## Phase 1: Sửa Đổ Nghiêm Trọng (P0) — Ưu Tiên Tối Đa

### 1.1 Kích Hoạt Streaming Code (P0)

**Vấn Đề:**
- Backend đã có đầy đủ streaming: `class-api-client.php:282-363` sử dụng `curl_exec` với `CURLOPT_WRITEFUNCTION` cho SSE parsing
- `class-ajax-handler.php:215-227` có `ajax_generate_streaming()` thu thập chunks
- NHƯNG: `elementor-ai-drawer.js:163` gọi `wpeac_elementor_generate` (non-streaming), KHÔNG phải streaming endpoint
- Server buffer toàn bộ response → user chờ 30-120s chỉ với spinner

**Giải Pháp Kỹ Thuật:**

1. **Frontend (elementor-ai-drawer.js):**
   ```javascript
   // THAY THẾ: fetch non-streaming
   // BẰNG: EventSource hoặc fetch với ReadableStream
   
   async function generateWithStreaming(prompt, options) {
     const response = await fetch(wpeac_ajax_url, {
       method: 'POST',
       headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
       body: new URLSearchParams({
         action: 'wpeac_elementor_generate_streaming', // Endpoint mới
         prompt: prompt,
         nonce: wpeac_nonce
       })
     });
   
     const reader = response.body.getReader();
     const decoder = new TextDecoder();
   
     while (true) {
       const { done, value } = await reader.read();
       if (done) break;
       
       const chunk = decoder.decode(value);
       const lines = chunk.split('\n');
       
       for (const line of lines) {
         if (line.startsWith('data: ')) {
           const data = JSON.parse(line.slice(6));
           updateProgressUI(data); // Hiển thị từng token
         }
       }
     }
   }
   ```

2. **Backend (class-ajax-handler.php):**
   ```php
   // Đảm bảo endpoint streaming hoạt động đúng
   public function ajax_generate_streaming() {
     check_ajax_referer('wpeac_nonce', 'nonce');
     
     header('Content-Type: text/event-stream');
     header('Cache-Control: no-cache');
     header('Connection: keep-alive');
     
     $prompt = sanitize_text_field($_POST['prompt']);
     
     // Gọi API với streaming callback
     $this->api_client->generate_streaming($prompt, function($chunk) {
       echo "data: " . json_encode($chunk) . "\n\n";
       ob_flush();
       flush();
     });
     
     wp_die();
   }
   ```

3. **Kết Nối Endpoint:**
   - Đăng ký action mới: `add_action('wp_ajax_wpeac_elementor_generate_streaming', [$handler, 'ajax_generate_streaming']);`
   - Cập nhật JS để gọi endpoint mới

**Nỗ Lực:** 8-12 giờ

**Files Thay Đổi:**
- `elementor-ai-drawer.js` — Chuyển sang streaming fetch
- `class-ajax-handler.php` — Sửa endpoint streaming
- `class-api-client.php` — Đảm bảo streaming callback hoạt động

**Kết Quả Mong Đợi:**
- User thấy token xuất hiện real-time thay vì chờ toàn bộ
- Giảm perceived wait time từ 30-120s xuống 5-15s (user thấy progress)

---

### 1.2 Thêm Client-Side Timeout (P0)

**Vấn Đề:**
- `elementor-ai-drawer.js:82-83` — `fetch()` không có timeout
- `elementor-ai-panel.js:417-449` — `$.ajax()` không có timeout
- Server timeout 120s (`class-api-client.php:75`) nhưng user không thấy gì

**Giải Pháp Kỹ Thuật:**

1. **Tạo Timeout Wrapper:**
   ```javascript
   // utils/timeout.js
   export function fetchWithTimeout(url, options, timeoutMs = 30000) {
     return Promise.race([
       fetch(url, options),
       new Promise((_, reject) =>
         setTimeout(() => reject(new Error('Timeout')), timeoutMs)
       )
     ]);
   }
   
   // Hoặc dùng AbortController
   export function fetchWithAbort(url, options, timeoutMs = 30000) {
     const controller = new AbortController();
     const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
     
     return fetch(url, { ...options, signal: controller.signal })
       .finally(() => clearTimeout(timeoutId));
   }
   ```

2. **Áp Dụng Cho Tất Cả Requests:**
   ```javascript
   // elementor-ai-drawer.js
   // TRƯỚC:
   fetch(wpeac_ajax_url, { ... })
   
   // SAU:
   fetchWithTimeout(wpeac_ajax_url, { ... }, 60000) // 60s timeout
   ```

3. **Hiển Thị Timeout UI:**
   ```javascript
   try {
     const response = await fetchWithTimeout(...);
   } catch (error) {
     if (error.message === 'Timeout') {
       showErrorUI('Request quá lâu. Vui lòng thử lại hoặc giảm độ phức tạp.');
     }
   }
   ```

**Nỗ Lực:** 4-6 giờ

**Files Thay Đổi:**
- `elementor-ai-drawer.js` — Thêm timeout cho fetch
- `elementor-ai-panel.js` — Thêm timeout cho $.ajax
- Tạo `utils/timeout.js` (nếu cần)

**Kết Quả Mong Đợi:**
- User thấy thông báo lỗi rõ ràng khi timeout
- Không còn treo vô hạn

---

### 1.3 Sửa Lỗi Nuốt Silent Error (P0)

**Vấn Đề:**
- `elementor-ai-drawer.js:99` — `catch(e) {}` loại bỏ lỗi tạo element
- `insertElements()` trả về `n > 0` ngay cả khi nửa elements thất bại

**Giải Pháp Kỹ Thuật:**

1. **Ghi Lại Và Hiển Thị Lỗi:**
   ```javascript
   // TRƯỚC:
   try {
     createElement(data);
   } catch (e) {} // Im lặng thất bại
   
   // SAU:
   try {
     createElement(data);
   } catch (e) {
     console.error('Element creation failed:', e);
     errors.push({ index: i, error: e.message });
     // Hiển thị toast lỗi cho element cụ thể
     showElementError(i, e.message);
   }
   ```

2. **Trả Về Chi Tiết Thất Bại:**
   ```javascript
   // TRƯỚC:
   function insertElements(elements) {
     let n = 0;
     elements.forEach(el => {
       try { createElement(el); n++; } catch(e) {}
     });
     return n > 0; // Sai lệch
   }
   
   // SAU:
   function insertElements(elements) {
     const results = { success: 0, failed: 0, errors: [] };
     elements.forEach((el, i) => {
       try {
         createElement(el);
         results.success++;
       } catch(e) {
         results.failed++;
         results.errors.push({ index: i, message: e.message });
       }
     });
     return results;
   }
   ```

3. **Hiển Thị Tổng Kết:**
   ```javascript
   const results = insertElements(elements);
   if (results.failed > 0) {
     showSummaryToast(
       `Đã tạo ${results.success} elements, ${results.failed} thất bại`,
       'warning'
     );
   }
   ```

**Nỗ Lực:** 3-4 giờ

**Files Thay Đổi:**
- `elementor-ai-drawer.js` — Sửa error handling

**Kết Quả Mong Đợi:**
- User biết chính xác element nào thất bại
- Dễ debug hơn

---

### 1.4 Sửa Alert() Trong Legacy Panel (P0)

**Vấn Đề:**
- `elementor-ai-panel.js:405,440-441,444,469,491` — Dùng `alert()` cho lỗi/thành công
- Cảm giác không chuyên nghiệp, block UI

**Giải Pháp Kỹ Thuật:**

1. **Thay Thế Bằng Toast Notifications:**
   ```javascript
   // TRƯỚC:
   alert('Đã tạo thành công!');
   alert('Có lỗi xảy ra: ' + error);
   
   // SAU:
   import { showToast } from './utils/notifications';
   
   showToast('Đã tạo thành công!', 'success');
   showToast('Có lỗi xảy ra: ' + error, 'error');
   ```

2. **Tạo Toast Component:**
   ```javascript
   // utils/notifications.js
   export function showToast(message, type = 'info', duration = 3000) {
     const toast = document.createElement('div');
     toast.className = `wpeac-toast wpeac-toast-${type}`;
     toast.textContent = message;
     toast.style.cssText = `
       position: fixed;
       bottom: 20px;
       right: 20px;
       padding: 12px 20px;
       border-radius: 8px;
       color: white;
       z-index: 10000;
       animation: slideIn 0.3s ease;
     `;
     
     document.body.appendChild(toast);
     setTimeout(() => {
       toast.style.animation = 'slideOut 0.3s ease';
       setTimeout(() => toast.remove(), 300);
     }, duration);
   }
   ```

3. **CSS Cho Toast:**
   ```css
   .wpeac-toast-success { background: #10b981; }
   .wpeac-toast-error { background: #ef4444; }
   .wpeac-toast-warning { background: #f59e0b; }
   .wpeac-toast-info { background: #3b82f6; }
   
   @keyframes slideIn {
     from { transform: translateX(100%); opacity: 0; }
     to { transform: translateX(0); opacity: 1; }
   }
   
   @keyframes slideOut {
     from { transform: translateX(0); opacity: 1; }
     to { transform: translateX(100%); opacity: 0; }
   }
   ```

**Nỗ LựC:** 3-4 giờ

**Files Thay Đổi:**
- `elementor-ai-panel.js` — Thay alert bằng toast
- Tạo `utils/notifications.js`
- Thêm CSS toast

**Kết Quả Mong Đợi:**
- UX chuyên nghiệp hơn
- Không block UI

---

## Phase 2: Cải Thiện Trải Nghiệm (P1)

### 2.1 Thêm Parallel Requests Cho Full Page Mode (P1)

**Vấn Đề:**
- `elementor-ai-drawer.js:247-254` — `for` loop với `await buildOne(i)`
- 6-10 sections × 30-120s mỗi cái = 3-10+ phút tổng
- Không thử parallel requests

**Giải Pháp Kỹ Thuật:**

1. **Sử Dụng Promise.allSettled Với Concurrency Limit:**
   ```javascript
   // utils/parallel.js
   export async function parallelLimit(tasks, limit = 3) {
     const results = [];
     const executing = new Set();
     
     for (const [index, task] of tasks.entries()) {
       const promise = task().then(result => {
         executing.delete(promise);
         return { status: 'fulfilled', value: result, index };
       }).catch(error => {
         executing.delete(promise);
         return { status: 'rejected', reason: error, index };
       });
       
       executing.add(promise);
       results.push(promise);
       
       if (executing.size >= limit) {
         await Promise.race(executing);
       }
     }
     
     return Promise.allSettled(results);
   }
   ```

2. **Áp Dụng Cho Full Page Generation:**
   ```javascript
   // TRƯỚC:
   for (let i = 0; i < sections.length; i++) {
     await buildOne(i); // Sequential, chậm
   }
   
   // SAU:
   const tasks = sections.map((section, i) => () => buildOne(i));
   const results = await parallelLimit(tasks, 3); // 3 concurrent
   
   // Xử lý kết quả
   const failed = results.filter(r => r.status === 'rejected');
   if (failed.length > 0) {
     showToast(`${failed.length} sections thất bại`, 'warning');
   }
   ```

3. **Hiển Thị Progress Parallel:**
   ```javascript
   function updateParallelProgress(results) {
     const completed = results.filter(r => r.status !== 'pending').length;
     const total = results.length;
     updateProgressBar(completed / total);
     updateStatusText(`Đã hoàn thành ${completed}/${total} sections`);
   }
   ```

**Nỗ LựC:** 6-8 giờ

**Files Thay Đổi:**
- `elementor-ai-drawer.js` — Parallel generation
- Tạo `utils/parallel.js`

**Kết Quả Mong Đợi:**
- Giảm thời gian từ 3-10 phút xuống 1-3 phút (với 3 parallel)
- Hiển thị progress thực tế

---

### 2.2 Cải Thiện Progress Feedback (P1)

**Vấn Đề:**
- Quick mode: Chỉ có CircularProgress spinner + text "Generating..."
- Full page: LinearProgress bar (done/total) + spinner per section
- Không có streaming tokens, ETA, status messages, generation stages

**Giải Pháp Kỹ Thuật:**

1. **Tạo Progress Component Nâng Cao:**
   ```javascript
   // components/GenerationProgress.js
   class GenerationProgress {
     constructor(container) {
       this.container = container;
       this.stages = [
         { name: 'Đang gửi prompt...', duration: 1000 },
         { name: 'Đang xử lý AI...', duration: null }, // Streaming
         { name: 'Đang tạo elements...', duration: 2000 },
         { name: 'Hoàn thành!', duration: 500 }
       ];
       this.currentStage = 0;
       this.render();
     }
     
     render() {
       this.container.innerHTML = `
         <div class="wpeac-progress">
           <div class="wpeac-progress-stage">${this.stages[this.currentStage].name}</div>
           <div class="wpeac-progress-bar">
             <div class="wpeac-progress-fill" style="width: ${this.getProgress()}%"></div>
           </div>
           <div class="wpeac-progress-detail">
             <span id="token-count">0 tokens</span>
             <span id="elapsed-time">0s</span>
             <span id="eta">Đang tính...</span>
           </div>
         </div>
       `;
     }
     
     updateTokenCount(count) {
       document.getElementById('token-count').textContent = `${count} tokens`;
     }
     
     updateETA(seconds) {
       document.getElementById('eta').textContent = `Còn ~${seconds}s`;
     }
   }
   ```

2. **Streaming Token Display:**
   ```javascript
   // Khi nhận streaming response
   function onStreamingChunk(chunk) {
     progress.updateTokenCount(chunk.totalTokens);
     progress.updateElapsedTime(chunk.elapsed);
     progress.updateETA(chunk.estimatedRemaining);
   }
   ```

3. **CSS Cho Progress:**
   ```css
   .wpeac-progress {
     padding: 16px;
     background: #f8fafc;
     border-radius: 8px;
     margin: 12px 0;
   }
   
   .wpeac-progress-stage {
     font-weight: 600;
     margin-bottom: 8px;
     color: #1e293b;
   }
   
   .wpeac-progress-bar {
     height: 6px;
     background: #e2e8f0;
     border-radius: 3px;
     overflow: hidden;
     margin-bottom: 8px;
   }
   
   .wpeac-progress-fill {
     height: 100%;
     background: linear-gradient(90deg, #3b82f6, #8b5cf6);
     transition: width 0.3s ease;
   }
   
   .wpeac-progress-detail {
     display: flex;
     justify-content: space-between;
     font-size: 12px;
     color: #64748b;
   }
   ```

**Nỗ LựC:** 8-10 giờ

**Files Thay Đổi:**
- Tạo `components/GenerationProgress.js`
- `elementor-ai-drawer.js` — Tích hợp progress component
- Thêm CSS

**Kết Quả Mong Đợi:**
- User thấy chính xác đang ở giai đoạn nào
- Biết ETA, token count
- Cảm giác chuyên nghiệp hơn nhiều

---

### 2.3 Sửa Race Condition Rate Limiting (P1)

**Vấn Đề:**
- `class-ajax-handler.php:533-554` — Dựa trên transient, concurrent requests có thể burst over limit

**Giải Pháp Kỹ Thuật:**

1. **Sử Dụng Distributed Lock:**
   ```php
   // TRƯỚC (có race condition):
   $count = get_transient('wpeac_rate_limit_' . $user_id);
   if ($count >= $limit) {
     wp_send_json_error('Rate limit exceeded');
   }
   set_transient('wpeac_rate_limit_' . $user_id, $count + 1, 60);
   
   // SAU (atomic với Redis/Memcached):
   $key = 'wpeac_rate_limit:' . $user_id;
   $count = wp_cache_get($key, 'wpeac');
   
   if ($count === false) {
     wp_cache_set($key, 1, 'wpeac', 60);
   } elseif ($count >= $limit) {
     wp_send_json_error('Rate limit exceeded');
   } else {
     wp_cache_incr($key, 1, 'wpeac');
   }
   ```

2. **Hoặc Sử Dụng Database Lock:**
   ```php
   // Dùng DB transaction để atomic
   global $wpdb;
   $wpdb->query('START TRANSACTION');
   
   $count = $wpdb->get_var($wpdb->prepare(
     "SELECT COUNT(*) FROM wpeac_rate_limits WHERE user_id = %d AND created_at > DATE_SUB(NOW(), INTERVAL 1 MINUTE)",
     $user_id
   ));
   
   if ($count >= $limit) {
     $wpdb->query('ROLLBACK');
     wp_send_json_error('Rate limit exceeded');
   }
   
   $wpdb->insert('wpeac_rate_limits', ['user_id' => $user_id, 'created_at' => now()]);
   $wpdb->query('COMMIT');
   ```

**Nỗ LựC:** 4-6 giờ

**Files Thay Đổi:**
- `class-ajax-handler.php` — Sửa rate limiting logic
- Có thể cần thêm table/cache config

**Kết Quả Mong Đợi:**
- Không còn burst over limit
- Rate limiting công bằng hơn

---

## Phase 3: Tối Ưu Và Polish (P2)

### 3.1 Tăng max_tokens Cap (P2)

**Vấn Đề:**
- `class-api-client.php:143` — `max_tokens` cap ở 8192
- Large pages có thể bị truncate

**Giải Pháp Kỹ Thuật:**

1. **Tăng Hoặc Dynamic Cap:**
   ```php
   // TRƯỚC:
   'max_tokens' => 8192,
   
   // SAU:
   'max_tokens' => min(16384, $this->calculateRequiredTokens($prompt)),
   ```

2. **Hoặc Loại Hoàn Toàn:**
   ```php
   // Nếu API cho phép, loại bỏ cap
   // 'max_tokens' => null, // Để API quyết định
   ```

**Nỗ LựC:** 1-2 giờ

**Files Thay Đổi:**
- `class-api-client.php` — Điều chỉnh max_tokens

---

### 3.2 Tối Ưu Preview Handler (P2)

**Vấn Đề:**
- `class-preview-handler.php:237-254,289-297` — Tạo/xóa temp posts mỗi request
- expensive, orphan post risk

**Giải Pháp Kỹ Thuật:**

1. **Sử Dụng Transient Thay Vì Posts:**
   ```php
   // TRƯỚC:
   $post_id = wp_insert_post(['post_type' => 'wpeac_preview', ...]);
   // ... sử dụng
   wp_delete_post($post_id, true);
   
   // SAU:
   $preview_data = [
     'content' => $content,
     'metadata' => $metadata,
     'expires' => time() + 300 // 5 phút
   ];
   set_transient('wpeac_preview_' . $request_id, $preview_data, 300);
   ```

2. **Hoặc Sử Dụng Object Cache:**
   ```php
   wp_cache_set('preview_' . $request_id, $preview_data, 'wpeac', 300);
   ```

**Nỗ LựC:** 3-4 giờ

**Files Thay Đổi:**
- `class-preview-handler.php` — Chuyển sang transient/cache

---

### 3.3 Dọn Dẹp Duplicate Endpoints (P2)

**Vấn Đề:**
- Old `WPEAC_AJAX_Handler` đăng ký `wpeac_generate` (dead code)
- New `WPEAC_Elementor_Panel` đăng ký `wpeac_elementor_generate` (active)

**Giải Pháp Kỹ Thuật:**

1. **Xác Định Và Loại Bỏ Dead Code:**
   ```php
   // Kiểm tra xem endpoint nào đang được sử dụng
   // Nếu chắc chắn dead code, xóa class cũ
   
   // Hoặc đánh dấu deprecated
   /**
    * @deprecated Use WPEAC_Elementor_Panel instead
    */
   class WPEAC_AJAX_Handler { ... }
   ```

2. **Di Chuyển Endpoints:**
   ```php
   // Gộp tất cả vào một class
   class WPEAC_Elementor_Panel {
     // Non-streaming (legacy)
     public function ajax_generate() { ... }
     
     // Streaming (new)
     public function ajax_generate_streaming() { ... }
   }
   ```

**Nỗ LựC:** 2-3 giờ

**Files Thay Đổi:**
- `class-ajax-handler.php` — Xóa/deprecate code cũ
- `class-elementor-panel.php` — Gộp endpoints

---

## Bảng Tổng Hợp Nỗ Lực

| Phase | Việc | Nỗ LựC | Priority |
|-------|------|---------|----------|
| **1** | Kích hoạt streaming | 8-12h | P0 |
| **1** | Thêm timeout | 4-6h | P0 |
| **1** | Sửa silent error | 3-4h | P0 |
| **1** | Thay alert() | 3-4h | P0 |
| **2** | Parallel requests | 6-8h | P1 |
| **2** | Progress feedback | 8-10h | P1 |
| **2** | Fix rate limit race | 4-6h | P1 |
| **3** | Tăng max_tokens | 1-2h | P2 |
| **3** | Tối ưu preview | 3-4h | P2 |
| **3** | Dọn duplicate endpoints | 2-3h | P2 |
| | **TỔNG** | **42-59 giờ** | |

---

## Thứ Tự Triển Khai

### Tuần 1: Phase 1 (P0) — 18-26 giờ
1. **Ngày 1-2:** Kích hoạt streaming (8-12h)
2. **Ngày 3:** Thêm timeout (4-6h)
3. **Ngày 4:** Sửa silent error (3-4h)
4. **Ngày 5:** Thay alert() (3-4h)

### Tuần 2: Phase 2 (P1) — 18-24 giờ
1. **Ngày 6-7:** Parallel requests (6-8h)
2. **Ngày 8-9:** Progress feedback (8-10h)
3. **Ngày 10:** Fix rate limit race (4-6h)

### Tuần 3: Phase 3 (P2) — 6-9 giờ
1. **Ngày 11:** Tăng max_tokens (1-2h)
2. **Ngày 12:** Tối ưu preview (3-4h)
3. **Ngày 13:** Dọn duplicate endpoints (2-3h)

---

## Kết Quả Mong Đợi

### Sau Phase 1:
- ✅ Streaming tokens real-time (giảm perceived wait time 50-70%)
- ✅ Timeout rõ ràng (không treo vô hạn)
- ✅ Lỗi hiển thị chi tiết (không silent failure)
- ✅ UX chuyên nghiệp (không alert())

### Sau Phase 2:
- ✅ Parallel generation (giảm thời gian 50-70%)
- ✅ Progress chi tiết (tokens, ETA, stages)
- ✅ Rate limiting công bằng

### Sau Phase 3:
- ✅ Large pages không truncate
- ✅ Preview không expensive
- ✅ Codebase sạch hơn

---

## Rủi Ro & Giải Pháp

| Rủi Ro | Giải Pháp |
|--------|-----------|
| Streaming có thể timeout ở proxy/firewall | Thêm fallback về non-streaming |
| Parallel requests có thể overload server | Giới hạn concurrency (3-5) |
| Cache có thể mất data | Fallback về DB/transient |
| Breaking changes cho existing users | Versioned endpoints, backward compatible |

---

## Testing Checklist

- [ ] Streaming hoạt động trên tất cả browsers (Chrome, Firefox, Safari)
- [ ] Timeout hiển thị đúng ở 30s, 60s, 120s
- [ ] Parallel requests không vượt quá rate limit
- [ ] Error messages hiển thị rõ ràng
- [ ] Toast notifications không block UI
- [ ] Large pages (10+ sections) tạo thành công
- [ ] Preview không tạo orphan posts
- [ ] Legacy endpoints deprecated đúng cách

---

## Tài Liệu Liên Quan

- `class-api-client.php:282-363` — Streaming implementation
- `class-ajax-handler.php:215-227` — Streaming endpoint
- `elementor-ai-drawer.js:163` — Current non-streaming call
- `elementor-ai-drawer.js:247-254` — Sequential loop
- `elementor-ai-panel.js:405,440-441,444,469,491` — alert() usage
- `class-preview-handler.php:237-254,289-297` — Temp post creation

---

**Người Tạo:** Strategic Planner  
**Ngày Tạo:** 2026-06-16  
**Trạng Thái:** Ready for Review
