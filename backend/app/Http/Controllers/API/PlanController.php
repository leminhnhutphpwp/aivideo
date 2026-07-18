<?php
namespace App\Http\Controllers\API;

use App\Models\Plan;
use Illuminate\Http\JsonResponse;
use Illuminate\Routing\Controller;

class PlanController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth:api');
    }

    public function index(): JsonResponse
    {
        return response()->json(["success" => true, "data" => Plan::orderBy('sort_order')->get()->map->toSnapshot()->values()]);
    }

    public function show(Plan $plan): JsonResponse
    {
        return response()->json(["success" => true, "data" => $plan->toSnapshot()]);
    }
}
