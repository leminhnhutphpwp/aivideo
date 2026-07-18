<?php

use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Storage;

// Redirect unauthenticated Filament users to SPA login
Route::redirect('/login', config('app.frontend_url', 'http://localhost:3000'), 302)->name('login');
use App\Models\Asset;

// Frontend is served by a separate SPA.
// Admin panel is auto-registered by Filament at /admin.

// Admin asset download (bypasses API auth for Filament users)
Route::middleware(['web', 'auth'])->prefix('admin')->group(function () {
    Route::get('/assets/{asset:uuid}/download', function (Asset $asset) {
        $localPath = storage_path("app/{$asset->path}");
        if (file_exists($localPath)) {
            $asset->increment('download_count');
            return response()->download($localPath, $asset->original_name);
        }

        // Stream from MinIO/R2 if not local
        $disks = match ($asset->storage_location) {
            'r2' => ['s3-external', 's3'],
            'both' => ['s3', 's3-external'],
            default => ['s3', 's3-external'],
        };

        foreach ($disks as $disk) {
            if (empty(config("filesystems.disks.{$disk}.key"))) continue;
            try {
                $stream = Storage::disk($disk)->readStream($asset->path);
                if ($stream === false) continue;
                $asset->increment('download_count');
                return response()->stream(function () use ($stream) {
                    fpassthru($stream);
                    fclose($stream);
                }, 200, [
                    'Content-Type' => $asset->mime_type ?? 'application/octet-stream',
                    'Content-Disposition' => 'attachment; filename="' . $asset->original_name . '"',
                    'Content-Length' => $asset->size_bytes,
                ]);
            } catch (\Exception) {}
        }

        abort(404, 'File not found');
    })->name('admin.assets.download');
});
