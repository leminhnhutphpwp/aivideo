<?php

namespace App\Notifications;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class ManualCreditNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public int $amount,
        public string $description,
        public int $newBalance
    ) {}

    public function via(object $notifiable): array
    {
        return ['mail', 'database'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $verb = $this->amount > 0 ? 'tặng' : 'trừ';
        $sign = $this->amount > 0 ? '+' : '';
        
        return (new MailMessage)
            ->subject("Thông báo: {$verb} credits từ admin")
            ->greeting("Xin chào {$notifiable->name},")
            ->line("Admin vừa {$verb} **{$sign}{$this->amount}** credits cho tài khoản của bạn.")
            ->line("Lý do: {$this->description}")
            ->line("Số dư hiện tại: **{$this->newBalance}** credits")
            ->action('Xem số dư', url('/credits'))
            ->line('Cảm ơn bạn đã sử dụng dịch vụ!');
    }

    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'manual_credit',
            'amount' => $this->amount,
            'description' => $this->description,
            'new_balance' => $this->newBalance,
        ];
    }
}
