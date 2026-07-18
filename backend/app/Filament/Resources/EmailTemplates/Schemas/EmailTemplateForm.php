<?php

namespace App\Filament\Resources\EmailTemplates\Schemas;

use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Textarea;
use Filament\Forms\Components\Toggle;
use Filament\Schemas\Schema;

class EmailTemplateForm
{
    public static function configure(Schema $schema): Schema
    {
        return $schema
            ->components([
                \Filament\Schemas\Components\Grid::make(['lg' => 3])
                    ->columnSpanFull()
                    ->components([
                        \Filament\Schemas\Components\Group::make([
                            \Filament\Schemas\Components\Section::make('Thông tin chung')
                                ->icon('heroicon-o-envelope')
                                ->columns(['md' => 2])
                                ->components([
                                    TextInput::make('key')
                                        ->label('Mã Template (Key)')
                                        ->required()
                                        ->unique(ignoreRecord: true)
                                        ->helperText('Ví dụ: verify_email, reset_password'),
                                    TextInput::make('title')
                                        ->label('Tên gợi nhớ (Title)')
                                        ->maxLength(255),
                                    TextInput::make('subject')
                                        ->label('Tiêu đề Email (Subject)')
                                        ->required()
                                        ->columnSpanFull(),
                                ]),
                            \Filament\Schemas\Components\Section::make('Nội dung Email')
                                ->icon('heroicon-o-document-text')
                                ->components([
                                    \Filament\Forms\Components\Select::make('load_template')
                                        ->label('Chọn mẫu tải sẵn')
                                        ->options([
                                            'welcome' => 'Thư chào mừng (Welcome)',
                                            'reset_password' => 'Cấp lại mật khẩu (Reset Password)',
                                            'credits_added' => 'Credits đã nạp (Credits Added)',
                                            'credits_refunded' => 'Credits hoàn lại (Credits Refunded)',
                                            'job_completed' => 'Job render hoàn tất (Job Completed)',
                                            'job_failed' => 'Job render thất bại (Job Failed)',
                                            'account_locked' => 'Tài khoản bị khóa (Account Locked)',
                                            'account_unlocked' => 'Tài khoản được mở khóa (Account Unlocked)',
                                            'password_reset_code' => 'Mã xác thực đặt lại mật khẩu (Password Reset Code)',
                                            'email_verify' => 'Xác thực email (Email Verify)',
                                            'system_notification' => 'Thông báo hệ thống (System Notification)',
                                        ])
                                        ->live()
                                        ->afterStateUpdated(function ($state, callable $set) {
                                            if ($state && \Illuminate\Support\Facades\View::exists("emails.{$state}")) {
                                                $dummyData = [
                                                    'name' => '{{name}}',
                                                    'email' => '{{email}}',
                                                    'login_url' => '{{login_url}}',
                                                    'reset_url' => '{{reset_url}}',
                                                    'amount' => '{{amount}}',
                                                    'balance' => '{{balance}}',
                                                    'description' => '{{description}}',
                                                    'job_name' => '{{job_name}}',
                                                    'duration' => '{{duration}}',
                                                    'result_url' => '{{result_url}}',
                                                    'error_reason' => '{{error_reason}}',
                                                    'reason' => '{{reason}}',
                                                    'code' => '{{code}}',
                                                    'title' => '{{title}}',
                                                    'body' => '{{body}}',
                                                ];
                                                $set('body', \Illuminate\Support\Facades\View::make("emails.{$state}", $dummyData)->render());
                                            }
                                        })
                                        ->dehydrated(false)
                                        ->searchable()
                                        ->helperText('Chọn một mẫu tải sẵn để nạp nhanh toàn bộ bố cục HTML.'),
                                    \Filament\Forms\Components\RichEditor::make('body')
                                        ->label('Nội dung (HTML/Text)')
                                        ->required()
                                        ->extraInputAttributes(['style' => 'min-height: 24rem;'])
                                        ->columnSpanFull(),
                                ]),
                        ])->columnSpan(['lg' => 2]),
                        \Filament\Schemas\Components\Group::make([
                            \Filament\Schemas\Components\Section::make('Cấu hình')
                                ->icon('heroicon-o-cog')
                                ->components([
                                    Toggle::make('is_html')
                                        ->label('Định dạng HTML')
                                        ->default(true),
                                    Toggle::make('enabled')
                                        ->label('Kích hoạt')
                                        ->default(true),
                                ]),
                            \Filament\Schemas\Components\Section::make('Biến khả dụng (Placeholders)')
                                ->description('Sử dụng cú pháp {{bien}} trong Tiêu đề hoặc Nội dung.')
                                ->components([
                                    \Filament\Forms\Components\KeyValue::make('placeholders')
                                        ->label('Mã biến và Giải thích')
                                        ->keyLabel('Tên Biến (ví dụ: name)')
                                        ->valueLabel('Mô tả (ví dụ: Tên khách hàng)')
                                        ->columnSpanFull(),
                                ]),
                        ])->columnSpan(['lg' => 1]),
                    ]),
            ]);
    }
}
