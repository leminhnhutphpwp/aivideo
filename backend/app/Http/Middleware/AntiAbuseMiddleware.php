<?php

namespace App\Http\Middleware;

use App\Services\AntiAbuse\AntiAbuseService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AntiAbuseMiddleware
{
    public function __construct(
        private AntiAbuseService $antiAbuseService
    ) {}

    public function handle(Request $request, Closure $next): Response
    {
        // Only check registration endpoint
        if ($request->path() !== 'api/auth/register') {
            return $next($request);
        }

        $ip = $request->ip();
        $userAgent = $request->userAgent();
        
        // Check if IP is blocked
        if ($this->antiAbuseService->isIpBlocked($ip)) {
            return response()->json([
                'success' => false,
                'message' => 'Địa chỉ IP này bị chặn đăng ký',
                'error' => 'IP_BLOCKED',
            ], 403);
        }

        // Get email from request
        $email = $request->input('email');

        // Validate registration (không log ở đây)
        $validation = $this->antiAbuseService->validateRegistration($email ?? '', $ip, $userAgent);
        
        if (!$validation['allowed']) {
            // Log fail attempt khi bị chặn
            if ($email) {
                $this->antiAbuseService->logRegistration($email, $ip, $userAgent, false);
            }
            return response()->json([
                'success' => false,
                'message' => $validation['reason'],
                'error' => $validation['code'] ?? 'ABUSE_DETECTED',
            ], 429);
        }

        // Continue and let controller handle success
        $response = $next($request);

        // If successful registration, log it (chỉ 1 lần)
        if ($response->getStatusCode() === 201 && $email) {
            $this->antiAbuseService->logRegistration($email, $ip, $userAgent, true);
        }

        return $response;
    }
}
