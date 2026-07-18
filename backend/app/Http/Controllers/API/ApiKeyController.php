<?php
namespace App\Http\Controllers\API;

use App\Models\ApiKey;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Str;

class ApiKeyController extends Controller
{
    use AuthorizesRequests;

    public function __construct()
    {
        $this->middleware('auth:api');
    }

    public function index(Request $request): JsonResponse
    {
        return response()->json(['success' => true, 'data' => $request->user()->apiKeys]);
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate(['name' => 'required|string|max:100']);

        $key = ApiKey::generateKey();
        $prefix = 'pv_' . substr($key, 3, 8);

        $apiKey = $request->user()->apiKeys()->create([
            'name' => $request->name,
            'key' => hash('sha256', $key),
            'prefix' => $prefix,
        ]);

        return response()->json([
            'api_key' => $apiKey,
            'plain_text_key' => $key, // Only shown once
        ], 201);
    }

    public function destroy(ApiKey $apiKey): JsonResponse
    {
        $this->authorize('delete', $apiKey);
        $apiKey->delete();

        return response()->json(null, 204);
    }
}
