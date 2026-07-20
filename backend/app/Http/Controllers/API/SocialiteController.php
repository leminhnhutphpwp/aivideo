<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Plan;
use App\Models\User;
use App\Services\MailService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Laravel\Socialite\Facades\Socialite;
use PHPOpenSourceSaver\JWTAuth\Facades\JWTAuth;

class SocialiteController extends Controller
{
    public function redirect(string $provider): JsonResponse
    {
        $url = Socialite::driver($provider)->stateless()->redirect()->getTargetUrl();

        return response()->json([
            'success' => true,
            'data' => ['url' => $url],
        ]);
    }

    public function callback(Request $request, string $provider)
    {
        try {
            $socialUser = Socialite::driver($provider)->stateless()->user();
        } catch (\Exception $e) {
            return redirect()->away(
                config('app.frontend_url') . '/auth/callback?error=Unable to authenticate with ' . $provider
            );
        }

        if (!$socialUser->getEmail()) {
            return redirect()->away(
                config('app.frontend_url') . '/auth/callback?error=Email không được Google cung cấp'
            );
        }

        $isEmailVerified = $socialUser->offsetExists('email_verified')
            ? (bool) ($socialUser['email_verified'] ?? false)
            : false;

        $user = User::where('google_id', $socialUser->getId())->first();

        if ($user) {
            $token = JWTAuth::fromUser($user);

            return redirect()->away(
                config('app.frontend_url') . '/auth/callback?token=' . $token
            );
        }

        $existingUser = User::where('email', $socialUser->getEmail())->first();

        if ($existingUser) {
            $existingUser->update(['google_id' => $socialUser->getId()]);

            $token = JWTAuth::fromUser($existingUser);

            return redirect()->away(
                config('app.frontend_url') . '/auth/callback?token=' . $token
            );
        }

        // Generate username from email or name
        $email = $socialUser->getEmail();
        $baseUsername = Str::before($email, '@');
        $username = $baseUsername;
        $counter = 1;
        while (User::where('username', $username)->exists()) {
            $username = $baseUsername . $counter;
            $counter++;
        }

        $user = User::create([
            'name' => $socialUser->getName() ?? $socialUser->getNickname() ?? 'User',
            'email' => $email,
            'username' => $username,
            'google_id' => $socialUser->getId(),
            'email_verified_at' => $isEmailVerified ? now() : null,
            'uuid' => (string) Str::uuid(),
        ]);

        // Start ở 0 credits (nhất quán với luồng email/password). Credits đến từ coupon
        // (mã chào mừng tự động / phát tay) hoặc mua — không tặng cứng khi đăng nhập nữa.
        $freePlan = Plan::where('slug', 'free')->first();
        if ($freePlan) {
            $user->update([
                'plan_id' => $freePlan->id,
                'credits' => 0,
            ]);
        }

        $user->assignRole('panel_user');

        // Tự cấp ưu đãi (event auto_grant, fallback mã welcome) — user Google đã verified sẵn.
        app(\App\Services\CouponEventService::class)->autoGrant($user);

        try {
            app(MailService::class)->sendToUser('welcome', $user, [
                'login_url' => config('app.frontend_url') . '/login',
            ]);
        } catch (\Exception $e) {
        }

        $token = JWTAuth::fromUser($user);

        return redirect()->away(
            config('app.frontend_url') . '/auth/callback?token=' . $token
        );
    }
}
