<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;

class StoryboardTypeService
{
    private const SKILLS_PATH = '/skills/video-storyboard/types';

    private static array $defaultTypes = [
        'none' => ['capability' => 't2v'],
        'ugc_review' => ['capability' => 't2v'],
        'brand_tvc' => ['capability' => 't2v'],
        'virtual_koc' => ['capability' => 't2v'],
        'product_ads' => ['capability' => 'i2v'],
        'campaign' => ['capability' => 't2v'],
        'storyboard_video' => ['capability' => 't2v'],
        'short_form_ads' => ['capability' => 't2v'],
        'shoppable_video' => ['capability' => 'i2v'],
    ];

    public function getTypes(): array
    {
        return Cache::remember('storyboard_types', 3600, function () {
            $types = $this->loadFromFilesystem();

            return $types ?? self::$defaultTypes;
        });
    }

    public function getTypeIds(): array
    {
        $ids = array_keys($this->getTypes());
        // Always include 'none' as valid type (user relies purely on prompt, no skills)
        if (!in_array('none', $ids, true)) {
            array_unshift($ids, 'none');
        }
        return $ids;
    }

    public function getCapability(string $videoType): string
    {
        $types = $this->getTypes();

        return $types[$videoType]['capability'] ?? 't2v';
    }

    public function isValidType(string $videoType): bool
    {
        return in_array($videoType, $this->getTypeIds(), true);
    }

    public function clearCache(): void
    {
        Cache::forget('storyboard_types');
    }

    private function loadFromFilesystem(): ?array
    {
        if (!is_dir(self::SKILLS_PATH)) {
            return null;
        }

        $types = [];
        $entries = scandir(self::SKILLS_PATH);

        foreach ($entries as $entry) {
            if ($entry === '.' || $entry === '..') {
                continue;
            }

            $skillFile = self::SKILLS_PATH . '/' . $entry . '/SKILL.md';

            if (!is_file($skillFile)) {
                continue;
            }

            $parsed = $this->parseSkillFile($skillFile);

            if ($parsed !== null) {
                $types[$parsed['id']] = [
                    'capability' => $parsed['capability'],
                ];
            }
        }

        return $types ?: null;
    }

    private function parseSkillFile(string $path): ?array
    {
        $content = @file_get_contents($path);

        if ($content === false) {
            return null;
        }

        if (!preg_match('/^---\s*\n([\s\S]*?)\n---/', $content, $matches)) {
            return null;
        }

        $fm = $this->parseFrontmatter($matches[1]);

        if (!isset($fm['id'])) {
            return null;
        }

        return [
            'id' => $fm['id'],
            'capability' => $fm['capability'] ?? 't2v',
        ];
    }

    private function parseFrontmatter(string $raw): array
    {
        $result = [];

        foreach (explode("\n", $raw) as $line) {
            $line = trim($line);

            if ($line === '' || str_starts_with($line, '#')) {
                continue;
            }

            $colonPos = strpos($line, ':');

            if ($colonPos === false) {
                continue;
            }

            $key = trim(substr($line, 0, $colonPos));
            $value = trim(substr($line, $colonPos + 1));

            if (str_starts_with($value, '[') && str_ends_with($value, ']')) {
                $value = array_map('trim', explode(',', substr($value, 1, -1)));
                $value = array_filter($value);
            } elseif ($value === 'true') {
                $value = true;
            } elseif ($value === 'false') {
                $value = false;
            } elseif ((str_starts_with($value, '"') && str_ends_with($value, '"'))
                || (str_starts_with($value, "'") && str_ends_with($value, "'"))) {
                $value = substr($value, 1, -1);
            }

            $result[$key] = $value;
        }

        return $result;
    }
}
