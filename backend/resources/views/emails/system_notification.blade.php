<div style="max-width:600px;margin:0 auto;font-family:Arial,sans-serif;background:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #e5e7eb;">
    <div style="background:linear-gradient(135deg,#7C3AED,#06B6D4);padding:24px;text-align:center;">
        <h1 style="color:#fff;margin:0;font-size:20px;">{{title}}</h1>
    </div>
    <div style="padding:24px;color:#374151;line-height:1.6;font-size:14px;">
        <p>Xin chào {{name}},</p>
        <div>{!! strip_tags($body ?? '{{body}}', '<p><br><strong><em><u><s><a><ul><ol><li><h1><h2><h3><h4><h5><h6><blockquote><pre><code><img><table><thead><tbody><tr><th><td><hr>') !!}</div>
        <p style="margin-top:16px;color:#6b7280;font-size:12px;">&mdash; Hệ thống AI Video Platform</p>
    </div>
    <div style="background:#f9fafb;padding:12px 24px;text-align:center;border-top:1px solid #e5e7eb;color:#9ca3af;font-size:11px;">
        Email này được gửi tự động từ hệ thống. Vui lòng không trả lời email này.
    </div>
</div>
