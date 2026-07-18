<?php

namespace App\Services;

class ContentFilterService
{
    /**
     * COMMENT filter — clear-meaning obscene strings matched as diacritic-folded
     * SUBSTRINGS. Only English words whose folded form never occurs inside an innocent
     * word live here, so substring matching is safe and also catches inflections
     * ("fuck" → "fucking", "shit" → "bullshit").
     *
     * ⚠️ Do NOT add short Vietnamese tokens here: folding collapses tone marks onto
     * everyday syllables (đụ→"du" as in "du lịch", lồn→"lon" as in "lon bia",
     * đĩ→"di" as in "di chuyển", cứt→"cut"), which false-positives on ordinary
     * comments. Those go in $blockedBoundaryWords instead.
     */
    protected array $blockedSubstrings = [
        'fuck', 'shit', 'stupid', 'idiot', 'damn',
    ];

    /**
     * COMMENT filter — short/ambiguous obscene tokens matched as WHOLE WORDS against the
     * lowercased but NON-diacritic-folded text, using Unicode word boundaries
     * ((?<![\p{L}\p{N}]) … (?![\p{L}\p{N}])). Keeping tone marks lets us tell profanity
     * apart from innocent homographs (đéo≠đèo/đeo, đĩ≠đi/đĩa, cặc≠các, buồi≠buổi, cứt≠cứ),
     * and the boundary stops standalone tokens from matching inside longer words
     * ("ngu" won't trip "Nguyễn"/"nguy hiểm").
     *
     * Trade-off: an unaccented obfuscation ("dit me") can slip through. We accept that
     * to guarantee ordinary Vietnamese comments ("rất đẹp", "sáng tạo", "con mèo") pass.
     *
     * Deliberately NOT blocked — everyday words that false-positive even with a word
     * boundary, so they were removed entirely: con/mẹ/chết (con mèo, mẹ, chết cười),
     * tao/mày/thằng (tao nhã, lông mày, thằng bé), đánh (đánh giá), chó (chú chó),
     * đê (đê điều), dí (dí dỏm), lon/buoi (lon bia, buổi sáng).
     */
    protected array $blockedBoundaryWords = [
        'đụ', 'đm', 'địt', 'đjt', 'lồn', 'buồi', 'cứt', 'đéo', 'đĩ', 'cặc', 'cặk', 'cak', 'ngu',
    ];

    /**
     * COMMENT filter — spam link patterns matched against the RAW lowercased text.
     * These CANNOT go through normalize(): it strips dots as "obfuscation", so ".com"
     * would become "com" and match "cơm" (rice) / "comment". Explicit URL/domain
     * patterns avoid that.
     */
    protected array $spamPatterns = [
        '#https?://#iu',
        '#www\.#iu',
        '#\.(?:com|net|org|io|xyz|info)\b#iu',
    ];

    /**
     * Genuinely unsafe content for a PUBLIC, paid platform: sexual/NSFW, child sexual
     * abuse, non-consensual acts, deepfakes, extreme gore, terrorism, hard drugs.
     *
     * This list is intentionally NARROWER than $blockedWords (which also blocks generic
     * profanity/spam and would false-positive on ordinary Vietnamese words like "con",
     * "chó", "mẹ"). Video prompts are descriptive Vietnamese text, so we only reject
     * clearly harmful content here — never everyday nouns. Phrases are matched after
     * whitespace-stripping normalization, so "khiêu dâm" ≠ "hoa dâm bụt".
     */
    protected array $prohibitedWords = [
        // Sexual / NSFW
        'khiêu dâm', 'khỏa thân', 'khoả thân', 'thoát y', 'lột đồ', 'mại dâm', 'bán dâm',
        'gái gọi', 'ảnh nóng', 'clip nóng', 'lộ hàng', 'phim sex', 'sex tape', 'porn', 'pornhub',
        'xvideos', 'hentai', 'onlyfans', 'xxx', 'nude', 'naked', 'nudity', 'sexual',
        // Child sexual abuse
        'ấu dâm', 'child porn', 'childporn', 'trẻ em khỏa thân',
        // Non-consensual / assault
        'hiếp dâm', 'cưỡng dâm', 'loạn luân',
        // Deepfake / impersonation
        'deepfake', 'deep fake',
        // Extreme violence / gore
        'chặt đầu', 'hành quyết', 'beheading', 'behead', 'máu me kinh dị',
        // Terrorism / weapons
        'khủng bố', 'terrorist', 'chế tạo bom', 'bom tự chế', 'thuốc nổ tự chế',
        // Hard drugs
        'ma túy', 'buôn ma túy', 'heroin', 'cocaine', 'methamphetamine',
    ];

    /**
     * Short, ambiguous English tokens that must match as WHOLE WORDS only — matching them
     * as substrings produces false positives on innocent words (e.g. 'sex' in "unisex",
     * 'jav' in "Java"/"JavaScript"). These are checked against a whitespace-preserving
     * normalization with regex word boundaries. Longer phrases (e.g. 'phim sex') stay in
     * $prohibitedWords and are matched by substring.
     */
    protected array $prohibitedBoundaryWords = [
        'sex', 'jav',
    ];

    /**
     * Check whether text contains genuinely prohibited content (NSFW / deepfake / gore /
     * illegal). Use this to moderate video prompts and community publishes — NOT
     * containsBlockedWords(), which is tuned for comment spam/profanity and over-blocks
     * ordinary prompt wording.
     */
    public function containsProhibitedContent(string $content): bool
    {
        return $this->getProhibitedTerm($content) !== null;
    }

    /**
     * First prohibited term found, for internal logging only. Never expose to end users —
     * surface a generic safety message instead so we don't reveal the filter rules.
     */
    public function getProhibitedTerm(string $content): ?string
    {
        // Phrase list: space-stripped, diacritic-folded substring match. This catches
        // Vietnamese written WITHOUT tone marks ("khieu dam" == "khiêu dâm") and simple
        // obfuscation.
        $normalized = $this->normalize($content);
        foreach ($this->prohibitedWords as $word) {
            if (str_contains($normalized, $this->normalize($word))) {
                return $word;
            }
        }

        // Ambiguous short tokens: whole-word match on a whitespace-preserving,
        // diacritic-folded form so "Java"/"unisex" never trip 'jav'/'sex'.
        $loose = $this->normalizeLoose($content);
        foreach ($this->prohibitedBoundaryWords as $word) {
            $pattern = '/\b' . preg_quote($this->normalizeLoose($word), '/') . '\b/u';
            if (preg_match($pattern, $loose) === 1) {
                return $word;
            }
        }

        return null;
    }

    /**
     * Check if a COMMENT contains blocked words (spam links + profanity/toxicity).
     * Tuned to NOT over-block ordinary Vietnamese — see the property docblocks for how
     * substring vs. word-boundary matching is split.
     */
    public function containsBlockedWords(string $content): bool
    {
        return $this->getBlockedWord($content) !== null;
    }

    /**
     * Get the first blocked word/pattern found (for logging + the generic error message).
     * Never surface the raw token to end users.
     */
    public function getBlockedWord(string $content): ?string
    {
        // Spam links — match the raw lowercased text (normalize() strips dots).
        $lower = mb_strtolower($content, 'UTF-8');
        foreach ($this->spamPatterns as $pattern) {
            if (preg_match($pattern, $lower) === 1) {
                return $pattern;
            }
        }

        // Clear-meaning obscene substrings — diacritic-folded, substring match.
        $normalized = $this->normalize($content);
        foreach ($this->blockedSubstrings as $word) {
            if (str_contains($normalized, $this->normalize($word))) {
                return $word;
            }
        }

        // Short/ambiguous obscene tokens — whole-word match on NON-folded text so tone
        // marks disambiguate profanity from everyday homographs.
        foreach ($this->blockedBoundaryWords as $word) {
            if ($this->matchesWholeWord($lower, $word)) {
                return $word;
            }
        }

        return null;
    }

    /**
     * Whole-word (Unicode word-boundary) match of $token inside already-lowercased
     * $haystack, WITHOUT folding diacritics. \p{L}\p{N} lookarounds treat accented
     * Vietnamese letters as word chars, so "đĩ" matches "con đĩ" but not "đĩa"/"đi".
     */
    protected function matchesWholeWord(string $haystack, string $token): bool
    {
        $token = mb_strtolower($token, 'UTF-8');
        $pattern = '/(?<![\p{L}\p{N}])' . preg_quote($token, '/') . '(?![\p{L}\p{N}])/u';

        return preg_match($pattern, $haystack) === 1;
    }

    /**
     * Normalize content for substring comparison: lowercase, fold Vietnamese diacritics to
     * ASCII (so unaccented input matches accented keywords), strip whitespace, and remove
     * common obfuscation chars. Whitespace is stripped so "khiêu dâm" ≠ "hoa dâm bụt".
     */
    protected function normalize(string $text): string
    {
        $text = mb_strtolower($text, 'UTF-8');
        $text = $this->foldDiacritics($text);
        $text = str_replace([' ', "\t", "\n", "\r"], '', $text);
        // Remove common obfuscation chars
        $text = str_replace(['*', '.', '-', '_', '0', '1', '3', '4', '7'], '', $text);
        return $text;
    }

    /**
     * Whitespace-PRESERVING normalization for word-boundary matching: lowercase + diacritic
     * fold, collapse runs of whitespace to a single space. Keeping separators lets regex
     * \b boundaries distinguish standalone "sex"/"jav" from "unisex"/"java".
     */
    protected function normalizeLoose(string $text): string
    {
        $text = mb_strtolower($text, 'UTF-8');
        $text = $this->foldDiacritics($text);
        return trim(preg_replace('/\s+/u', ' ', $text));
    }

    /**
     * Fold Vietnamese (and common Latin) diacritics down to base ASCII letters so that
     * unaccented user input is compared on equal footing with the accented keyword list.
     * Input is expected to already be lowercased.
     */
    protected function foldDiacritics(string $text): string
    {
        static $map = null;
        if ($map === null) {
            $groups = [
                'a' => ['à','á','ạ','ả','ã','â','ầ','ấ','ậ','ẩ','ẫ','ă','ằ','ắ','ặ','ẳ','ẵ','ä','å','æ'],
                'e' => ['è','é','ẹ','ẻ','ẽ','ê','ề','ế','ệ','ể','ễ','ë'],
                'i' => ['ì','í','ị','ỉ','ĩ','ï','î'],
                'o' => ['ò','ó','ọ','ỏ','õ','ô','ồ','ố','ộ','ổ','ỗ','ơ','ờ','ớ','ợ','ở','ỡ','ö','ø'],
                'u' => ['ù','ú','ụ','ủ','ũ','ư','ừ','ứ','ự','ử','ữ','ü','û'],
                'y' => ['ỳ','ý','ỵ','ỷ','ỹ','ÿ'],
                'd' => ['đ'],
                'c' => ['ç'],
                'n' => ['ñ'],
            ];
            $map = [];
            foreach ($groups as $base => $chars) {
                foreach ($chars as $ch) {
                    $map[$ch] = $base;
                }
            }
        }

        return strtr($text, $map);
    }
}
