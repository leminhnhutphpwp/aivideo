<?php

namespace Database\Seeders;

use App\Models\Comment;
use App\Models\Follow;
use App\Models\Like;
use App\Models\Plan;
use App\Models\RenderJob;
use App\Models\Storyboard;
use App\Models\StoryboardScene;
use App\Models\Tag;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

/**
 * DemoActivitySeeder — populates the platform with lifelike demo data so the owner can visualize
 * the running system WITHOUT calling any real AI provider.
 *
 * Run explicitly (NOT wired into DatabaseSeeder):
 *   docker exec aivideo-app-1 php artisan db:seed --class=DemoActivitySeeder
 *
 * Idempotent & non-destructive: demo users use the `demo{N}@wavise.test` pattern via firstOrCreate;
 * media files are cached (skipped if already on disk); re-running only tops up missing rows.
 *
 * Media is fabricated locally: real stock stills from picsum.photos + short H.264 clips synthesized
 * with ffmpeg (Ken Burns). Files land in storage/app/demo/** which AssetController::download serves
 * local-first — so images/videos render in the browser with no MinIO/S3/daemon needed.
 */
class DemoActivitySeeder extends Seeder
{
    private const TOTAL_USERS = 100;
    private const TARGET_EMAIL = 'minhnhut147nb@gmail.com';

    private const IMG_DIR = 'demo/images';
    private const VID_DIR = 'demo/videos';

    /** aspect_ratio => [width, height] */
    private const ORIENTATIONS = [
        '16:9' => [1280, 720],
        '9:16' => [720, 1280],
        '1:1'  => [1024, 1024],
    ];

    private const IMAGES_PER_ORIENTATION = 12;
    private const VIDEO_COUNT = 12;

    /** @var array<string, string[]> relative image paths grouped by aspect ratio */
    private array $imagePool = [];
    /** @var string[] relative video paths */
    private array $videoPool = [];

    private array $planIds = [];

    private array $vnTopics = [
        'Khám phá quán cà phê ẩn mình giữa lòng Đà Lạt',
        'Review công nghệ AI mới nhất 2026',
        'Một ngày làm nông dân ở miền Tây sông nước',
        'Bí quyết nấu phở bò gia truyền chuẩn vị Hà Nội',
        'Cinematic Sài Gòn về đêm — ánh đèn không ngủ',
        'Hành trình phượt cung đường Hà Giang mùa hoa tam giác mạch',
        'Unbox sản phẩm skincare hot trend TikTok',
        'Vlog du lịch Phú Quốc — thiên đường biển đảo',
        'Storytelling thương hiệu thời trang local brand',
        'Quảng cáo nước hoa phong cách điện ảnh',
        'Đồ ăn đường phố Việt Nam nhìn là thèm',
        'Trải nghiệm homestay giữa rừng thông',
        'Chân dung nghệ nhân gốm Bát Tràng',
        'Highlight trận đấu bóng đá phong trào',
        'Giới thiệu căn hộ chung cư hiện đại',
    ];

    private array $vnTagPool = [
        'dulich', 'amthuc', 'cinematic', 'review', 'vlog', 'aiart', 'quangcao',
        'thoitrang', 'saigon', 'hanoi', 'dalat', 'streetfood', 'lifestyle', 'travel',
        'phongcach', 'nghethuat', 'trending', 'reels', 'shorts', 'brand',
    ];

    private array $vnComments = [
        'Video đẹp quá, chất lượng như phim điện ảnh luôn!',
        'Cho mình hỏi dùng prompt gì để ra được góc quay này vậy?',
        'Quá xịn, ủng hộ bạn nhé!',
        'Màu phim đẹp mê, học hỏi được nhiều.',
        'Nội dung hay và ý nghĩa, cảm ơn bạn đã chia sẻ.',
        'Đỉnh của chóp, hóng series tiếp theo!',
        'AI bây giờ làm được như này thật sự đáng nể.',
        'Ánh sáng và bố cục quá chuyên nghiệp.',
        'Mình đã lưu lại để tham khảo, tuyệt vời!',
        'Chất lượng miễn chê, tiếp tục phát huy nha bạn.',
    ];

    public function run(): void
    {
        @ini_set('memory_limit', '512M');

        $this->planIds = Plan::pluck('id', 'slug')->all();
        if (empty($this->planIds)) {
            $this->command->error('Plans chưa được seed. Chạy PlanSeeder trước.');
            return;
        }

        $this->command->info('→ Chuẩn bị media pool (ảnh picsum + video ffmpeg)...');
        $this->ensureMediaPool();

        $this->command->info('→ Tạo/nạp users demo...');
        $users = $this->seedUsers();

        $target = User::where('email', self::TARGET_EMAIL)->first();
        if ($target) {
            $this->enrichTargetUser($target, $users);
        } else {
            $this->command->warn('  Không tìm thấy target user ' . self::TARGET_EMAIL . ' — bỏ qua phần dồn data.');
        }

        $this->command->info('→ Tạo hoạt động cho các demo users (jobs/storyboards/assets)...');
        $publishedJobs = [];
        foreach ($users as $u) {
            $publishedJobs = array_merge($publishedJobs, $this->seedUserActivity($u, rand(2, 6), rand(0, 2)));
        }

        $this->command->info('→ Tạo tương tác cộng đồng (like/comment/follow)...');
        $this->seedInteractions($users, $target, $publishedJobs);

        $this->command->info('→ Tính lại reputation...');
        try {
            \Artisan::call('reputation:compute');
        } catch (\Throwable $e) {
            $this->command->warn('  reputation:compute lỗi: ' . $e->getMessage());
        }

        $this->command->info('✓ DemoActivitySeeder hoàn tất.');
    }

    // ────────────────────────────────────────────────────────────────────────
    // MEDIA POOL
    // ────────────────────────────────────────────────────────────────────────

    private function ensureMediaPool(): void
    {
        File::ensureDirectoryExists(storage_path('app/' . self::IMG_DIR));
        File::ensureDirectoryExists(storage_path('app/' . self::VID_DIR));

        foreach (self::ORIENTATIONS as $ratio => [$w, $h]) {
            $this->imagePool[$ratio] = [];
            for ($i = 0; $i < self::IMAGES_PER_ORIENTATION; $i++) {
                $rel = self::IMG_DIR . "/img_{$w}x{$h}_{$i}.jpg";
                $abs = storage_path('app/' . $rel);
                if (!file_exists($abs)) {
                    $this->fetchStockImage($abs, $w, $h, "{$w}{$h}{$i}");
                }
                if (file_exists($abs)) {
                    $this->imagePool[$ratio][] = $rel;
                }
            }
        }

        // Videos: Ken Burns from a landscape/portrait still.
        $ratios = array_keys(self::ORIENTATIONS);
        for ($i = 0; $i < self::VIDEO_COUNT; $i++) {
            $ratio = $ratios[$i % count($ratios)];
            [$w, $h] = self::ORIENTATIONS[$ratio];
            $rel = self::VID_DIR . "/vid_{$i}.mp4";
            $abs = storage_path('app/' . $rel);
            if (!file_exists($abs)) {
                $src = $this->imagePool[$ratio][$i % max(1, count($this->imagePool[$ratio]))] ?? null;
                if ($src) {
                    $this->makeKenBurnsVideo(storage_path('app/' . $src), $abs, $w, $h);
                }
            }
            if (file_exists($abs)) {
                $this->videoPool[] = $rel;
            }
        }

        $imgCount = array_sum(array_map('count', $this->imagePool));
        $this->command->info("  Media pool: {$imgCount} ảnh, " . count($this->videoPool) . ' video.');
    }

    private function fetchStockImage(string $abs, int $w, int $h, string $seed): void
    {
        try {
            $res = Http::timeout(25)->get("https://picsum.photos/seed/wavise{$seed}/{$w}/{$h}");
            if ($res->successful() && strlen($res->body()) > 1000) {
                File::put($abs, $res->body());
                return;
            }
        } catch (\Throwable $e) {
            // fall through to GD gradient
        }
        $this->makeGradientImage($abs, $w, $h, $seed);
    }

    /** Offline fallback — a colored gradient JPEG so the seeder never hard-depends on the network. */
    private function makeGradientImage(string $abs, int $w, int $h, string $seed): void
    {
        if (!function_exists('imagecreatetruecolor')) {
            return;
        }
        $img = imagecreatetruecolor($w, $h);
        $n = crc32($seed);
        $r1 = ($n & 0xFF); $g1 = (($n >> 8) & 0xFF); $b1 = (($n >> 16) & 0xFF);
        $r2 = 255 - $r1; $g2 = 255 - $g1; $b2 = 255 - $b1;
        for ($y = 0; $y < $h; $y++) {
            $t = $y / max(1, $h - 1);
            $col = imagecolorallocate(
                $img,
                (int) ($r1 + ($r2 - $r1) * $t),
                (int) ($g1 + ($g2 - $g1) * $t),
                (int) ($b1 + ($b2 - $b1) * $t),
            );
            imagefilledrectangle($img, 0, $y, $w, $y, $col);
        }
        imagejpeg($img, $abs, 82);
        imagedestroy($img);
    }

    private function makeKenBurnsVideo(string $srcImage, string $outAbs, int $w, int $h): void
    {
        // Slow zoom on a single still → looks like real footage. H.264 + yuv420p for browser playback.
        $vf = "scale={$w}:{$h},zoompan=z='min(zoom+0.0012,1.4)':d=120:s={$w}x{$h}:fps=25,format=yuv420p";
        $cmd = sprintf(
            'ffmpeg -y -loop 1 -i %s -vf %s -c:v libx264 -t 4 -preset veryfast -movflags +faststart %s 2>/dev/null',
            escapeshellarg($srcImage),
            escapeshellarg($vf),
            escapeshellarg($outAbs),
        );
        @exec($cmd, $o, $code);
        if ($code !== 0 || !file_exists($outAbs)) {
            // Fallback: solid color clip.
            $cmd2 = sprintf(
                'ffmpeg -y -f lavfi -i color=c=0x1a1a2e:size=%dx%d:d=4:r=25 -c:v libx264 -pix_fmt yuv420p -movflags +faststart %s 2>/dev/null',
                $w, $h, escapeshellarg($outAbs),
            );
            @exec($cmd2);
        }
    }

    // ────────────────────────────────────────────────────────────────────────
    // USERS
    // ────────────────────────────────────────────────────────────────────────

    /** @return User[] */
    private function seedUsers(): array
    {
        $users = [];
        for ($i = 1; $i <= self::TOTAL_USERS; $i++) {
            $plan = $this->pickPlan($i);
            $name = fake('vi_VN')->name();
            $username = $this->uniqueUsername($name, $i);
            $user = User::firstOrCreate(
                ['email' => "demo{$i}@wavise.test"],
                [
                    'name' => $name,
                    'password' => 'password',
                    'username' => $username,
                    'email_verified_at' => now(),
                    'is_active' => true,
                    'plan_id' => $this->planIds[$plan] ?? null,
                    'credits' => rand(500, 30000),
                    'credits_total_used' => rand(0, 50000),
                    'created_at' => now()->subDays(rand(1, 300)),
                ]
            );
            $users[] = $user;
        }
        $this->command->info('  ' . count($users) . ' demo users sẵn sàng.');
        return $users;
    }

    private function pickPlan(int $i): string
    {
        $mod = $i % 20;
        if ($mod === 0) return 'studio';   // ~5%
        if ($mod < 5) return 'pro';        // ~25%
        return 'free';                     // ~70%
    }

    private function uniqueUsername(string $name, int $i): string
    {
        $base = Str::slug(Str::ascii($name), '');
        $base = $base !== '' ? substr($base, 0, 20) : 'creator';
        $candidate = $base . $i;
        while (User::where('username', $candidate)->exists()) {
            $candidate = $base . $i . rand(10, 99);
        }
        return $candidate;
    }

    // ────────────────────────────────────────────────────────────────────────
    // ACTIVITY
    // ────────────────────────────────────────────────────────────────────────

    /**
     * @return RenderJob[] the published jobs created (for interaction seeding)
     */
    private function seedUserActivity(User $user, int $jobCount, int $storyboardCount, bool $rich = false): array
    {
        // Avoid re-generating on re-run.
        $existing = RenderJob::where('user_id', $user->id)->count();
        $published = [];

        if ($existing < $jobCount) {
            for ($j = $existing; $j < $jobCount; $j++) {
                $isVideo = rand(0, 100) < 65;
                $ratio = $this->pickRatio();
                [$w, $h] = self::ORIENTATIONS[$ratio];
                $topic = $this->vnTopics[array_rand($this->vnTopics)];
                $isPublic = rand(0, 100) < 70;
                // A few held-for-review to exercise the moderation UI.
                $pending = $isPublic && rand(0, 100) < 8;

                $job = RenderJob::create([
                    'user_id' => $user->id,
                    'status' => 'completed',
                    'prompt' => $topic . ', ' . fake()->sentence(8),
                    'title' => $topic,
                    'model' => $isVideo ? 'wan2.7-t2v-2026-04-25' : 'qwen-image-plus',
                    'video_type' => $isVideo ? 'text_to_video' : 'image_generation',
                    'capability' => $isVideo ? 't2v' : 't2i',
                    'duration_seconds' => $isVideo ? [5, 8, 10][array_rand([5, 8, 10])] : 0,
                    'aspect_ratio' => $ratio,
                    'resolution' => rand(0, 1) ? '1080p' : '720p',
                    'credits_cost' => $isVideo ? rand(2000, 8000) : 200,
                    'gpu_seconds' => $isVideo ? rand(30, 120) : rand(5, 20),
                    'visibility' => $isPublic ? 'public' : 'private',
                    'published_at' => $isPublic ? now()->subDays(rand(0, 60)) : null,
                    'moderation_status' => $pending ? RenderJob::MODERATION_PENDING : RenderJob::MODERATION_APPROVED,
                    'moderated_at' => $pending ? now() : null,
                    'creator_payout' => ($isPublic && !$pending) ? rand(50, 500) : 0,
                    'tags' => $isPublic ? $this->pickTags() : [],
                    'usage_count' => $isPublic ? rand(0, 300) : 0,
                    'completed_at' => now()->subDays(rand(0, 60)),
                    'created_at' => now()->subDays(rand(0, 90)),
                ]);

                $this->attachAsset($job, $isVideo ? 'video' : 'image', $ratio);

                if ($isPublic) {
                    Tag::upsertFromArray($job->tags ?? []);
                    if (!$pending) {
                        $published[] = $job;
                    }
                }
            }
        }

        // Storyboards → show up on the Projects page.
        $existingSb = Storyboard::where('user_id', $user->id)->count();
        for ($s = $existingSb; $s < $storyboardCount; $s++) {
            $this->createStoryboard($user);
        }

        return $published;
    }

    private function createStoryboard(User $user): Storyboard
    {
        $mode = rand(0, 1) ? 'single_flow' : 'storyboard_image';
        $ratio = $this->pickRatio();
        $topic = $this->vnTopics[array_rand($this->vnTopics)];
        $isMulti = $mode === 'storyboard_image';

        $videoRel = $this->pickVideo();

        $sb = Storyboard::create([
            'user_id' => $user->id,
            'title' => $topic,
            'description' => fake()->sentence(12),
            'video_type' => 'ugc_review',
            'quality_tier' => 'standard',
            'status' => 'completed',
            'render_mode' => $mode,
            'shot_type' => $isMulti ? 'multi' : 'single',
            'total_duration' => rand(5, 15),
            'credits_cost' => rand(2000, 9000),
            'compiled_prompt' => $topic . '. ' . fake()->paragraph(2),
            'consistency_score' => rand(70, 98) / 100,
            'output_path' => $videoRel,
            'multi_panel_image' => $isMulti ? ($this->pickImage($ratio)) : null,
            'multi_panel_auto_generated' => $isMulti,
            'last_rendered_at' => now()->subDays(rand(0, 40)),
            'created_at' => now()->subDays(rand(0, 80)),
        ]);

        // A handful of scenes for single_flow storyboards.
        $sceneCount = $isMulti ? 0 : rand(2, 4);
        for ($n = 1; $n <= $sceneCount; $n++) {
            StoryboardScene::create([
                'storyboard_id' => $sb->id,
                'scene_number' => $n,
                'prompt' => fake()->sentence(10),
                'duration_seconds' => 5,
                'aspect_ratio' => $ratio,
                'resolution' => '720p',
                'status' => 'completed',
                'output_path' => $this->pickVideo(),
                'thumbnail_path' => $this->pickImage($ratio),
            ]);
        }

        return $sb;
    }

    private function attachAsset(RenderJob $job, string $type, string $ratio): void
    {
        $rel = $type === 'video' ? $this->pickVideo() : $this->pickImage($ratio);
        if (!$rel) {
            return;
        }
        $abs = storage_path('app/' . $rel);
        $job->assets()->create([
            'user_id' => $job->user_id,
            'type' => $type,
            'mime_type' => $type === 'video' ? 'video/mp4' : 'image/jpeg',
            'path' => $rel,
            'original_name' => basename($rel),
            'size_bytes' => file_exists($abs) ? filesize($abs) : 0,
            'is_public' => $job->visibility === 'public',
            'storage_location' => null,
            'expires_at' => now()->addDays(365),
        ]);

        // Point the job's output at the asset file so non-community surfaces resolve it too.
        $job->update(['output_path' => $rel, 'thumbnail_path' => $type === 'video' ? $this->pickImage($ratio) : $rel]);
    }

    // ────────────────────────────────────────────────────────────────────────
    // TARGET USER — richest data
    // ────────────────────────────────────────────────────────────────────────

    private function enrichTargetUser(User $target, array $users): void
    {
        $this->command->info('→ Dồn data cho target ' . self::TARGET_EMAIL . '...');

        if (!$target->username) {
            $target->username = $this->uniqueUsername($target->name ?: 'nhut', 147);
        }
        $target->email_verified_at ??= now();
        $target->credits = max($target->credits, 50000);
        $target->save();

        // Many jobs (mix video/image, mostly public, a couple pending) + many storyboards.
        $published = $this->seedUserActivity($target, 26, 16, true);

        // Followers: most demo users follow the target.
        foreach ($users as $u) {
            if ($u->id === $target->id) continue;
            if (rand(0, 100) < 80) {
                Follow::firstOrCreate(['follower_id' => $u->id, 'following_id' => $target->id]);
            }
        }
        // Target follows some back.
        foreach (array_slice($users, 0, 30) as $u) {
            Follow::firstOrCreate(['follower_id' => $target->id, 'following_id' => $u->id]);
        }

        // Heavy likes + comments on the target's published works.
        foreach ($published as $job) {
            $likers = collect($users)->random(min(count($users), rand(15, 60)));
            foreach ($likers as $u) {
                Like::firstOrCreate(['user_id' => $u->id, 'render_job_id' => $job->id]);
            }
            $commenters = collect($users)->random(min(count($users), rand(2, 8)));
            foreach ($commenters as $u) {
                Comment::create([
                    'user_id' => $u->id,
                    'render_job_id' => $job->id,
                    'content' => $this->vnComments[array_rand($this->vnComments)],
                    'created_at' => now()->subDays(rand(0, 30)),
                ]);
            }
        }

        $this->command->info('  Target: ' . count($published) . ' tác phẩm công khai + follower/like/comment.');
    }

    // ────────────────────────────────────────────────────────────────────────
    // COMMUNITY INTERACTIONS (across demo users)
    // ────────────────────────────────────────────────────────────────────────

    private function seedInteractions(array $users, ?User $target, array $publishedJobs): void
    {
        // Cross likes/comments so the community feed feels alive.
        foreach ($publishedJobs as $job) {
            $likers = collect($users)->random(min(count($users), rand(0, 25)));
            foreach ($likers as $u) {
                if ($u->id === $job->user_id) continue;
                Like::firstOrCreate(['user_id' => $u->id, 'render_job_id' => $job->id]);
            }
            if (rand(0, 100) < 40) {
                $c = collect($users)->random();
                Comment::create([
                    'user_id' => $c->id,
                    'render_job_id' => $job->id,
                    'content' => $this->vnComments[array_rand($this->vnComments)],
                    'created_at' => now()->subDays(rand(0, 30)),
                ]);
            }
        }

        // A sparse follow graph among demo users.
        $sample = collect($users)->random(min(count($users), 60));
        foreach ($sample as $u) {
            $targets = collect($users)->random(min(count($users), rand(1, 6)));
            foreach ($targets as $t) {
                if ($t->id === $u->id) continue;
                Follow::firstOrCreate(['follower_id' => $u->id, 'following_id' => $t->id]);
            }
        }
    }

    // ────────────────────────────────────────────────────────────────────────
    // HELPERS
    // ────────────────────────────────────────────────────────────────────────

    private function pickRatio(): string
    {
        $keys = array_keys(self::ORIENTATIONS);
        return $keys[array_rand($keys)];
    }

    private function pickImage(string $ratio): ?string
    {
        $pool = $this->imagePool[$ratio] ?? [];
        return $pool ? $pool[array_rand($pool)] : null;
    }

    private function pickVideo(): ?string
    {
        return $this->videoPool ? $this->videoPool[array_rand($this->videoPool)] : null;
    }

    private function pickTags(): array
    {
        $count = rand(2, 4);
        $keys = (array) array_rand(array_flip($this->vnTagPool), $count);
        return array_values($keys);
    }
}
