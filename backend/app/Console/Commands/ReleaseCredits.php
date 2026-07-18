<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;

class ReleaseCredits extends Command
{
    protected $signature = 'credits:release';

    protected $description = 'Release expired/stuck reserved credits';

    public function handle()
    {
        $this->info('Releasing expired credits...');
        //
    }
}
