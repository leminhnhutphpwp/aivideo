<?php

namespace Tests\Unit\Jobs;

use App\Jobs\GenerateThumbnail;
use App\Models\Asset;
use App\Models\Plan;
use App\Models\RenderJob;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * Verifies GenerateThumbnail produces a compressed WebP preview for image jobs and
 * points render_job.thumbnail_path at it, while leaving the original untouched.
 */
class GenerateThumbnailImageTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('public');
        config(['filesystems.default' => 'public']);
        config(['queue.default' => 'sync']);

        Plan::create([
            'slug' => 'free',
            'name' => 'Free Plan',
            'monthly_credits' => 300,
            'max_concurrent_jobs' => 1,
        ]);
    }

    public function test_generates_compressed_webp_preview_for_image_job(): void
    {
        Queue::fake(); // don't actually run the UploadAssetToR2 dispatch

        $user = User::factory()->create(['plan_id' => Plan::first()->id]);

        $job = RenderJob::create([
            'uuid' => 'img-thumb-job',
            'user_id' => $user->id,
            'status' => 'completed',
            'prompt' => 'A large image',
            'model' => 'z-image-turbo',
            'capability' => 't2i',
            'duration_seconds' => 1,
            'aspect_ratio' => '16:9',
            'resolution' => '720p',
            'credits_cost' => 100,
        ]);

        // Seed a large-ish PNG (2560x1440) on the fake default disk as the original.
        $storage = Storage::disk('public');
        $storage->put('images/img-thumb-job_original.png', $this->makeLargePng(2560, 1440));

        Asset::create([
            'user_id' => $user->id,
            'render_job_id' => $job->id,
            'type' => 'image',
            'mime_type' => 'image/png',
            'path' => 'images/img-thumb-job_original.png',
            'original_name' => 'original.png',
            'size_bytes' => $storage->size('images/img-thumb-job_original.png'),
        ]);

        (new GenerateThumbnail($job))->handle();

        // A thumbnail derivative asset was created.
        $thumb = $job->fresh()->assets()->where('type', 'thumbnail')->first();
        $this->assertNotNull($thumb, 'Expected a thumbnail derivative asset');
        $this->assertSame('image/webp', $thumb->mime_type);
        $this->assertTrue($storage->exists($thumb->path), 'Derivative file should exist on storage');

        // The derivative is meaningfully smaller than the original PNG.
        $this->assertLessThan(
            $storage->size('images/img-thumb-job_original.png'),
            $storage->size($thumb->path),
            'WebP preview should be smaller than the original PNG'
        );

        // Original image asset is preserved untouched.
        $this->assertTrue($storage->exists('images/img-thumb-job_original.png'));

        // render_job.thumbnail_path now points at the derivative (feed serves the small file).
        $this->assertSame($thumb->url, $job->fresh()->thumbnail_path);

        // Derivative is queued for R2 mirroring.
        Queue::assertPushed(\App\Jobs\UploadAssetToR2::class);
    }

    /**
     * Build a PNG of the given size using GD (available in the app container).
     */
    private function makeLargePng(int $w, int $h): string
    {
        $img = imagecreatetruecolor($w, $h);
        // Add some noise so the PNG isn't trivially compressible.
        for ($i = 0; $i < 4000; $i++) {
            $color = imagecolorallocate($img, random_int(0, 255), random_int(0, 255), random_int(0, 255));
            imagefilledrectangle($img, random_int(0, $w - 1), random_int(0, $h - 1), random_int(0, $w - 1), random_int(0, $h - 1), $color);
        }
        ob_start();
        imagepng($img);
        $data = ob_get_clean();
        imagedestroy($img);
        return $data;
    }
}
