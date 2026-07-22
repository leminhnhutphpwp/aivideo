<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\UserLoginSession;
use Awcodes\Curator\Models\Media;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class SettingsController extends Controller
{
    public function uploadAvatar(Request $request): JsonResponse
    {
        $request->validate([
            'avatar' => 'required|image|mimes:jpeg,png,gif,webp|max:5120',
        ]);

        try {
            $user = Auth::user();
            $file = $request->file('avatar');

            $directory = 'avatars';
            $filename = (string) Str::uuid();
            $extension = $file->getClientOriginalExtension();
            $filepath = "{$directory}/{$filename}.{$extension}";

            // Lưu file
            Storage::disk('public')->put($filepath, file_get_contents($file->getRealPath()), 'public');

            // Đọc kích thước ảnh
            $imageSize = @getimagesize($file->getRealPath());

            // Lưu vào Media model của curator
            $media = Media::create([
                'disk' => 'public',
                'directory' => $directory,
                'visibility' => 'public',
                'name' => $filename,
                'path' => $filepath,
                'width' => $imageSize[0] ?? 0,
                'height' => $imageSize[1] ?? 0,
                'size' => $file->getSize(),
                'type' => $file->getMimeType(),
                'ext' => $extension,
                'alt' => "Avatar của {$user->name}",
                'title' => "avatar-{$user->id}",
            ]);

            // Gán cho user
            $user->update(['avatar_media_id' => $media->id]);

            return response()->json([
                'success' => true,
                'message' => 'Avatar updated successfully',
                'data' => [
                    'avatar_url' => Storage::disk('public')->url($filepath),
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('Avatar upload failed: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to upload avatar',
            ], 500);
        }
    }

    public function getLoginHistory(Request $request): JsonResponse
    {
        $user = Auth::user();

        $sessions = UserLoginSession::where('user_id', $user->id)
            ->orderByDesc('login_at')
            ->paginate(10);

        return response()->json([
            'success' => true,
            'data' => $sessions->items(),
            'meta' => [
                'current_page' => $sessions->currentPage(),
                'last_page' => $sessions->lastPage(),
                'per_page' => $sessions->perPage(),
                'total' => $sessions->total(),
            ],
        ]);
    }

    public function revokeSession(int $id): JsonResponse
    {
        $user = Auth::user();

        $session = UserLoginSession::where('user_id', $user->id)
            ->where('id', $id)
            ->first();

        if (!$session) {
            return response()->json([
                'success' => false,
                'message' => 'Session not found',
            ], 404);
        }

        $session->delete();

        return response()->json([
            'success' => true,
            'message' => 'Session revoked successfully',
        ]);
    }

    public function getNotificationPreferences(): JsonResponse
    {
        $user = Auth::user();

        $prefs = $user->notificationPreferences()->get()->map(function ($pref) {
            return [
                'type' => $pref->type,
                'channel' => $pref->channel,
                'enabled' => $pref->enabled,
            ];
        });

        return response()->json([
            'success' => true,
            'data' => $prefs,
        ]);
    }

    public function updateNotificationPreferences(Request $request): JsonResponse
    {
        // Giới hạn số lượng và whitelist type/channel để tránh ghi rác vào bảng preferences.
        $request->validate([
            'preferences' => 'required|array|max:50',
            'preferences.*.type' => [
                'required',
                'string',
                Rule::in(['job_completed', 'job_failed', 'credits_added', 'credits_refunded']),
            ],
            'preferences.*.channel' => [
                'required',
                'string',
                Rule::in(['email']),
            ],
            'preferences.*.enabled' => 'required|boolean',
        ]);

        $user = Auth::user();

        foreach ($request->preferences as $pref) {
            $user->notificationPreferences()->updateOrCreate(
                ['type' => $pref['type'], 'channel' => $pref['channel']],
                ['enabled' => $pref['enabled']]
            );
        }

        return response()->json([
            'success' => true,
            'message' => 'Preferences updated successfully',
        ]);
    }
}