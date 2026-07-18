<?php

namespace App\Filament\Resources\EmailTemplates\Pages;

use App\Filament\Resources\EmailTemplates\EmailTemplateResource;
use App\Models\EmailTemplate;
use Filament\Actions\Action;
use Filament\Actions\DeleteAction;
use Filament\Forms\Components\TextInput;
use Filament\Notifications\Notification;
use Filament\Resources\Pages\EditRecord;
use Illuminate\Support\Facades\Mail;

class EditEmailTemplate extends EditRecord
{
    protected static string $resource = EmailTemplateResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Action::make('sendTest')
                ->label('Gửi Email Test')
                ->icon('heroicon-o-paper-airplane')
                ->color('info')
                ->modalDescription(fn() => config('mail.default') === 'log' ? '⚠️ Hệ thống đang cấu hình MAIL_MAILER=log. Nội dung email sẽ được ghi vào file `storage/logs/laravel.log` thay vì gửi đến hòm thư thực!' : 'Nhập email để nhận test giao diện.')
                ->form([
                    TextInput::make('email')
                        ->label('Email nhận thử')
                        ->email()
                        ->required()
                        ->default(fn () => auth()->user()?->email),
                ])
                ->action(function (array $data, EmailTemplate $record) {
                    $rendered = $record->render([
                        'name' => auth()->user()?->name ?? 'Người nhận thử',
                        'email' => $data['email'],
                        'login_url' => url('/admin/login'),
                        'reset_url' => url('/admin/password/reset'),
                    ]);

                    try {
                        Mail::html($rendered['body'], function ($message) use ($data, $rendered) {
                            $message->to($data['email'])
                                ->subject($rendered['subject'] . ' [TEST]');
                        });

                        Notification::make()
                            ->title('Đã gửi email test thành công!')
                            ->success()
                            ->send();
                    } catch (\Exception $e) {
                        \App\Models\EmailLog::create([
                            'to' => $data['email'],
                            'subject' => $rendered['subject'] . ' [TEST]',
                            'body' => $rendered['body'],
                            'status' => 'failed',
                            'error_message' => $e->getMessage(),
                        ]);

                        Notification::make()
                            ->title('Lỗi gửi email!')
                            ->body($e->getMessage())
                            ->danger()
                            ->send();
                    }
                }),
            DeleteAction::make(),
        ];
    }
}