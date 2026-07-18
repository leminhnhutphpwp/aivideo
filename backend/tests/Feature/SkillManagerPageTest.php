<?php

namespace Tests\Feature;

use App\Filament\Pages\SkillManager;
use Filament\Actions\Action;
use Tests\TestCase;

class SkillManagerPageTest extends TestCase
{
    /** The per-row actions must construct without hitting an invalid Filament API. */
    public function test_record_actions_resolve(): void
    {
        $page = new SkillManager;

        $this->assertInstanceOf(Action::class, $page->editAction());
        $this->assertInstanceOf(Action::class, $page->deleteAction());
    }
}
