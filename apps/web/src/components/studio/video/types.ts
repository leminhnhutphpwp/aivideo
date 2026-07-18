import type { LucideIcon } from 'lucide-react';
import type { OptionDef } from '@/components/studio/rich-select';

export interface VideoScene {
  id: string;
  prompt: string;
  duration: number;
  style: string;
  mood: string;
  camera: string;
  lighting: string;
  negativePrompt: string;
  referenceImage: string;
  referencePreview: string;
  lastFrameImage: string;
  lastFramePreview: string;
}

export interface VideoModel {
  id: string;
  label: string;
  provider: string;
  caps: string[];
  default?: boolean;
}

export type VideoFeature = 'text-to-video' | 'image-to-video' | 'reference-to-video' | 'video-edit' | 'video-editing' | 'character-animation';

export const FEATURE_LABELS: Record<VideoFeature, string> = {
  'text-to-video': 'Text-to-Video',
  'image-to-video': 'Image-to-Video',
  'reference-to-video': 'Reference-to-Video',
  'video-edit': 'Video Editing',
  'video-editing': 'Video Editing',
  'character-animation': 'Character Animation',
};

export const FEATURE_ICONS: Record<VideoFeature, string> = {
  'text-to-video': 'Wand2',
  'image-to-video': 'Image',
  'reference-to-video': 'UserRound',
  'video-edit': 'Film',
  'video-editing': 'Film',
  'character-animation': 'Smile',
};

export const FEATURE_DESCRIPTIONS: Record<VideoFeature, string> = {
  'text-to-video': 'Tạo video từ mô tả văn bản',
  'image-to-video': 'Tạo video từ ảnh có sẵn',
  'reference-to-video': 'Tạo video với nhân vật tham chiếu',
  'video-edit': 'Chỉnh sửa video có sẵn',
  'video-editing': 'Chỉnh sửa video có sẵn',
  'character-animation': 'Hoạt hình chuyển động nhân vật',
};
