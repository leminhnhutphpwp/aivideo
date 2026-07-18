import { type ComponentType } from 'react';
import { type OptionDef, findOption } from './rich-select';

export type { OptionDef };
export { findOption };
import {
  Film, Camera, Palette, Sun, Wind, Wand2, Cpu, Clock, Square, Droplets,
  Flame, Smile, Moon, CloudMoon, Heart, Leaf, Zap, CloudRain,
  Crosshair, ArrowLeftToLine, ArrowRightToLine, Search, SearchCheck, MoveRight, Navigation, ChevronsUp, ChevronsDown, Hand,
  Sunrise, Lamp, Flashlight, Lightbulb, Eclipse, SunDim, CircleDot, UserRound,
  Box, Sparkles, Package, Smartphone,
} from 'lucide-react';

export const STYLE_OPTIONS: OptionDef[] = [
  { value: '', label: 'None — Không chọn', desc: 'Không áp dụng phong cách, phụ thuộc hoàn toàn vào prompt', suitableFor: 'Tự do sáng tạo', icon: Square },
  { value: 'Cinematic', label: 'Chuyên nghiệp', desc: 'Màu sắc điện ảnh, depth of field mỏng, góc máy chuyên nghiệp', suitableFor: 'Trailer, phim ngắn, brand film', icon: Film },
  { value: '3D Animation', label: 'Hoạt hình 3D', desc: 'Nhân vật & cảnh 3D, ánh sáng studio, chuyển động mượt', suitableFor: 'Phim hoạt hình, game, quảng cáo sản phẩm', icon: Box },
  { value: 'Anime', label: 'Anime', desc: 'Phong cách hoạt hình Nhật Bản, nét vẽ đặc trưng, màu sắc tươi', suitableFor: 'MV anime, content trẻ, fan art', icon: Sparkles },
  { value: 'Realistic', label: 'Chân thực', desc: 'Hình ảnh như thật, chi tiết cao, ánh sáng tự nhiên', suitableFor: 'Demo sản phẩm, phim tài liệu, review', icon: Camera },
  { value: 'Fantasy', label: 'Kỳ ảo', desc: 'Thế giới giả tưởng, phép thuật, sinh vật huyền bí', suitableFor: 'Game trailer, MV fantasy, storytelling', icon: Wand2 },
  { value: 'Cyberpunk', label: 'Viễn tưởng', desc: 'Thành phố tương lai, đèn neon, công nghệ cao', suitableFor: 'Game sci-fi, tech brand, quảng cáo gaming', icon: Cpu },
  { value: 'Vintage', label: 'Hoài cổ', desc: 'Màu phim cũ, hạt film, tone ấm hoài niệm', suitableFor: 'Video kỷ niệm, brand heritage, lifestyle', icon: Clock },
  { value: 'Minimalist', label: 'Tối giản', desc: 'Bố cục sạch, ít chi tiết, tập trung vào chủ thể', suitableFor: 'Brand premium, kiến trúc, nội thất', icon: Square },
  { value: 'Oil Painting', label: 'Tranh sơn dầu', desc: 'Nét cọ dày, màu sắc nghệ thuật, texture sơn dầu', suitableFor: 'Art film, gallery video, creative content', icon: Palette },
  { value: 'Watercolor', label: 'Màu nước', desc: 'Màu loang nhẹ, trong suốt, nét vẽ mềm mại', suitableFor: 'Thiệp, thơ, video nhẹ nhàng', icon: Droplets },
];

export const MOOD_OPTIONS: OptionDef[] = [
  { value: '', label: 'None — Không chọn', desc: 'Không áp dụng tâm trạng, phụ thuộc hoàn toàn vào prompt', suitableFor: 'Tự do sáng tạo', icon: Square },
  { value: 'Dramatic', label: 'Kịch tính', desc: 'Căng thẳng, cao trào, cảm xúc mạnh', suitableFor: 'Trailer hành động, teaser phim', icon: Flame },
  { value: 'Happy', label: 'Vui tươi', desc: 'Lạc quan, năng lượng tích cực, tươi sáng', suitableFor: 'Quảng cáo, giới thiệu SP, vlog', icon: Smile },
  { value: 'Mysterious', label: 'Huyền bí', desc: 'Bí ẩn, tò mò, không khí khó đoán', suitableFor: 'Teaser, storytelling, phim trinh thám', icon: Moon },
  { value: 'Dark', label: 'U tối', desc: 'Tối tăm, nặng nề, không khí ám ảnh', suitableFor: 'Horror, thriller, MV dark', icon: CloudMoon },
  { value: 'Romantic', label: 'Lãng mạn', desc: 'Nhẹ nhàng, ngọt ngào, tình cảm', suitableFor: 'Video cưới, love story, MV ballad', icon: Heart },
  { value: 'Peaceful', label: 'Bình yên', desc: 'Tĩnh lặng, thư thái, nhẹ nhàng', suitableFor: 'Thiền, yoga, nature, tutorial', icon: Leaf },
  { value: 'Energetic', label: 'Năng động', desc: 'Sôi động, nhanh, tràn đầy năng lượng', suitableFor: 'Thể thao, fitness, event, travel', icon: Zap },
  { value: 'Melancholic', label: 'Buồn man mác', desc: 'Suy tư, hoài niệm, lắng đọng', suitableFor: 'Phim ngắn, documentary, MV buồn', icon: CloudRain },
];

export const CAMERA_OPTIONS: OptionDef[] = [
  { value: '', label: 'None — Không chọn', desc: 'Không áp dụng góc máy, phụ thuộc hoàn toàn vào prompt', suitableFor: 'Tự do sáng tạo', icon: Square },
  { value: 'Fixed', label: 'Đứng yên', desc: 'Máy quay cố định, không di chuyển', suitableFor: 'Phỏng vấn, giới thiệu, tutorial', icon: Crosshair },
  { value: 'Pan Left', label: 'Quét trái', desc: 'Máy quay xoay từ phải sang trái', suitableFor: 'Giới thiệu khung cảnh, establishing shot', icon: ArrowLeftToLine },
  { value: 'Pan Right', label: 'Quét phải', desc: 'Máy quay xoay từ trái sang phải', suitableFor: 'Reveal cảnh, dẫn dắt người xem', icon: ArrowRightToLine },
  { value: 'Zoom In', label: 'Phóng to', desc: 'Tiến gần vào chủ thể, tạo cảm giác khám phá', suitableFor: 'Reveal sản phẩm, tập trung chi tiết', icon: Search },
  { value: 'Zoom Out', label: 'Thu nhỏ', desc: 'Lùi xa khỏi chủ thể, lộ khung cảnh lớn', suitableFor: 'Kết thúc cảnh, establishing shot', icon: SearchCheck },
  { value: 'Dolly', label: 'Trượt tới', desc: 'Máy quay trượt trên ray tiến tới chủ thể', suitableFor: 'Trailer chuyên nghiệp, reveal ấn tượng', icon: MoveRight },
  { value: 'Tracking', label: 'Bám theo', desc: 'Máy quay di chuyển song song với chủ thể', suitableFor: 'Hành động, đi bộ, chạy xe', icon: Navigation },
  { value: 'Crane Up', label: 'Cẩu lên', desc: 'Máy quay nâng lên cao, thay đổi góc nhìn', suitableFor: 'Kết thúc hoành tráng, establishing shot', icon: ChevronsUp },
  { value: 'Crane Down', label: 'Cẩu xuống', desc: 'Máy quay hạ từ trên cao xuống', suitableFor: 'Mở đầu ấn tượng, từ trời xuống đất', icon: ChevronsDown },
  { value: 'Handheld', label: 'Cầm tay', desc: 'Máy quay rung nhẹ, cảm giác thực tế, gần gũi', suitableFor: 'Vlog, documentary, cảm giác chân thực', icon: Hand },
];

export const LIGHTING_OPTIONS: OptionDef[] = [
  { value: '', label: 'None — Không chọn', desc: 'Không áp dụng ánh sáng, phụ thuộc hoàn toàn vào prompt', suitableFor: 'Tự do sáng tạo', icon: Square },
  { value: 'Natural', label: 'Tự nhiên', desc: 'Ánh sáng ban ngày, mềm mại, trung tính', suitableFor: 'Ngoại cảnh, vlog, lifestyle', icon: Sun },
  { value: 'Golden Hour', label: 'Hoàng hôn', desc: 'Ánh nắng vàng ấm lúc bình minh/hoàng hôn', suitableFor: 'Lãng mạn, travel, brand cao cấp', icon: Sunrise },
  { value: 'Studio Soft', label: 'Studio mềm', desc: 'Ánh sáng studio khuếch tán, đều, không bóng gắt', suitableFor: 'Chụp sản phẩm, phỏng vấn, review', icon: Lamp },
  { value: 'Dramatic', label: 'Kịch tính', desc: 'Tương phản mạnh, bóng đổ sâu, chiaroscuro', suitableFor: 'Trailer, phim noir, ảnh nghệ thuật', icon: Flashlight },
  { value: 'Neon', label: 'Đèn neon', desc: 'Ánh sáng neon màu sắc, vibe thành phố về đêm', suitableFor: 'Cyberpunk, nightlife, gaming', icon: Lightbulb },
  { value: 'Moody', label: 'U ám', desc: 'Ánh sáng yếu, không khí huyền bí, bóng râm', suitableFor: 'Horror, mystery, MV dark', icon: Eclipse },
  { value: 'Backlit', label: 'Ngược sáng', desc: 'Ánh sáng từ phía sau chủ thể, tạo viền sáng', suitableFor: 'Chân dung, hero shot, silhouette', icon: SunDim },
  { value: 'Silhouette', label: 'Bóng đen', desc: 'Chủ thể tối trên nền sáng, hình bóng bí ẩn', suitableFor: 'Teaser, logo reveal, mở đầu ấn tượng', icon: UserRound },
  { value: 'Rim Light', label: 'Viền sáng', desc: 'Ánh sáng viền quanh chủ thể, tách khỏi nền', suitableFor: 'Sản phẩm cao cấp, chân dung, beauty', icon: CircleDot },
];

export interface DirectionPreset {
  id: string;
  label: string;
  desc: string;
  icon: ComponentType<{ className?: string }>;
  style: string;
  mood: string;
  camera: string;
  lighting: string;
  aspectHints?: string[];
  moodTones?: string[];
  cameraPresets?: string[];
  lightingPresets?: string[];
  examplePrompt?: string;
  examplePromptVi?: string;
}

// Maps each skill ID to style option values that are relevant
export const STYLE_SUGGESTIONS: Record<string, string[]> = {
  cinematic: ['Cinematic'],
  'product-reveal': ['Realistic', 'Cinematic', 'Minimalist'],
  'social-ad': ['Minimalist', 'Cinematic', 'Realistic'],
  explainer: ['Minimalist', 'Cinematic'],
  'motion-graphics': ['Oil Painting', '3D Animation', 'Minimalist', 'Cinematic'],
  food: ['Realistic', 'Cinematic'],
  travel: ['Cinematic', 'Realistic'],
  event: ['Cinematic', 'Realistic'],
  review: ['Realistic', 'Cinematic'],
  beauty: ['Realistic', 'Cinematic'],
  // AI-authored trend skills (2026)
  'asmr-slow-pour': ['Cinematic', 'Minimalist', 'Realistic'],
  'brand-cinematic-doc': ['Cinematic', 'Realistic', 'Vintage'],
  'cozy-with-me': ['Realistic', 'Minimalist', 'Vintage'],
  'stop-motion-claymation': ['3D Animation', 'Fantasy', 'Vintage'],
  none: [],
};

export const FALLBACK_PRESETS: DirectionPreset[] = [
  { id: 'cinematic', label: 'Trailer điện ảnh', desc: 'Phim ngắn chuyên nghiệp, màu điện ảnh, máy quay chuyển động', icon: Film, style: 'Cinematic', mood: 'Dramatic', camera: 'Dolly', lighting: 'Dramatic', aspectHints: ['16:9', '21:9'], moodTones: ['Dramatic', 'Mysterious', 'Romantic'], cameraPresets: ['Dolly', 'Tracking', 'Crane Up', 'Crane Down', 'Pan Left'], lightingPresets: ['Golden Hour', 'Dramatic', 'Backlit', 'Rim Light', 'Moody'] },
  { id: 'product-reveal', label: 'Giới thiệu sản phẩm', desc: 'Reveal sản phẩm chuyên nghiệp, ánh sáng studio, quay cận', icon: Package, style: 'Realistic', mood: 'Energetic', camera: 'Zoom In', lighting: 'Studio Soft', aspectHints: ['16:9', '1:1'], moodTones: ['Energetic', 'Happy', 'Dramatic'], cameraPresets: ['Zoom In', 'Dolly', 'Fixed', 'Zoom Out'], lightingPresets: ['Studio Soft', 'Natural', 'Rim Light', 'Backlit'] },
  { id: 'social-ad', label: 'Quảng cáo social', desc: 'Nội dung dọc 9:16, bắt trend, thu hút', icon: Smartphone, style: 'Minimalist', mood: 'Happy', camera: 'Fixed', lighting: 'Natural', aspectHints: ['9:16', '1:1'], moodTones: ['Happy', 'Energetic', 'Dramatic'], cameraPresets: ['Fixed', 'Handheld', 'Zoom In'], lightingPresets: ['Natural', 'Studio Soft', 'Neon'] },
  { id: 'explainer', label: 'Giải thích', desc: 'Giáo dục, hướng dẫn, bố cục sạch', icon: Zap, style: 'Minimalist', mood: 'Peaceful', camera: 'Fixed', lighting: 'Studio Soft', aspectHints: ['16:9', '1:1'], moodTones: ['Peaceful', 'Happy', 'Energetic'], cameraPresets: ['Fixed', 'Zoom In', 'Pan Right'], lightingPresets: ['Studio Soft', 'Natural', 'Rim Light'] },
  { id: 'motion-graphics', label: 'Đồ hoạ chuyển động', desc: 'Hoạt hình trừu tượng, kinetic typography', icon: Palette, style: 'Oil Painting', mood: 'Energetic', camera: 'Dolly', lighting: 'Neon', aspectHints: ['16:9', '1:1'], moodTones: ['Energetic', 'Happy', 'Dramatic'], cameraPresets: ['Dolly', 'Zoom In', 'Pan Left', 'Pan Right'], lightingPresets: ['Neon', 'Dramatic', 'Natural'] },
  { id: 'food', label: 'Ẩm thực & Nấu ăn', desc: 'Quay món ăn hấp dẫn, cận cảnh macro', icon: Sun, style: 'Realistic', mood: 'Happy', camera: 'Zoom In', lighting: 'Natural', aspectHints: ['16:9', '1:1', '9:16'], moodTones: ['Happy', 'Peaceful', 'Romantic'], cameraPresets: ['Zoom In', 'Fixed', 'Dolly', 'Pan Left'], lightingPresets: ['Natural', 'Studio Soft', 'Rim Light', 'Golden Hour'] },
  { id: 'travel', label: 'Du lịch & Khám phá', desc: 'Travel vlog, cảnh quan rộng, màu sắc rực rỡ', icon: Wind, style: 'Cinematic', mood: 'Energetic', camera: 'Tracking', lighting: 'Golden Hour', aspectHints: ['16:9', '9:16'], moodTones: ['Energetic', 'Happy', 'Peaceful'], cameraPresets: ['Tracking', 'Pan Right', 'Pan Left', 'Crane Up', 'Dolly'], lightingPresets: ['Golden Hour', 'Natural', 'Backlit'] },
  { id: 'event', label: 'Sự kiện & Cưới hỏi', desc: 'Quay tiệc cưới, sự kiện ấm áp, sang trọng', icon: Heart, style: 'Cinematic', mood: 'Romantic', camera: 'Pan Right', lighting: 'Golden Hour', aspectHints: ['16:9', '9:16'], moodTones: ['Romantic', 'Happy', 'Dramatic'], cameraPresets: ['Pan Right', 'Fixed', 'Crane Up', 'Dolly'], lightingPresets: ['Golden Hour', 'Natural', 'Backlit', 'Studio Soft'] },
  { id: 'review', label: 'Đánh giá & Unboxing', desc: 'Review sản phẩm chân thực, gần gũi', icon: Search, style: 'Realistic', mood: 'Happy', camera: 'Handheld', lighting: 'Studio Soft', aspectHints: ['16:9', '9:16'], moodTones: ['Happy', 'Peaceful', 'Energetic'], cameraPresets: ['Handheld', 'Fixed', 'Zoom In'], lightingPresets: ['Studio Soft', 'Natural', 'Rim Light'] },
  { id: 'beauty', label: 'Làm đẹp & Thời trang', desc: 'Makeup tutorial, review mỹ phẩm, outfit', icon: Sparkles, style: 'Realistic', mood: 'Peaceful', camera: 'Zoom In', lighting: 'Studio Soft', aspectHints: ['9:16', '16:9', '1:1'], moodTones: ['Peaceful', 'Happy', 'Romantic'], cameraPresets: ['Zoom In', 'Fixed', 'Dolly', 'Pan Left'], lightingPresets: ['Studio Soft', 'Rim Light', 'Natural', 'Neon'] },
  { id: 'none', label: 'Không mẫu', desc: 'Tự viết prompt theo ý muốn, không gợi ý', icon: Wind, style: '', mood: '', camera: '', lighting: '', aspectHints: ['16:9', '9:16', '1:1', '4:3'] },
];

export const PRESET_ICON_MAP: Record<string, ComponentType<{ className?: string }>> = {
  cinematic: Film,
  'product-reveal': Package,
  'social-ad': Smartphone,
  explainer: Zap,
  'motion-graphics': Palette,
  'food': Sun,
  'travel': Wind,
  'event': Heart,
  'review': Search,
  'beauty': Sparkles,
  'none': Wind,
};

// --- Skill popularity ("vòng học skills") -------------------------------------
// Stats map returned by GET /api/daemon/media/skills/stats. A skill absent from
// the map is treated as all-zero (never used / never liked).
export interface SkillStat {
  usage_count?: number;
  likes_count?: number;
  published_count?: number;
  last_used_at?: string | null;
}
export type SkillStatsMap = Record<string, SkillStat>;

/**
 * Sort skill-like items by popularity: `usage_count` desc, then `likes_count`
 * desc. Items with no stats (treated as 0) fall to the end while preserving the
 * server's default order among ties. The default/"none" item ('' or 'none') is
 * pinned to a fixed edge (`pinDefault`) regardless of its stats, so it never
 * gets buried by popular skills.
 *
 * Passing an empty/undefined stats map is a no-op beyond the default pin, which
 * keeps the caller's fallback order intact when stats can't be loaded.
 */
export function sortSkillsByPopularity<T>(
  items: T[],
  stats: SkillStatsMap | undefined | null,
  getId: (item: T) => string,
  pinDefault: 'start' | 'end' = 'start',
): T[] {
  const map = stats || {};
  const isDefault = (id: string) => id === '' || id === 'none';
  const usage = (id: string) => map[id]?.usage_count ?? 0;
  const likes = (id: string) => map[id]?.likes_count ?? 0;
  return items
    .map((item, index) => ({ item, index, id: getId(item) }))
    .sort((a, b) => {
      const ad = isDefault(a.id);
      const bd = isDefault(b.id);
      if (ad !== bd) {
        const defaultFirst = pinDefault === 'start';
        return ad === defaultFirst ? -1 : 1;
      }
      if (ad && bd) return a.index - b.index;
      const du = usage(b.id) - usage(a.id);
      if (du !== 0) return du;
      const dl = likes(b.id) - likes(a.id);
      if (dl !== 0) return dl;
      return a.index - b.index; // stable fallback = server default order
    })
    .map((x) => x.item);
}

export function buildLiveDescription(scene: { style: string; mood: string; camera: string; lighting: string }): string {
  if (!scene.style && !scene.mood && !scene.camera && !scene.lighting) {
    return 'Không áp dụng mẫu — prompt gốc được giữ nguyên';
  }
  const s = scene.style ? findOption(STYLE_OPTIONS, scene.style) : null;
  const m = scene.mood ? findOption(MOOD_OPTIONS, scene.mood) : null;
  const c = scene.camera ? findOption(CAMERA_OPTIONS, scene.camera) : null;
  const l = scene.lighting ? findOption(LIGHTING_OPTIONS, scene.lighting) : null;
  const parts: string[] = [];
  if (s) parts.push(`Phong cách ${s.label.toLowerCase()} (${s.desc})`);
  if (m) parts.push(`tâm trạng ${m.label.toLowerCase()}`);
  if (c) parts.push(`máy quay ${c.label.toLowerCase()}`);
  if (l) parts.push(`ánh sáng ${l.label.toLowerCase()}`);
  return parts.join(', ') || 'Chưa có thông số';
}
