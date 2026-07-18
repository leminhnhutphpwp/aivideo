<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\EmailTemplate;

class EmailTemplateSeeder extends Seeder
{
    public function run(): void
    {
        EmailTemplate::updateOrCreate(
            ['key' => 'welcome'],
            [
                'title' => 'Thư chào mừng',
                'subject' => 'Chào mừng {{name}} đến với ứng dụng!',
                'body' => file_get_contents(resource_path('views/emails/welcome.blade.php')),
                'placeholders' => [
                    'name' => 'Tên người dùng',
                    'email' => 'Địa chỉ Email',
                    'login_url' => 'Đường dẫn đăng nhập',
                ],
                'is_html' => true,
                'enabled' => true,
            ]
        );

        EmailTemplate::updateOrCreate(
            ['key' => 'reset_password'],
            [
                'title' => 'Cấp lại mật khẩu',
                'subject' => 'Yêu cầu cấp lại mật khẩu cho tài khoản',
                'body' => file_get_contents(resource_path('views/emails/reset_password.blade.php')),
                'placeholders' => [
                    'name' => 'Tên người dùng',
                    'reset_url' => 'Đường dẫn đặt lại mật khẩu',
                ],
                'is_html' => true,
                'enabled' => true,
            ]
        );

        EmailTemplate::updateOrCreate(
            ['key' => 'credits_added'],
            [
                'title' => 'Credits đã được nạp',
                'subject' => 'Đã nạp {{amount}} credits vào tài khoản',
                'body' => file_get_contents(resource_path('views/emails/credits_added.blade.php')),
                'placeholders' => [
                    'name' => 'Tên người dùng',
                    'amount' => 'Số credits được thêm',
                    'balance' => 'Số dư credits hiện tại',
                    'description' => 'Mô tả giao dịch',
                ],
                'is_html' => true,
                'enabled' => true,
            ]
        );

        EmailTemplate::updateOrCreate(
            ['key' => 'credits_refunded'],
            [
                'title' => 'Credits được hoàn lại',
                'subject' => 'Hoàn lại credits cho job {{job_name}}',
                'body' => file_get_contents(resource_path('views/emails/credits_refunded.blade.php')),
                'placeholders' => [
                    'name' => 'Tên người dùng',
                    'amount' => 'Số credits hoàn lại',
                    'balance' => 'Số dư credits hiện tại',
                    'job_name' => 'Tên job render',
                ],
                'is_html' => true,
                'enabled' => true,
            ]
        );

        EmailTemplate::updateOrCreate(
            ['key' => 'job_completed'],
            [
                'title' => 'Job render hoàn tất',
                'subject' => '{{medium_label}} của bạn đã sẵn sàng - {{job_name}}',
                'body' => file_get_contents(resource_path('views/emails/job_completed.blade.php')),
                'placeholders' => [
                    'name' => 'Tên người dùng',
                    'job_name' => 'Tên job render',
                    'duration' => 'Thời gian xử lý',
                    'result_url' => 'URL xem kết quả',
                    'medium_label' => 'Loại media (Video/Hình ảnh)',
                    'action_label' => 'Text nút (Xem video/Xem hình ảnh)',
                ],
                'is_html' => true,
                'enabled' => true,
            ]
        );

        EmailTemplate::updateOrCreate(
            ['key' => 'job_failed'],
            [
                'title' => 'Job render thất bại',
                'subject' => 'Job render {{job_name}} gặp lỗi',
                'body' => file_get_contents(resource_path('views/emails/job_failed.blade.php')),
                'placeholders' => [
                    'name' => 'Tên người dùng',
                    'job_name' => 'Tên job render',
                    'error_reason' => 'Lý do lỗi',
                ],
                'is_html' => true,
                'enabled' => true,
            ]
        );

        EmailTemplate::updateOrCreate(
            ['key' => 'account_locked'],
            [
                'title' => 'Tài khoản bị khóa',
                'subject' => 'Tài khoản của bạn đã bị khóa',
                'body' => file_get_contents(resource_path('views/emails/account_locked.blade.php')),
                'placeholders' => [
                    'name' => 'Tên người dùng',
                    'reason' => 'Lý do khóa tài khoản',
                ],
                'is_html' => true,
                'enabled' => true,
            ]
        );

        EmailTemplate::updateOrCreate(
            ['key' => 'account_unlocked'],
            [
                'title' => 'Tài khoản được mở khóa',
                'subject' => 'Tài khoản của bạn đã được mở khóa',
                'body' => file_get_contents(resource_path('views/emails/account_unlocked.blade.php')),
                'placeholders' => [
                    'name' => 'Tên người dùng',
                    'login_url' => 'URL đăng nhập',
                ],
                'is_html' => true,
                'enabled' => true,
            ]
        );

        EmailTemplate::updateOrCreate(
            ['key' => 'password_reset_code'],
            [
                'title' => 'Mã xác thực đặt lại mật khẩu',
                'subject' => 'Mã xác thực đặt lại mật khẩu của bạn',
                'body' => file_get_contents(resource_path('views/emails/password_reset_code.blade.php')),
                'placeholders' => [
                    'name' => 'Tên người dùng',
                    'code' => 'Mã xác thực 6 số',
                ],
                'is_html' => true,
                'enabled' => true,
            ]
        );

        EmailTemplate::updateOrCreate(
            ['key' => 'plan_expiry_reminder'],
            [
                'title' => 'Nhắc nhở gói dịch vụ sắp hết hạn',
                'subject' => 'Gói {{plan_name}} sắp hết hạn - Gia hạn ngay',
                'body' => file_get_contents(resource_path('views/emails/plan_expiry_reminder.blade.php')),
                'placeholders' => [
                    'name' => 'Tên người dùng',
                    'plan_name' => 'Tên gói dịch vụ',
                    'expiry_date' => 'Ngày hết hạn',
                    'grace_end' => 'Ngày kết thúc thời gian gia hạn',
                    'login_url' => 'URL đăng nhập',
                ],
                'is_html' => true,
                'enabled' => true,
            ]
        );

        EmailTemplate::updateOrCreate(
            ['key' => 'plan_expired'],
            [
                'title' => 'Gói dịch vụ đã hết hạn',
                'subject' => 'Gói {{old_plan}} của bạn đã hết hạn',
                'body' => file_get_contents(resource_path('views/emails/plan_expired.blade.php')),
                'placeholders' => [
                    'name' => 'Tên người dùng',
                    'old_plan' => 'Tên gói cũ',
                    'login_url' => 'URL đăng nhập',
                ],
                'is_html' => true,
                'enabled' => true,
            ]
        );

        EmailTemplate::updateOrCreate(
            ['key' => 'email_verify'],
            [
                'title' => 'Xác thực địa chỉ email',
                'subject' => 'Xác thực email của bạn',
                'body' => file_get_contents(resource_path('views/emails/email_verify.blade.php')),
                'placeholders' => [
                    'name' => 'Tên người dùng',
                    'code' => 'Mã xác thực 6 số',
                ],
                'is_html' => true,
                'enabled' => true,
            ]
        );

        EmailTemplate::updateOrCreate(
            ['key' => 'plan_upgraded'],
            [
                'title' => 'Nâng cấp gói thành công',
                'subject' => 'Chúc mừng bạn đã nâng cấp lên gói {{to_plan}}!',
                'body' => file_get_contents(resource_path('views/emails/plan_upgraded.blade.php')),
                'placeholders' => [
                    'name' => 'Tên người dùng',
                    'from_plan' => 'Tên gói cũ',
                    'to_plan' => 'Tên gói mới',
                    'login_url' => 'URL đăng nhập',
                ],
                'is_html' => true,
                'enabled' => true,
            ]
        );
    }
}
