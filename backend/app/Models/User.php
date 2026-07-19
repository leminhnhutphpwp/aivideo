<?php
namespace App\Models;

use Filament\Auth\MultiFactor\App\Contracts\HasAppAuthentication;
use Filament\Auth\MultiFactor\App\Contracts\HasAppAuthenticationRecovery;
use Filament\Models\Contracts\FilamentUser;
use Filament\Panel;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Str;
use PHPOpenSourceSaver\JWTAuth\Contracts\JWTSubject;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;
use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable implements JWTSubject, FilamentUser, HasAppAuthentication, HasAppAuthenticationRecovery
{
    use HasFactory, Notifiable, HasRoles, LogsActivity, SoftDeletes;

    protected $fillable = [
        'name', 'email', 'password', 'uuid', 'credits', 'credits_total_used',
        'plan_id', 'plan_expires_at',
        'is_active', 'auto_renew', 'email_verification_code', 'email_verification_code_sent_at',
        'credits_renewed_at', 'google_id', 'email_verified_at',
        'app_authentication_secret', 'app_authentication_recovery_codes',
        'phone_number', 'date_of_birth', 'gender', 'address',
        'avatar_media_id',
        'username', 'reputation_score', 'reputation_level',
    ];

    protected $hidden = [
        'id', 'password', 'remember_token',
        'app_authentication_secret', 'app_authentication_recovery_codes',
        'email_verification_code', 'email_verification_code_sent_at',
    ];

    protected $casts = [
        'email_verified_at' => 'datetime',
        'password' => 'hashed',
        'plan_expires_at' => 'datetime',
        'is_active' => 'boolean',
        'auto_renew' => 'boolean',
        'email_verification_code_sent_at' => 'datetime',
    ];

    public function getJWTIdentifier(): mixed
    {
        return $this->getKey();
    }

    public function getJWTCustomClaims(): array
    {
        return [
            'uuid' => $this->uuid,
            'plan' => $this->plan?->slug,
        ];
    }

    public function getRouteKeyName(): string
    {
        // Only use UUID for API routes to hide real IDs
        // For admin/Filament routes, use the actual integer ID
        if (request() && request()->is('api/*')) {
            return 'uuid';
        }
        
        return 'id'; // Default to integer ID for admin and other routes
    }

    protected static function booted(): void
    {
        static::creating(function ($user) {
            $user->uuid ??= (string) Str::uuid();
        });
    }

    public function canAccessPanel(Panel $panel): bool
    {
        // Broken-access-control guard: the Filament admin panel exposes a public login
        // form at /admin. Every registered API user is assigned the `panel_user` role and
        // is_active, so gating on is_active alone let ANY user into the admin panel.
        // Only genuine administrators (super_admin — the Shield super-admin role, see
        // config/filament-shield.php) may enter.
        return ($this->is_active ?? true) && $this->hasRole('super_admin');
    }

    public function plan(): BelongsTo
    {
        return $this->belongsTo(Plan::class)->withDefault(function ($plan, $user) {
            $dbPlan = Plan::where('slug', 'free')->first();
            if ($dbPlan) {
                $plan->forceFill($dbPlan->getAttributes());
                $plan->exists = true;
            } else {
                $plan->forceFill([
                    'slug' => 'free',
                    'name' => 'Free',
                    'quality_multiplier' => 1.0,
                ]);
            }
        });
    }

    public function subscriptions(): HasMany
    {
        return $this->hasMany(Subscription::class);
    }

    public function activeSubscription(): HasOne
    {
        return $this->hasOne(Subscription::class)->where('status', Subscription::STATUS_ACTIVE);
    }

    public function renderJobs(): HasMany
    {
        return $this->hasMany(RenderJob::class);
    }

    public function assets(): HasMany
    {
        return $this->hasMany(Asset::class);
    }

    public function avatarMedia(): BelongsTo
    {
        return $this->belongsTo(\Awcodes\Curator\Models\Media::class, 'avatar_media_id');
    }

    public function loginSessions(): HasMany
    {
        return $this->hasMany(UserLoginSession::class);
    }

    public function notificationPreferences(): HasMany
    {
        return $this->hasMany(NotificationPreference::class);
    }

    public function creditTransactions(): HasMany
    {
        return $this->hasMany(CreditTransaction::class);
    }

    public function couponRedemptions(): HasMany
    {
        return $this->hasMany(CouponRedemption::class);
    }

    public function apiKeys(): HasMany
    {
        return $this->hasMany(ApiKey::class);
    }

    public function storyboards(): HasMany
    {
        return $this->hasMany(Storyboard::class);
    }

    public function likes(): HasMany
    {
        return $this->hasMany(Like::class);
    }

    public function followers(): HasMany
    {
        return $this->hasMany(Follow::class, 'following_id');
    }

    public function following(): HasMany
    {
        return $this->hasMany(Follow::class, 'follower_id');
    }

    public function isPro(): bool
    {
        $plan = $this->plan;
        return $plan && !$plan->isFree();
    }

    public function hasVerifiedEmail(): bool
    {
        return !is_null($this->email_verified_at);
    }

    public function hasEnoughCredits(int $cost): bool
    {
        return $this->credits >= $cost;
    }

    public function getAvatarAttribute(): ?string
    {
        if ($this->avatar_media_id && $this->avatarMedia) {
            return $this->avatarMedia->url;
        }

        // Default avatar based on first character of name
        $name = $this->name ?? $this->username ?? 'U';
        $initial = mb_strtoupper(mb_substr($name, 0, 1));
        return "https://ui-avatars.com/api/?name={$initial}&background=FF5A1F&color=fff&size=128";
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['credits', 'plan_id'])
            ->logOnlyDirty();
    }

    public function getAppAuthenticationSecret(): ?string
    {
        return $this->app_authentication_secret;
    }

    public function saveAppAuthenticationSecret(?string $secret): void
    {
        $this->update(['app_authentication_secret' => $secret]);
    }

    public function getAppAuthenticationHolderName(): string
    {
        return $this->email;
    }

    public function getAppAuthenticationRecoveryCodes(): ?array
    {
        $codes = $this->app_authentication_recovery_codes;

        if (blank($codes)) {
            return null;
        }

        $decoded = json_decode($codes, true);

        return is_array($decoded) ? $decoded : null;
    }

    public function saveAppAuthenticationRecoveryCodes(?array $codes): void
    {
        $this->update([
            'app_authentication_recovery_codes' => !is_null($codes) ? json_encode($codes) : null,
        ]);
    }
}
