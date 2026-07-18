<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class SePayWebhookController extends Controller
{
    public function webhook(Request $request)
    {
        $token = \Illuminate\Support\Str::of($request->header('Authorization', ''))
            ->after('Apikey ')
            ->trim()
            ->toString();

        $expectedToken = config('sepay.webhook_token');

        if (empty($expectedToken)) {
            Log::error('SEPay webhook called but SEPA_WEBHOOK_TOKEN is not set');
            return response()->json(['error' => 'Service not configured'], 501);
        }

        if (!hash_equals($expectedToken, $token)) {
            return response()->json(['error' => 'Invalid token'], 401);
        }

        return app(\SePay\SePay\Http\Controllers\SePayController::class)->webhook($request);
    }
}
