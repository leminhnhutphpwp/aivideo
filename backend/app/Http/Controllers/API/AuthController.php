<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\MailService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rules\Password;
use PHPOpenSourceSaver\JWTAuth\Facades\JWTAuth;

/**
 * @group Xác thực
 * 
 * Các API endpoint để xác thực người dùng và quản lý tokens.
 */
class AuthController extends Controller
{
    /**
     * Đăng nhập
     * 
     * Xác thực người dùng và trả về JWT token.
     * Endpoint này không yêu cầu xác thực.
     * 
     * @bodyParam email string required Địa chỉ email của người dùng. Example: nguyenvana@example.com
     * @bodyParam password string required Mật khẩu của người dùng. Example: matkhau123
     * 
     * @response {
     *   "success": true,
     *   "message": "Đăng nhập thành công",
     *   "data": {
     *     "user": {
     *       "id": 1,
     *       "name": "Nguyễn Văn A",
     *       "email": "nguyenvana@example.com",
     *       "created_at": "2024-01-01T00:00:00.000000Z",
     *       "updated_at": "2024-01-01T00:00:00.000000Z"
     *     },
     *     "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
     *     "token_type": "bearer",
     *     "expires_in": 3600
     *   }
     * }
     * 
     * @response 401 {
     *   "success": false,
     *   "message": "Email hoặc mật khẩu không chính xác",
     *   "error": "invalid_credentials"
     * }
     * 
     * @response 422 {
     *   "success": false,
     *   "message": "Dữ liệu không hợp lệ",
     *   "errors": {
     *     "email": ["Email là bắt buộc"],
     *     "password": ["Mật khẩu là bắt buộc"]
     *   }
     * }
     */
    public function login(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'email' => ['required', 'string', 'email'],
            'password' => ['required', 'string'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Dữ liệu không hợp lệ',
                'errors' => $validator->errors(),
            ], 422);
        }

        $credentials = $request->only('email', 'password');

        $remember = $request->boolean('remember');
        if ($remember) {
            JWTAuth::factory()->setTTL(10080); // 7 ngày
        }

        if (!$token = JWTAuth::attempt($credentials)) {
            return response()->json([
                'success' => false,
                'message' => 'Email hoặc mật khẩu không chính xác',
                'error' => 'invalid_credentials',
            ], 401);
        }

        $user = auth()->user();

        $this->logLoginSession($user);

        return response()->json([
            'success' => true,
            'message' => 'Đăng nhập thành công',
            'data' => [
                'user' => $user,
                'token' => $token,
                'token_type' => 'bearer',
                'expires_in' => JWTAuth::factory()->getTTL() * 60,
            ],
        ]);
    }

    /**
     * Đăng xuất
     * 
     * Hủy token JWT hiện tại.
     * Yêu cầu JWT token hợp lệ.
     * 
     * @authenticated
     * 
     * @response {
     *   "success": true,
     *   "message": "Đăng xuất thành công"
     * }
     * 
     * @response 401 {
     *   "success": false,
     *   "message": "Token không hợp lệ",
     *   "error": "token_invalid"
     * }
     */
    public function logout(): JsonResponse
    {
        auth()->logout();

        return response()->json([
            'success' => true,
            'message' => 'Đăng xuất thành công',
        ]);
    }

    /**
     * Làm mới Token
     * 
     * Làm mới JWT token hiện tại.
     * Yêu cầu JWT token hợp lệ.
     * 
     * @authenticated
     * 
     * @response {
     *   "success": true,
     *   "message": "Token đã được làm mới",
     *   "data": {
     *     "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
     *     "token_type": "bearer",
     *   "expires_in": 3600
     *   }
     * }
     * 
     * @response 401 {
     *   "success": false,
     *   "message": "Token không hợp lệ",
     *   "error": "token_invalid"
     *   }
     */
    public function refresh(Request $request): JsonResponse
    {
        try {
            $token = JWTAuth::parseToken()->refresh();

            return response()->json([
                'success' => true,
                'message' => 'Token đã được làm mới',
                'data' => [
                    'token' => $token,
                    'token_type' => 'bearer',
                    'expires_in' => JWTAuth::factory()->getTTL() * 60,
                ],
            ]);
        } catch (\PHPOpenSourceSaver\JWTAuth\Exceptions\TokenInvalidException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Token không hợp lệ',
                'error' => 'token_invalid',
            ], 401);
        } catch (\PHPOpenSourceSaver\JWTAuth\Exceptions\JWTException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Không thể refresh token',
                'error' => 'token_not_provided',
            ], 401);
        }
    }

    /**
     * Thông tin Người dùng hiện tại
     * 
     * Lấy thông tin người dùng đang đăng nhập.
     * Yêu cầu JWT token hợp lệ.
     * 
     * @authenticated
     * 
     * @response {
     *   "success": true,
     *   "data": {
     *     "id": 1,
     *     "name": "Nguyễn Văn A",
     *     "email": "nguyenvana@example.com",
     *     "created_at": "2024-01-01T00:00:00.000000Z",
     *     "updated_at": "2024-01-01T00:00:00.000000Z"
     *   }
     * }
     * 
     * @response 401 {
     *   "success": false,
     *   "message": "Token không hợp lệ",
     *   "error": "token_invalid"
     * }
     */
    public function me(): JsonResponse
    {
        $user = auth()->user();

        $data = [
            'uuid' => $user->uuid,
            'name' => $user->name,
            'email' => $user->email,
            'avatar_url' => $user->avatar,
            'credits' => $user->credits,
            'credits_total_used' => $user->credits_total_used,
            'phone_number' => $user->phone_number,
            'date_of_birth' => $user->date_of_birth,
            'gender' => $user->gender,
            'address' => $user->address,
            'email_verified_at' => $user->email_verified_at,
            'is_active' => $user->is_active,
            'auto_renew' => $user->auto_renew,
            'trial_ends_at' => $user->trial_ends_at,
            'plan_expires_at' => $user->plan_expires_at,
            'created_at' => $user->created_at,
            'updated_at' => $user->updated_at,
            'plan' => $user->plan ? $user->plan->toSnapshot() : null,
        ];

        return response()->json([
            'success' => true,
            'data' => $data,
        ]);
    }
/**
     * Đăng ký
     * 
     * Tạo tài khoản người dùng mới và trả về JWT token.
     * Endpoint này không yêu cầu xác thực.
     * 
     * @bodyParam name string required Họ và tên đầy đủ của người dùng. Example: Nguyễn Văn A
     * @bodyParam email string required Địa chỉ email của người dùng. Phải là duy nhất. Example: nguyenvana@example.com
     * @bodyParam password string required Mật khẩu của người dùng. Tối thiểu 8 ký tự. Example: matkhau123
     * @bodyParam password_confirmation string required Xác nhận mật khẩu. Example: matkhau123
     * 
     * @response {
     *   "success": true,
     *   "message": "Đăng ký thành công",
     *   "data": {
     *     "user": {
     *       "id": 1,
     *       "name": "Nguyễn Văn A",
     *       "email": "nguyenvana@example.com",
     *       "created_at": "2024-01-01T00:00:00.000000Z",
     *       "updated_at": "2024-01-01T00:00:00.000000Z"
     *     },
     *     "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
     *     "token_type": "bearer",
     *     "expires_in": 3600
     *   }
     * }
     * 
     * @response 422 {
     *   "success": false,
     *   "message": "Dữ liệu không hợp lệ",
     *   "errors": {
     *     "email": ["Địa chỉ email đã tồn tại"],
     *     "password": ["Mật khẩu xác nhận không khớp"]
     *   }
     * }
     */
    public function register(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', \Illuminate\Validation\Rule::unique('users')->whereNull('deleted_at')],
            'password' => ['required', 'confirmed', Password::defaults()],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Dữ liệu không hợp lệ',
                'errors' => $validator->errors(),
            ], 422);
        }

        $code = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'email_verification_code' => $code,
            'email_verification_code_sent_at' => now(),
        ]);

        $freePlan = \App\Models\Plan::where('slug', 'free')->first();
        if ($freePlan) {
            $user->update([
                'plan_id' => $freePlan->id,
                'credits' => 0, // Chưa verify email, chưa có credits
            ]);
        }

        $user->assignRole('panel_user');

        app(MailService::class)->sendToUser('welcome', $user, [
            'login_url' => url('/login'),
        ]);

        app(MailService::class)->sendToUser('email_verify', $user, ['code' => $code]);

        $token = JWTAuth::fromUser($user);

        return response()->json([
            'success' => true,
            'message' => 'Đăng ký thành công',
            'data' => [
                'user' => $user,
                'token' => $token,
                'token_type' => 'bearer',
                'expires_in' => JWTAuth::factory()->getTTL() * 60,
            ],
        ], 201);
    }

    /**
     * Đổi mật khẩu
     * 
     * Đổi mật khẩu của người dùng hiện tại.
     * Yêu cầu JWT token hợp lệ.
     * 
     * @authenticated
     * 
     * @bodyParam current_password string required Mật khẩu hiện tại. Example: matkhaucu
     * @bodyParam password string required Mật khẩu mới. Tối thiểu 8 ký tự. Example: matkhaumoi
     * @bodyParam password_confirmation string required Xác nhận mật khẩu mới. Example: matkhaumoi
     * 
     * @response {
     *   "success": true,
     *   "message": "Đổi mật khẩu thành công"
     * }
     * 
     * @response 400 {
     *   "success": false,
     *   "message": "Mật khẩu hiện tại không chính xác",
     *   "error": "current_password_incorrect"
     * }
     * 
     * @response 422 {
     *   "success": false,
     *   "message": "Dữ liệu không hợp lệ",
     *   "errors": {
     *     "password": ["Mật khẩu xác nhận không khớp"]
     *   }
     * }
     */
    public function changePassword(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'current_password' => ['required', 'string'],
            'password' => ['required', 'confirmed', Password::defaults()],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Dữ liệu không hợp lệ',
                'errors' => $validator->errors(),
            ], 422);
        }

        $user = auth()->user();

        if (!Hash::check($request->current_password, $user->password)) {
            return response()->json([
                'success' => false,
                'message' => 'Mật khẩu hiện tại không chính xác',
                'error' => 'current_password_incorrect',
            ], 400);
        }

        $user->update([
            'password' => Hash::make($request->password),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Đổi mật khẩu thành công',
        ]);
    }

    public function forgotPassword(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'email' => ['required', 'string', 'email', 'exists:users'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Dữ liệu không hợp lệ',
                'errors' => $validator->errors(),
            ], 422);
        }

        $user = User::where('email', $request->email)->first();
        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Email không tồn tại trong hệ thống',
            ], 404);
        }

        $code = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);

        DB::table('password_reset_tokens')->updateOrInsert(
            ['email' => $user->email],
            ['token' => Hash::make($code), 'created_at' => now()]
        );

        app(MailService::class)->sendToUser('password_reset_code', $user, ['code' => $code]);

        return response()->json([
            'success' => true,
            'message' => 'Mã xác thực đã được gửi đến email của bạn',
        ]);
    }

    public function verifyResetCode(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'email' => ['required', 'string', 'email'],
            'code' => ['required', 'string', 'size:6'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Dữ liệu không hợp lệ',
                'errors' => $validator->errors(),
            ], 422);
        }

        $record = DB::table('password_reset_tokens')
            ->where('email', $request->email)
            ->first();

        if (!$record || !Hash::check($request->code, $record->token)) {
            return response()->json([
                'success' => false,
                'message' => 'Mã xác thực không chính xác',
            ], 400);
        }

        if (now()->diffInMinutes($record->created_at) > 10) {
            DB::table('password_reset_tokens')->where('email', $request->email)->delete();
            return response()->json([
                'success' => false,
                'message' => 'Mã xác thực đã hết hạn',
            ], 400);
        }

        return response()->json([
            'success' => true,
            'message' => 'Mã xác thực hợp lệ',
        ]);
    }

    public function resetPassword(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'email' => ['required', 'string', 'email'],
            'code' => ['required', 'string', 'size:6'],
            'password' => ['required', 'confirmed', Password::defaults()],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Dữ liệu không hợp lệ',
                'errors' => $validator->errors(),
            ], 422);
        }

        $record = DB::table('password_reset_tokens')
            ->where('email', $request->email)
            ->first();

        if (!$record || !Hash::check($request->code, $record->token)) {
            return response()->json([
                'success' => false,
                'message' => 'Mã xác thực không chính xác',
            ], 400);
        }

        if (now()->diffInMinutes($record->created_at) > 10) {
            DB::table('password_reset_tokens')->where('email', $request->email)->delete();
            return response()->json([
                'success' => false,
                'message' => 'Mã xác thực đã hết hạn',
            ], 400);
        }

        $user = User::where('email', $request->email)->first();
        $user->update(['password' => Hash::make($request->password)]);

        DB::table('password_reset_tokens')->where('email', $request->email)->delete();

        return response()->json([
            'success' => true,
            'message' => 'Mật khẩu đã được đặt lại thành công',
        ]);
    }

    public function sendVerification(Request $request): JsonResponse
    {
        $user = auth()->user();

        if ($user->hasVerifiedEmail()) {
            return response()->json([
                'success' => false,
                'message' => 'Email đã được xác thực',
            ], 400);
        }

        $code = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);

        $user->update([
            'email_verification_code' => $code,
            'email_verification_code_sent_at' => now(),
        ]);

        app(MailService::class)->sendToUser('email_verify', $user, ['code' => $code]);

        return response()->json([
            'success' => true,
            'message' => 'Mã xác thực đã được gửi đến email của bạn',
        ]);
    }

    public function verifyEmail(Request $request): JsonResponse
    {
        $user = auth()->user();

        if ($user->hasVerifiedEmail()) {
            return response()->json([
                'success' => false,
                'message' => 'Email đã được xác thực',
            ], 400);
        }

        $validator = Validator::make($request->all(), [
            'code' => ['required', 'string', 'size:6'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Dữ liệu không hợp lệ',
                'errors' => $validator->errors(),
            ], 422);
        }

        if (!$user->email_verification_code || $user->email_verification_code !== $request->code) {
            return response()->json([
                'success' => false,
                'message' => 'Mã xác thực không chính xác',
            ], 400);
        }

        if (!$user->email_verification_code_sent_at || now()->diffInMinutes($user->email_verification_code_sent_at) > 10) {
            return response()->json([
                'success' => false,
                'message' => 'Mã xác thực đã hết hạn',
            ], 400);
        }

        // Gán credits trước khi đánh dấu verified (atomic check)
        $freePlan = \App\Models\Plan::where('slug', 'free')->first();
        if ($freePlan) {
            $affected = \App\Models\User::where('id', $user->id)
                ->whereNull('email_verified_at')
                ->update(['credits' => $freePlan->effective_credits ?? 1000]);

            if ($affected) {
                \App\Models\CreditTransaction::create([
                    'user_id' => $user->id,
                    'type' => 'manual',
                    'amount' => $freePlan->effective_credits ?? 1000,
                    'balance_before' => 0,
                    'balance_after' => $freePlan->effective_credits ?? 1000,
                    'description' => 'Thưởng xác thực email',
                ]);
            }
        }

        $user->update([
            'email_verified_at' => now(),
            'email_verification_code' => null,
            'email_verification_code_sent_at' => null,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Xác thực email thành công',
        ]);
    }

    private function logLoginSession(User $user): void
    {
        $request = request();

        $device = $this->getDeviceInfo($request->userAgent());
        $browser = $this->getBrowserInfo($request->userAgent());

        $user->loginSessions()->update(['is_current' => false]);

        $user->loginSessions()->create([
            'device' => $device,
            'browser' => $browser,
            'ip_address' => $request->ip(),
            'location' => $this->getLocationFromIp($request->ip()),
            'login_at' => now(),
            'is_current' => true,
        ]);
    }

    private function getDeviceInfo(?string $userAgent): string
    {
        if (preg_match('/Mac/i', $userAgent)) return 'MacBook';
        if (preg_match('/Windows/i', $userAgent)) return 'Windows PC';
        if (preg_match('/Linux/i', $userAgent)) return 'Linux PC';
        if (preg_match('/iPhone/i', $userAgent)) return 'iPhone';
        if (preg_match('/iPad/i', $userAgent)) return 'iPad';
        if (preg_match('/Android/i', $userAgent)) return 'Android';
        return 'Unknown Device';
    }

    private function getBrowserInfo(?string $userAgent): string
    {
        if (preg_match('/Chrome/i', $userAgent) && !preg_match('/Edge/i', $userAgent)) return 'Chrome';
        if (preg_match('/Firefox/i', $userAgent)) return 'Firefox';
        if (preg_match('/Safari/i', $userAgent)) return 'Safari';
        if (preg_match('/Edge/i', $userAgent)) return 'Edge';
        return 'Unknown Browser';
    }

    private function getLocationFromIp(?string $ip): ?string
    {
        if (!$ip || $ip === '127.0.0.1' || $ip === '::1') {
            return 'Local';
        }
        return null;
    }
}
