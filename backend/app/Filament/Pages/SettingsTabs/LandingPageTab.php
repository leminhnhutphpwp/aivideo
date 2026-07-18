<?php
namespace App\Filament\Pages\SettingsTabs;

use Filament\Schemas\Components\Tabs\Tab;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Components\Grid;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Textarea;

class LandingPageTab
{
    public static function make(): Tab
    {
        return Tab::make('landing_page')
            ->label('Landing Page')
            ->icon('heroicon-o-globe-alt')
            ->schema([
                Section::make('Landing Page Content')
                    ->description('Quản lý toàn bộ nội dung landing page')
                    ->schema([
                        // Sử dụng Grid 2 cột để nhóm các section nhỏ,
                        // tránh lỗi Filament isContained() on null do quá nhiều section
                        Grid::make(2)->schema([
                            Section::make('Hero')
                                ->description('Section đầu tiên của landing page')
                                ->columns(2)
                                ->columnSpan(1)
                                ->schema([
                                    TextInput::make('hero_label')->label('Label (badge)')->maxLength(50),
                                    TextInput::make('hero_title_line1')->label('Tiêu đề dòng 1')->maxLength(100),
                                    TextInput::make('hero_title_line2')->label('Tiêu đề dòng 2 (accent)')->maxLength(100),
                                    Textarea::make('hero_subtitle')->label('Mô tả')->rows(2)->maxLength(300)->columnSpanFull(),
                                    TextInput::make('hero_cta_text')->label('Text nút CTA')->maxLength(50),
                                    TextInput::make('hero_cta_url')->label('Link nút CTA')->maxLength(255),
                                    Textarea::make('hero_typewriter_words')->label('Typewriter words (phân cách bằng dấu phẩy)')->rows(2)->maxLength(200)->helperText('VD: viral, triệu view, xu hướng, đột phá')->columnSpanFull(),
                                ]),

                            Section::make('Reel (Showreel)')
                                ->description('Section thứ 2 — video showreel')
                                ->columns(2)
                                ->columnSpan(1)
                                ->schema([
                                    TextInput::make('reel_label')->label('Label')->maxLength(50),
                                    TextInput::make('reel_title_line1')->label('Tiêu đề dòng 1')->maxLength(100),
                                    TextInput::make('reel_title_line2')->label('Tiêu đề dòng 2 (accent)')->maxLength(100),
                                ]),

                            Section::make('Intro (Social Video Automation)')
                                ->description('Section thứ 3 — giới thiệu tính năng')
                                ->columns(2)
                                ->columnSpan(1)
                                ->schema([
                                    TextInput::make('intro_label')->label('Label (badge)')->maxLength(50),
                                    TextInput::make('intro_title_line1')->label('Tiêu đề dòng 1')->maxLength(100),
                                    TextInput::make('intro_title_line2')->label('Tiêu đề dòng 2 (accent)')->maxLength(100),
                                    Textarea::make('intro_subtitle')->label('Mô tả')->rows(3)->maxLength(300)->columnSpanFull(),
                                    Textarea::make('intro_features')->label('Feature pills (phân cách bằng |)')->rows(2)->maxLength(300)->helperText('VD: Tự động tạo script viral | Sinh hook cuốn hút | Tăng 10x engagement')->columnSpanFull(),
                                ]),

                            Section::make('Genesis (Cốt Lõi Công Nghệ)')
                                ->description('Section thứ 4')
                                ->columns(2)
                                ->columnSpan(1)
                                ->schema([
                                    TextInput::make('genesis_label')->label('Label')->maxLength(50),
                                    TextInput::make('genesis_title_line1')->label('Tiêu đề dòng 1')->maxLength(100),
                                    TextInput::make('genesis_title_line2')->label('Tiêu đề dòng 2 (accent)')->maxLength(100),
                                ]),

                            Section::make('Forge (Style Engine)')
                                ->description('Section thứ 5 — chọn phong cách')
                                ->columns(2)
                                ->columnSpan(1)
                                ->schema([
                                    TextInput::make('forge_label')->label('Label')->maxLength(50),
                                    TextInput::make('forge_cta_text')->label('Text nút CTA')->maxLength(50),
                                ]),

                            Section::make('Workflow (Quy Trình)')
                                ->description('Section thứ 6 — các bước hoạt động')
                                ->columns(2)
                                ->columnSpan(1)
                                ->schema([
                                    TextInput::make('workflow_label')->label('Label')->maxLength(50),
                                ]),

                            Section::make('Director (Master Control)')
                                ->description('Section thứ 7 — điều khiển sáng tạo')
                                ->columns(2)
                                ->columnSpan(1)
                                ->schema([
                                    TextInput::make('director_label')->label('Label')->maxLength(50),
                                    TextInput::make('director_title_line1')->label('Tiêu đề dòng 1')->maxLength(100),
                                    TextInput::make('director_title_line2')->label('Tiêu đề dòng 2 (accent)')->maxLength(100),
                                    Textarea::make('director_subtitle')->label('Mô tả')->rows(3)->maxLength(300)->columnSpanFull(),
                                ]),

                            Section::make('Gallery (Phong Cách)')
                                ->description('Section thứ 8 — thư viện ảnh')
                                ->columns(2)
                                ->columnSpan(1)
                                ->schema([
                                    TextInput::make('gallery_label')->label('Label')->maxLength(50),
                                    TextInput::make('gallery_title_line1')->label('Tiêu đề dòng 1')->maxLength(100),
                                    TextInput::make('gallery_title_line2')->label('Tiêu đề dòng 2 (accent)')->maxLength(100),
                                ]),

                            Section::make('Sound (Trải Nghiệm Âm Thanh)')
                                ->description('Section thứ 9')
                                ->columns(2)
                                ->columnSpan(1)
                                ->schema([
                                    TextInput::make('sound_label')->label('Label')->maxLength(50),
                                    TextInput::make('sound_title_line1')->label('Tiêu đề dòng 1')->maxLength(100),
                                    TextInput::make('sound_title_line2')->label('Tiêu đề dòng 2 (accent)')->maxLength(100),
                                ]),

                            Section::make('Ecosystem (Hệ Sinh Thái)')
                                ->description('Section thứ 10')
                                ->columns(2)
                                ->columnSpan(1)
                                ->schema([
                                    TextInput::make('ecosystem_label')->label('Label')->maxLength(50),
                                    TextInput::make('ecosystem_title_line1')->label('Tiêu đề dòng 1')->maxLength(100),
                                    TextInput::make('ecosystem_title_line2')->label('Tiêu đề dòng 2 (accent)')->maxLength(100),
                                    Textarea::make('ecosystem_subtitle')->label('Mô tả')->rows(3)->maxLength(300)->columnSpanFull(),
                                ]),

                            Section::make('Stats (Hiệu Suất)')
                                ->description('Section thứ 11 — số liệu')
                                ->columns(2)
                                ->columnSpan(1)
                                ->schema([
                                    TextInput::make('stats_label')->label('Label (badge)')->maxLength(50),
                                    TextInput::make('stats_title_line1')->label('Tiêu đề dòng 1')->maxLength(100),
                                    TextInput::make('stats_title_line2')->label('Tiêu đề dòng 2 (accent)')->maxLength(100),
                                ]),

                            Section::make('Vision (Điều Khiển)')
                                ->description('Section thứ 12')
                                ->columns(2)
                                ->columnSpan(1)
                                ->schema([
                                    TextInput::make('vision_label')->label('Label')->maxLength(50),
                                    TextInput::make('vision_title_line1')->label('Tiêu đề dòng 1')->maxLength(100),
                                    TextInput::make('vision_title_line2')->label('Tiêu đề dòng 2 (accent)')->maxLength(100),
                                    Textarea::make('vision_description_p1')->label('Mô tả đoạn 1')->rows(3)->maxLength(300)->columnSpanFull(),
                                    Textarea::make('vision_description_p2')->label('Mô tả đoạn 2')->rows(3)->maxLength(300)->columnSpanFull(),
                                ]),

                            Section::make('Portal (CTA cuối trang)')
                                ->description('Section áp chót — kêu gọi hành động')
                                ->columns(2)
                                ->columnSpan(1)
                                ->schema([
                                    Textarea::make('portal_label_texts')->label('Label morph (phân cách bằng /)')->rows(2)->maxLength(300)->columnSpanFull(),
                                    TextInput::make('portal_title_line1')->label('Tiêu đề dòng 1')->maxLength(100),
                                    TextInput::make('portal_title_line2')->label('Tiêu đề dòng 2 (accent)')->maxLength(100),
                                    Textarea::make('portal_subtitle')->label('Mô tả')->rows(2)->maxLength(300)->columnSpanFull(),
                                    TextInput::make('portal_cta_text')->label('Text nút CTA')->maxLength(50),
                                    TextInput::make('portal_login_text')->label('Text "Đã có tài khoản?"')->maxLength(100),
                                    TextInput::make('portal_login_label')->label('Text nút Đăng nhập')->maxLength(50),
                                ]),

                            Section::make('Footer')
                                ->description('Chân trang')
                                ->columns(2)
                                ->columnSpan(1)
                                ->schema([
                                    TextInput::make('footer_copyright')->label('Copyright')->maxLength(100)->columnSpanFull(),
                                    TextInput::make('footer_privacy_url')->label('Link Privacy')->maxLength(255),
                                    TextInput::make('footer_terms_url')->label('Link Terms')->maxLength(255),
                                    TextInput::make('footer_contact_url')->label('Link Contact')->maxLength(255),
                                ]),
                        ]),
                    ]),
            ]);
    }
}
