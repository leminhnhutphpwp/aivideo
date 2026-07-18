<?php

namespace App\Http\Controllers;

use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Foundation\Validation\ValidatesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller as BaseController;

abstract class Controller extends BaseController
{
    use AuthorizesRequests, ValidatesRequests;

    protected function cleanPaginate(Request $request, $query, int $perPage = 20): array
    {
        $page = (int) $request->get('page', 1);

        $total = $query->count();
        $items = $query->offset(($page - 1) * $perPage)->limit($perPage)->get();

        return [
            'items' => $items,
            'page' => $page,
            'per_page' => $perPage,
            'total' => $total,
            'last_page' => (int) ceil($total / $perPage),
        ];
    }

    protected function cleanPaginateResponse(Request $request, $query, int $perPage = 20): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => $this->cleanPaginate($request, $query, $perPage),
        ]);
    }
}
