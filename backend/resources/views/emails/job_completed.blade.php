<div style="font-family: Arial, Helvetica, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #2563eb, #1d4ed8); padding: 24px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 22px;">{{$medium_label}} của bạn đã sẵn sàng!</h1>
        </div>
        <div style="padding: 24px;">
            <p style="color: #374151; font-size: 14px; line-height: 1.6;">Xin chào <strong>{{name}}</strong>,</p>
            <p style="color: #374151; font-size: 14px; line-height: 1.6;">Job render <strong>{{job_name}}</strong> đã hoàn tất thành công:</p>
            <table style="width: 100%; background: #f9fafb; border-radius: 6px; padding: 16px; margin: 16px 0;">
                <tr>
                    <td style="padding: 4px 8px; color: #6b7280; font-size: 13px;">Thời gian xử lý</td>
                    <td style="padding: 4px 8px; color: #374151; font-size: 14px;">{{duration}}</td>
                </tr>
            </table>
            <p style="text-align: center; margin: 24px 0;">
                <a href="{{$result_url}}" style="display: inline-block; padding: 12px 32px; background: #2563eb; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: bold;">{{$action_label}}</a>
            </p>
        </div>
        <div style="background: #f9fafb; padding: 12px 24px; border-top: 1px solid #e5e7eb;">
            <p style="color: #9ca3af; font-size: 11px; margin: 0; text-align: center;">Email này được gửi từ hệ thống.</p>
        </div>
    </div>
</div>
