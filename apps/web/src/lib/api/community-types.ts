export type ModerationStatus = 'approved' | 'pending_review' | 'rejected';

/** Response shape of PATCH /render-jobs/{uuid}/publish. */
export interface PublishResponse {
  success: boolean;
  /** true when the asset was held for manual moderation review (degraded verdict). */
  pending_review: boolean;
  message: string | null;
  data: {
    uuid: string;
    visibility: 'sharing' | 'public';
    moderation_status: ModerationStatus;
    creator_payout: number;
    published_at: string | null;
  };
}

export interface AssetCard {
  uuid: string;
  title: string;
  prompt: string;
  output_path: string | null;
  thumbnail_path: string | null;
  preview_path: string | null;
  aspect_ratio: string;
  resolution: string;
  duration_seconds: number | null;
  credits_cost: number;
  visibility: 'sharing' | 'public';
  moderation_status?: ModerationStatus;
  tags: string[];
  like_count: number;
  usage_count: number;
  published_at: string;
  creator_payout?: number;
  liked_by_me?: boolean;
  comment_count?: number;
  asset_type: 'image' | 'video';
  capability?: string;
  reference_images?: string[];
  user: {
    name: string;
    username: string;
    avatar_url: string | null;
    reputation_level: 'newbie' | 'creator' | 'artist' | 'director' | 'producer' | 'legend';
  } | null;
}

export interface CreatorSummary {
  uuid: string;
  name: string;
  username: string;
  avatar_url: string | null;
  reputation_level: string;
  published_count: number;
}

export interface UserProfile {
  uuid: string;
  name: string;
  username: string;
  avatar_url: string | null;
  reputation_level: string;
  reputation_score: number;
  stats: {
    published_count: number;
    likes_received: number;
    follower_count: number;
    following_count: number;
  };
  is_following?: boolean;
  created_at: string;
}

export interface Comment {
  id: number;
  content: string;
  created_at: string;
  user: {
    uuid: string;
    name: string;
    username: string;
    avatar_url: string | null;
    reputation_level: string;
  };
  replies?: Comment[];
}
