Quickstart API
Dùng chung Base URL /v1, chọn model phù hợp rồi gọi route mà client của bạn cần như chat/completions, responses, embeddings, images/generations, video/generations, audio/speech hoặc models. Ví dụ bên dưới tự đổi payload theo loại model.

Base URL
https://ckey.vn/v1

Ví dụ cURL

Copy
curl https://ckey.vn/v1/chat/completions \
  -H "Authorization: Bearer sk-" \
  -H "Content-Type: application/json" \
  -d '{
    "model":"thanhnhan9023/gpt-image-2",
    "messages":[{"role":"user","content":"Hello"}]
  }'
Ví dụ JavaScript

Copy
const res = await fetch("https://ckey.vn/v1/chat/completions", {
  method: "POST",
  headers: {
    "Authorization": "Bearer sk-",
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    model: "thanhnhan9023/gpt-image-2",
    messages: [{ role: "user", content: "Hello" }]
  })
});

const data = await res.json();