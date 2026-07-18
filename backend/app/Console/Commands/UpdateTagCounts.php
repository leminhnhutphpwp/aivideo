<?php

namespace App\Console\Commands;

use App\Models\RenderJob;
use App\Models\Tag;
use Illuminate\Console\Command;

class UpdateTagCounts extends Command
{
    protected $signature = 'tags:update-counts';

    protected $description = 'Update usage_count for all tags';

    public function handle(): void
    {
        $tags = Tag::all();

        foreach ($tags as $tag) {
            $count = RenderJob::published()
                ->whereJsonContains('tags', $tag->label_vi)
                ->count();

            $tag->update(['usage_count' => $count]);
        }

        $this->info("Tag usage counts updated for {$tags->count()} tags.");
    }
}
