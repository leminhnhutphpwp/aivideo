<?php

namespace Tests\Unit\Services;

use App\Services\ContentFilterService;
use PHPUnit\Framework\TestCase;

/**
 * FIX 3 — moderation must catch Vietnamese written without tone marks and must NOT
 * false-positive on innocent words that merely contain a short banned token.
 */
class ContentFilterServiceTest extends TestCase
{
    private ContentFilterService $filter;

    protected function setUp(): void
    {
        parent::setUp();
        $this->filter = new ContentFilterService();
    }

    /** @dataProvider prohibitedProvider */
    public function test_blocks_prohibited_content(string $text): void
    {
        $this->assertTrue(
            $this->filter->containsProhibitedContent($text),
            "Expected prohibited: {$text}"
        );
    }

    public static function prohibitedProvider(): array
    {
        return [
            'unaccented khieu dam' => ['canh khieu dam ban dem'],
            'accented khiêu dâm' => ['một cảnh khiêu dâm'],
            'unaccented hiep dam' => ['canh hiep dam'],
            'unaccented au dam' => ['noi dung au dam'],
            'unaccented ma tuy' => ['buon ma tuy'],
            'accented ma túy' => ['buôn ma túy xuyên quốc gia'],
            'phim sex phrase' => ['xem phim sex'],
            'standalone sex word' => ['a sex scene please'],
            'standalone jav word' => ['jav actress'],
            'porn substring' => ['pornhub clip'],
        ];
    }

    /** @dataProvider allowedProvider */
    public function test_allows_innocent_content(string $text): void
    {
        $this->assertFalse(
            $this->filter->containsProhibitedContent($text),
            "Expected allowed: {$text}"
        );
    }

    public static function allowedProvider(): array
    {
        return [
            'java programming' => ['lập trình Java cơ bản'],
            'javascript' => ['học JavaScript nâng cao'],
            'unisex fashion' => ['thời trang unisex cho giới trẻ'],
            'plain landscape' => ['một cảnh hoàng hôn trên biển'],
            'essex place name' => ['a trip to Essex county'],
        ];
    }

    // -----------------------------------------------------------------------------
    // COMMENT filter (containsBlockedWords) — must not over-block Vietnamese comments,
    // but must still catch real profanity/spam. Regression for the community live test
    // where "rất đẹp" was rejected 422.
    // -----------------------------------------------------------------------------

    /** @dataProvider blockedCommentProvider */
    public function test_blocks_toxic_comments(string $text): void
    {
        $this->assertTrue(
            $this->filter->containsBlockedWords($text),
            "Expected blocked comment: {$text}"
        );
    }

    public static function blockedCommentProvider(): array
    {
        return [
            'vn dit me' => ['địt mẹ mày'],
            'vn du ma' => ['đụ má'],
            'vn lon' => ['cái lồn'],
            'vn cac' => ['cặc'],
            'vn deo' => ['đéo quan tâm'],
            'vn di whore' => ['con đĩ'],
            'vn ngu' => ['mày ngu vãi'],
            'en fuck' => ['fuck this'],
            'en fucking inflection' => ['this is fucking bad'],
            'en shit substring' => ['bullshit content'],
            'en stupid' => ['so stupid'],
            'spam http' => ['xem thêm tại http://spam.example'],
            'spam www' => ['ghé www.spam.vn nhé'],
            'spam dotcom' => ['mua ngay tại shopgia.com'],
        ];
    }

    /** @dataProvider allowedCommentProvider */
    public function test_allows_clean_comments(string $text): void
    {
        $this->assertFalse(
            $this->filter->containsBlockedWords($text),
            "Expected clean comment: {$text}"
        );
    }

    public static function allowedCommentProvider(): array
    {
        return [
            // The exact false-positives found in the community live test:
            'rat dep' => ['rất đẹp'],           // đê ⊄ đẹp (was folded de ⊂ dep)
            'sang tao' => ['video sáng tạo quá'], // tao ⊄ tạo
            'xin chao' => ['xin chào mọi người'], // nc ⊄ xinchao
            'con meo' => ['con mèo dễ thương'],   // con removed
            // Other everyday Vietnamese that must not trip the filter:
            'com rice' => ['ăn cơm chưa'],        // .com ⊄ cơm
            'comment word' => ['bình luận hay, good comment'],
            'du lich travel' => ['đi du lịch biển'], // đụ folded "du" — non-folded ok
            'lon bia can' => ['một lon bia mát'],    // lon removed
            'buoi sang morning' => ['buổi sáng đẹp trời'], // buồi ≠ buổi
            'di chuyen move' => ['di chuyển nhanh'], // đĩ ≠ di
            'cac plural' => ['chào các bạn'],        // cặc ≠ các
            'chet cuoi' => ['chết cười luôn'],       // chết removed
            'danh gia review' => ['đánh giá 5 sao'], // đánh removed
            'nguyen name' => ['anh Nguyễn quay đẹp'], // ngu ⊄ Nguyễn
            'dia plate' => ['cái đĩa đẹp'],          // đĩ ⊄ đĩa
            'tao nha elegant' => ['phong cách tao nhã'], // tao removed
        ];
    }
}
