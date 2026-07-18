export interface StoryboardScene {
  id: number;
  storyboard_id: number;
  scene_number: number;
  prompt: string;
  enriched_prompt: string | null;
  duration_seconds: number;
  camera_movement: string | null;
  lighting: string | null;
  style: string | null;
  mood: string | null;
  negative_prompt: string | null;
  reference_image: string | null;
  last_frame_image: string | null;
  narration: string | null;
  aspect_ratio: string;
  resolution: string;
  status: string;
  output_path: string | null;
  thumbnail_path: string | null;
  consistency_score: number | null;
  error_message: string | null;
  parent_scene_id: number | null;
  edge_label: string | null;
  position_x: number | null;
  position_y: number | null;
  parent?: StoryboardScene;
  children?: StoryboardScene[];
  created_at: string;
  updated_at: string;
}

export interface Storyboard {
  id: number;
  uuid: string;
  user_id: number;
  title: string;
  description: string | null;
  video_type: string;
  quality_tier: string;
  voice_mood: string | null;
  background_music: string | null;
  voice: string | null;
  style_guide: any;
  status: string;
  credits_cost: number;
  analysis_result: any;
  consistency_score: number | null;
  /** Total render kickoffs used (initial + retries). */
  render_attempts?: number;
  /** Cap on total render attempts per storyboard. */
  max_render_attempts?: number;
  /** Retries still allowed before the cap (0 = exhausted). */
  retries_remaining?: number;
  output_path: string | null;
  error_message?: string | null;
  /** User-safe failure reason (sanitized); null unless failed. */
  public_error?: string | null;
  render_mode: 'multi_scene' | 'single_flow' | 'storyboard_image';
  compiled_prompt: string | null;
  total_duration: number | null;
  camera_movement: string | null;
  style: string | null;
  mood: string | null;
  lighting: string | null;
  narration: string | null;
  driving_audio: string | null;
  first_frame_image: string | null;
  last_frame_image: string | null;
  scenes: StoryboardScene[];
  references: StoryboardReference[];
  progress_message?: string | null;
  shot_type?: string | null;
  multi_panel_image?: string | null;
  scenes_count?: number;
  created_at: string;
  updated_at: string;
}

export interface StoryboardReference {
  id: number;
  storyboard_id: number;
  type: 'character' | 'product' | 'background';
  asset_id: number | null;
  media_path: string;
  description: string | null;
  sort_order: number;
}

export interface SceneFormData {
  _key: string;
  parent_key: string | null;
  prompt: string;
  duration_seconds: number;
  camera_movement: string;
  lighting: string;
  style: string;
  mood: string;
  negative_prompt: string;
  reference_image: string;
  last_frame_image: string;
  narration: string;
  aspect_ratio: string;
  resolution: string;
  edge_label: string | null;
  position_x: number;
  position_y: number;
  seed?: number;
}
