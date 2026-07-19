export const LARAVEL_URL = process.env.NEXT_PUBLIC_LARAVEL_URL || 'http://localhost:8000';

export class ApiError extends Error {
  status: number;
  errors?: Record<string, string[]>;
  constructor(message: string, status: number, errors?: Record<string, string[]>) {
    super(message);
    this.status = status;
    this.errors = errors;
  }
}

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  const token = localStorage.getItem('auth_token');
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      localStorage.removeItem('auth_token');
      return null;
    }
  } catch {}
  return token;
}

let refreshPromise: Promise<boolean> | null = null;

async function tryRefreshToken(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    try {
      const token = getToken();
      if (!token) return false;
      const res = await fetch(`${LARAVEL_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      });
      if (!res.ok) return false;
      const json = await res.json();
      const newToken = json.data?.token;
      if (newToken) {
        localStorage.setItem('auth_token', newToken);
        return true;
      }
      return false;
    } catch {
      return false;
    } finally {
      refreshPromise = null;
    }
  })();
  return refreshPromise;
}

async function laravelRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  // Don't set Content-Type for FormData — browser sets it with boundary
  if (!(options?.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const url = `${LARAVEL_URL}/api${path}`;
  const res = await fetch(url, { headers, ...options });

  if (res.status === 401 && token && !path.startsWith('/auth/')) {
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      const newToken = getToken();
      if (newToken) headers['Authorization'] = `Bearer ${newToken}`;
      const retryRes = await fetch(url, { headers, ...options });
      if (retryRes.ok) return retryRes.json();
      const retryBody = await retryRes.json().catch(() => ({ message: retryRes.statusText }));
      throw new ApiError(retryBody.message || retryRes.statusText, retryRes.status, retryBody.errors);
    }
    localStorage.removeItem('auth_token');
    throw new ApiError('Phiên đăng nhập đã hết hạn', 401);
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: res.statusText }));
    throw new ApiError(body.message || body.error || res.statusText, res.status, body.errors);
  }
  if (res.status === 204) return null as T;
  return res.json();
}

export async function fetchRawFile(projectId: string, fileName: string): Promise<{ blobUrl: string; blob: Blob }> {
  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const url = `${LARAVEL_URL}/api/daemon/projects/${projectId}/raw/${fileName}`;
  const res = await fetch(url, { headers });
  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('auth_token');
      throw new ApiError('Phiên đăng nhập đã hết hạn', 401);
    }
    throw new ApiError(`File not found (${res.status})`, res.status);
  }
  const blob = await res.blob();
  const blobUrl = URL.createObjectURL(blob);
  return { blobUrl, blob };
}

// --- Laravel API ---
export interface EnhancePromptContext {
  surface?: 'video' | 'image';
  skill_id?: string;
  style?: string;
  mood?: string;
  camera?: string;
  lighting?: string;
  locale?: 'vi' | 'en';
}

export const laravel = {
  /** AI-rewrite a draft prompt into a stronger one (reusable across studio inputs). */
  enhancePrompt: (prompt: string, context: EnhancePromptContext = {}) =>
    laravelRequest<{ success: boolean; data: { enhanced_prompt: string; suggestions: string[] } }>(
      '/ai/enhance-prompt', { method: 'POST', body: JSON.stringify({ prompt, ...context }) }
    ).then(r => r.data),

  login: (email: string, password: string, remember?: boolean) =>
    laravelRequest<{ success: boolean; data: { user: any; token: string } }>(
      '/auth/login', { method: 'POST', body: JSON.stringify({ email, password, remember }) }
    ).then(r => ({ token: r.data.token, user: r.data.user })),

  register: (email: string, password: string, name: string, passwordConfirmation?: string) =>
    laravelRequest<{ success: boolean; data: { user: any; token: string } }>(
      '/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password, name, password_confirmation: passwordConfirmation || password }),
      }
    ).then(r => ({ token: r.data.token, user: r.data.user })),

  me: () =>
    laravelRequest<{ success: boolean; data: any }>('/auth/me').then(r => r.data),

  logout: () =>
    laravelRequest<{ success: boolean }>('/auth/logout', { method: 'POST' }),

  refresh: () =>
    laravelRequest<{ success: boolean; data: { token: string } }>(
      '/auth/refresh', { method: 'POST' }
    ).then(r => r.data.token),

  assets: () =>
    laravelRequest<any>('/assets'),

  uploadAsset: async (file: File): Promise<any> => {
    const token = getToken();
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const form = new FormData();
    form.append('file', file);
    const res = await fetch(`${LARAVEL_URL}/api/assets`, {
      method: 'POST',
      headers,
      body: form,
    });
    if (res.status === 401 && token) {
      const refreshed = await tryRefreshToken();
      if (refreshed) {
        const newToken = getToken();
        if (newToken) headers['Authorization'] = `Bearer ${newToken}`;
        const retryRes = await fetch(`${LARAVEL_URL}/api/assets`, {
          method: 'POST',
          headers,
          body: form,
        });
        if (retryRes.ok) return retryRes.json().then(r => r.data);
        const retryBody = await retryRes.json().catch(() => ({ message: retryRes.statusText }));
        throw new ApiError(retryBody.message || retryRes.statusText, retryRes.status, retryBody.errors);
      }
      localStorage.removeItem('auth_token');
      throw new ApiError('Phiên đăng nhập đã hết hạn', 401);
    }
    if (!res.ok) {
      const body = await res.json().catch(() => ({ message: res.statusText }));
      throw new ApiError(body.message || res.statusText, res.status, body.errors);
    }
    return res.json().then(r => r.data);
  },

  deleteAsset: (id: string) =>
    laravelRequest<any>(`/assets/${id}`, { method: 'DELETE' }).catch(e => {
      if (e.status === 204) return null;
      throw e;
    }),

  plans: () =>
    laravelRequest<{ success: boolean; data: any[] }>('/plans').then(r => r.data),

  creditsBalance: () =>
    laravelRequest<{ balance: number }>('/credits/balance'),

  creditsSettings: () =>
    laravelRequest<{ exchange_rate: number; min_purchase_amount: number; max_purchase_amount: number }>('/credits/settings'),

  creditsHistory: () =>
    laravelRequest<any[]>('/credits/history'),

  creditPacks: () =>
    laravelRequest<any[]>('/credits/packs'),

  creditsUpgrade: (planSlug: string) =>
    laravelRequest<{
      success: boolean;
      message: string;
      upgrade_transfer_code: string;
      current_plan: string;
      target_plan: string;
      bank: { bank: string; account: string; holder: string };
      amount: number;
      content: string;
      plan_expires_at: string;
      note: string;
    }>('/credits/upgrade', {
      method: 'POST',
      body: JSON.stringify({ plan_slug: planSlug }),
    }),

  creditsPurchase: (amount: number, couponCode?: string) =>
    laravelRequest<{ success: boolean; message: string; bank: { bank: string; account: string; holder: string }; amount: number; original_amount?: number; discount_amount?: number; content: string; credits_to_receive: number; note: string }>(
      '/credits/purchase', { method: 'POST', body: JSON.stringify({ amount, ...(couponCode ? { coupon_code: couponCode } : {}) }) }
    ),

  /** Nhập mã coupon tặng credits → cộng credits ngay. */
  redeemCoupon: (code: string) =>
    laravelRequest<{ success: boolean; message: string; credits_added: number; balance: number }>(
      '/coupons/redeem', { method: 'POST', body: JSON.stringify({ code }) }
    ),

  /** Preview mã giảm giá cho một số tiền nạp (checkout). */
  validateCoupon: (code: string, amount: number) =>
    laravelRequest<{ success: boolean; discount_amount: number; final_amount: number }>(
      '/coupons/validate', { method: 'POST', body: JSON.stringify({ code, amount }) }
    ),

  creditsUpgradeHistory: () =>
    laravelRequest<any>('/credits/upgrade-history'),

  pendingCreditsPurchases: () =>
    laravelRequest<{ data: Array<{ transfer_code: string; amount: number; credits: number; status: string; created_at: string; paid_at: string | null }> }>('/credits/pending-purchases'),

  forgotPassword: (email: string) =>
    laravelRequest<{ success: boolean; message: string }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  verifyResetCode: (email: string, code: string) =>
    laravelRequest<{ success: boolean; message: string; token: string }>('/auth/verify-reset-code', {
      method: 'POST',
      body: JSON.stringify({ email, code }),
    }),

  resetPassword: (email: string, token: string, password: string, passwordConfirmation?: string) =>
    laravelRequest<{ success: boolean; message: string }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({
        email,
        token,
        password,
        password_confirmation: passwordConfirmation || password,
      }),
    }),

  sendVerification: () =>
    laravelRequest<{ success: boolean; message: string; expires_in: number }>('/auth/send-verification', {
      method: 'POST',
    }),

  verifyEmail: (code: string) =>
    laravelRequest<{ success: boolean; message: string }>('/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ code }),
    }),

  updateProfile: (id: string, data: {
    name?: string; email?: string; phone_number?: string; date_of_birth?: string;
    gender?: string; address?: string; blood_type?: string;
  }) =>
    laravelRequest<{ success: boolean; data: any }>(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  changePassword: (currentPassword: string, newPassword: string) =>
    laravelRequest<{ success: boolean; message: string }>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({
        current_password: currentPassword,
        new_password: newPassword,
        new_password_confirmation: newPassword,
      }),
    }),

  uploadAvatar: (file: File) => {
    const formData = new FormData();
    formData.append('avatar', file);
    return laravelRequest<{ success: boolean; message: string; data: { avatar_url: string } }>('/settings/avatar', {
      method: 'POST',
      body: formData,
    });
  },

  loginHistory: (params?: { page?: number }) => {
    const qs = params ? '?' + new URLSearchParams({ page: String(params.page) }).toString() : '';
    return laravelRequest<{ data: any[]; meta: any }>(`/settings/login-history${qs}`);
  },

  revokeSession: (id: number) =>
    laravelRequest<{ success: boolean; message: string }>(`/settings/login-history/${id}`, {
      method: 'DELETE',
    }),

  notificationPreferences: () =>
    laravelRequest<{ success: boolean; data: Array<{ type: string; channel: string; enabled: boolean }> }>('/settings/notifications'),

  updateNotificationPreferences: (preferences: Array<{ type: string; channel: string; enabled: boolean }>) =>
    laravelRequest<{ success: boolean; message: string }>('/settings/notifications', {
      method: 'PUT',
      body: JSON.stringify({ preferences }),
    }),

  activityLogs: (params?: { page?: number; per_page?: number }) => {
    const qs = params ? '?' + new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([_, v]) => v != null).map(([k, v]) => [k, String(v)]))
    ).toString() : '';
    return laravelRequest<{ data: any[]; meta?: any }>(`/activity-logs${qs}`);
  },

  activityLogsStatistics: () =>
    laravelRequest<any>('/activity-logs/statistics'),

  getAssetPlayUrl: (uuid: string) =>
    laravelRequest<{ success: boolean; data: { url: string; expires_in: number } }>(`/assets/${uuid}/play`),

  getShowcase: () =>
    laravelRequest<{ success: boolean; data: { hero_video_url?: string | null; hero_stream_token?: string | null; items: any[] } }>('/showcase'),

  getAuthBg: () =>
    laravelRequest<{ success: boolean; data: { stream_token: string; type: 'video' | 'image'; mime_type: string } | null }>('/auth/bg'),

  fetchAuthBgBlob: async (token: string) => {
    const url = `${LARAVEL_URL}/api/auth/bg/stream/${token}`;
    const res = await fetch(url);
    if (!res.ok) throw new ApiError('Auth background không khả dụng', res.status);
    return URL.createObjectURL(await res.blob());
  },

  renderJobs: (daemonProjectId?: string) =>
    laravelRequest<any>(`/render-jobs${daemonProjectId ? `?daemon_project_id=${daemonProjectId}` : ''}`),

  createRenderJob: (data: {
    prompt: string;
    model?: string;
    duration_seconds: number;
    aspect_ratio?: string;
    resolution?: string;
    parameters?: Record<string, any>;
  }) =>
    laravelRequest<any>('/render-jobs', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  cancelRenderJob: (uuid: string) =>
    laravelRequest<any>(`/render-jobs/${uuid}/cancel`, { method: 'POST' }),

  cancelDaemonTask: (taskId: string) =>
    laravelRequest<any>(`/daemon/media/tasks/${taskId}/cancel`, { method: 'POST' }),

  // Daemon proxy (through Laravel, port 7456 is now closed)
  daemonHealth: () =>
    laravelRequest<{ status: string }>('/daemon/health'),

  paymentHistory: () =>
    laravelRequest<{ data: any[] }>('/payments').then(r => r.data || []),

  getGoogleRedirectUrl: () =>
    laravelRequest<{ success: boolean; data: { url: string } }>('/auth/google/redirect')
      .then(r => r.data.url),

  // --- Storyboards ---
  storyboards: (params?: { page?: number; per_page?: number; status?: string }) => {
    const qs = params ? '?' + new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([_, v]) => v != null).map(([k, v]) => [k, String(v)]))
    ).toString() : '';
    return laravelRequest<{ data: any[]; meta?: any }>(`/storyboards${qs}`);
  },

  createStoryboard: (data: {
    title: string;
    description?: string;
    video_type: string;
    quality_tier: string;
    voice_mood?: string;
    background_music?: string;
    voice?: string;
    style_guide?: Record<string, any>;
    shot_type?: string;
    multi_panel_image?: string;
    scenes: {
      _key?: string;
      parent_key?: string | null;
      edge_label?: string | null;
      position_x?: number;
      position_y?: number;
      prompt: string;
      duration_seconds: number;
      camera_movement?: string;
      lighting?: string;
      style?: string;
      mood?: string;
      negative_prompt?: string;
      reference_image?: string;
      last_frame_image?: string;
      narration?: string;
      aspect_ratio: string;
      resolution: string;
    }[];
    references?: {
      type: 'character' | 'product' | 'background';
      media_path: string;
      description?: string;
    }[];
  }) =>
    laravelRequest<{ data: any }>('/storyboards', {
      method: 'POST',
      body: JSON.stringify(data),
    }).then(r => r.data),

  storyboard: (uuid: string) =>
    laravelRequest<{ data: any }>(`/storyboards/${uuid}`).then(r => r.data),

  updateStoryboard: (uuid: string, data: any) =>
    laravelRequest<{ data: any }>(`/storyboards/${uuid}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }).then(r => r.data),

  deleteStoryboard: (uuid: string) =>
    laravelRequest<{ message: string }>(`/storyboards/${uuid}`, { method: 'DELETE' }),


  aiStoryboardDraft: (concept: string, videoType?: string) =>
    laravelRequest<{ data: { concept: string; scenes: any[] } }>('/storyboards/ai-draft', {
      method: 'POST',
      body: JSON.stringify({ concept, video_type: videoType || 'ugc_review' }),
    }).then(r => r.data),

  compilePrompt: (uuid: string) =>
    laravelRequest<{ data: { compiled_prompt: string; status: string } }>(`/storyboards/${uuid}/compile-prompt`, { method: 'POST' }).then(r => r.data),

  renderStoryboard: (uuid: string) =>
    laravelRequest<{ data: { status: string; message: string; scenes_queued: number; scenes_failed: number; estimated_completion: string } }>(`/storyboards/${uuid}/render`, {
      method: 'POST',
    }).then(r => r.data),

  cancelStoryboard: (uuid: string) =>
    laravelRequest<any>(`/storyboards/${uuid}/cancel`, { method: 'POST' }).then(r => r.data),

  retryStoryboard: (uuid: string) =>
    laravelRequest<{ data: any }>(`/storyboards/${uuid}/retry`, { method: 'POST' }).then(r => r.data),

  downloadStoryboard: (uuid: string) => {
    const token = getToken();
    return `${LARAVEL_URL}/api/storyboards/${uuid}/download`;
  },

  addVoiceover: (uuid: string, data: { voice: string; voiceover_text: string }) =>
    laravelRequest<{ data: { output_url: string; download_url: string } }>(
      `/storyboards/${uuid}/add-voiceover`,
      { method: 'POST', body: JSON.stringify(data) },
    ).then(r => r.data),

  generateMultiPanelImage: (uuid: string) =>
    laravelRequest<{ data: { multi_panel_image: string; status: string } }>(
      `/storyboards/${uuid}/generate-multi-panel-image`,
      { method: 'POST' },
    ).then(r => r.data),

  // Notifications
  notifications: (params?: { page?: number; per_page?: number }) => {
    const qs = params ? '?' + new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([_, v]) => v != null).map(([k, v]) => [k, String(v)]))
    ).toString() : '';
    return laravelRequest<any>(`/notifications${qs}`).then(res => {
      const items = res?.data?.items || [];
      const meta = {
        current_page: res?.data?.page || 1,
        last_page: res?.data?.last_page || 1,
        per_page: res?.data?.per_page || 20,
        total: res?.data?.total || items.length,
      };
      return { success: res?.success ?? true, data: items, meta };
    });
  },

  notificationsUnreadCount: () =>
    laravelRequest<any>('/notifications/unread-count')
      .then(r => {
        if (typeof r === 'number') return r;
        if (r?.data?.unread_count !== undefined) return r.data.unread_count;
        if (r?.unread_count !== undefined) return r.unread_count;
        return 0;
      }),

  notification: (id: string) =>
    laravelRequest<{ success: boolean; data: any }>(`/notifications/${id}`)
      .then(r => (r?.data ? { ...r, data: r.data } : r)),

  markNotificationRead: (id: string) =>
    laravelRequest<{ success: boolean; message: string }>(`/notifications/${id}/read`, { method: 'POST' }),

  markAllNotificationsRead: () =>
    laravelRequest<{ success: boolean; message: string }>('/notifications/read-all', { method: 'POST' }),

  // --- Pricing API v1 ---
  pricingConfig: (videoType?: string) =>
    laravelRequest<{ success: boolean; data: any; cached?: boolean; cache_ttl?: number }>(
      `/v1/pricing/config${videoType ? `?video_type=${encodeURIComponent(videoType)}` : ''}`
    ).then(r => r.data),

  pricingCalculate: (params: {
    video_type: string;
    duration: string;
    resolution: string;
    quality: string;
    provider?: string;
    provider_model?: string;
    addons?: string[];
    quantity?: number;
  }) =>
    laravelRequest<{
      success: boolean;
      data: any;
      calculation_id: string;
      valid_until: string;
    }>('/v1/pricing/calculate', {
      method: 'POST',
      body: JSON.stringify(params),
    }).then(r => ({
      ...r.data,
      calculation_id: r.calculation_id,
      valid_until: r.valid_until,
    })),

  pricingDurations: () =>
    laravelRequest<{ success: boolean; data: { code: string; seconds: number; name: string }[] }>(
      '/v1/pricing/durations'
    ).then(r => r.data),

  pricingValidate: (calculationId: string, expectedTotal: number) =>
    laravelRequest<{ success: boolean; data: any }>('/v1/pricing/validate', {
      method: 'POST',
      body: JSON.stringify({ calculation_id: calculationId, expected_total: expectedTotal }),
    }).then(r => r.data),

  // --- Community ---
  communityFeed: (params?: { q?: string; capability?: string; tag?: string; sort?: string; page?: number }) => {
    const qs = params ? '?' + new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([_, v]) => v != null).map(([k, v]) => [k, String(v)]))
    ).toString() : '';
    return laravelRequest<{ success: boolean; data: { items: any[]; page: number; per_page: number; total: number; last_page: number } }>(`/v1/community/assets${qs}`);
  },

  communityTrending: (period: 'day' | 'week' | 'month' = 'week') =>
    laravelRequest<{ success: boolean; data: any[] }>(`/v1/trending?period=${period}`),

  communityTrendingCreators: (period: 'day' | 'week' | 'month' = 'week') =>
    laravelRequest<{ success: boolean; data: any[] }>(`/v1/trending/creators?period=${period}`),

  communityUserProfile: (username: string) =>
    laravelRequest<{ success: boolean; data: any }>(`/v1/users/${username}`),

  communityUserAssets: (username: string, page?: number) => {
    const qs = page ? `?page=${page}` : '';
    return laravelRequest<{ success: boolean; data: { items: any[]; page: number; per_page: number; total: number; last_page: number } }>(`/v1/users/${username}/assets${qs}`);
  },

  communityLike: (uuid: string) =>
    laravelRequest<{ success: boolean; data: { liked: boolean; count: number } }>(`/render-jobs/${uuid}/like`, {
      method: 'POST',
    }),

  communityLikes: (page?: number) => {
    const qs = page ? `?page=${page}` : '';
    return laravelRequest<{ success: boolean; data: { items: any[]; page: number; per_page: number; total: number; last_page: number } }>(`/users/likes${qs}`);
  },

  communityPublish: (uuid: string, visibility: 'sharing' | 'public', tags: string[]) =>
    laravelRequest<import('./community-types').PublishResponse>(`/render-jobs/${uuid}/publish`, {
      method: 'PATCH',
      body: JSON.stringify({ visibility, tags }),
    }),

  communityUnpublish: (uuid: string) =>
    laravelRequest<{ success: boolean }>(`/render-jobs/${uuid}/unpublish`, {
      method: 'PATCH',
    }),

  communityTags: (q?: string) => {
    const qs = q ? `?q=${encodeURIComponent(q)}` : '';
    return laravelRequest<{ success: boolean; data: any[] }>(`/tags${qs}`).then(r => r.data);
  },

  communityUseAsset: (uuid: string) =>
    laravelRequest<{ success: boolean }>(`/render-jobs/${uuid}/use`, {
      method: 'POST',
    }),

  // --- Follow / Unfollow ---
  communityFollow: (username: string) =>
    laravelRequest<{ success: boolean; data: { following: boolean } }>(`/users/${username}/follow`, {
      method: 'POST',
    }),

  communityUnfollow: (username: string) =>
    laravelRequest<{ success: boolean; data: { following: boolean } }>(`/users/${username}/follow`, {
      method: 'DELETE',
    }),

  communityFollowers: (username: string) =>
    laravelRequest<{ success: boolean; data: any[] }>(`/v1/users/${username}/followers`),

  communityFollowing: (username: string) =>
    laravelRequest<{ success: boolean; data: any[] }>(`/v1/users/${username}/following`),

  // --- Comments ---
  communityComments: (uuid: string, limit = 20, offset = 0) =>
    laravelRequest<{ success: boolean; data: any[]; total: number; has_more: boolean }>(
      `/render-jobs/${uuid}/comments?limit=${limit}&offset=${offset}`
    ),

  communityAddComment: (uuid: string, content: string, parentId?: number) =>
    laravelRequest<{ success: boolean; data: any }>(`/render-jobs/${uuid}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content, parent_id: parentId }),
    }),

  communityDeleteComment: (commentId: number) =>
    laravelRequest<{ success: boolean }>(`/comments/${commentId}`, {
      method: 'DELETE',
    }),

  // --- Report ---
  communityReport: (uuid: string, reason: string, details?: string) =>
    laravelRequest<{ success: boolean; message: string }>(`/render-jobs/${uuid}/report`, {
      method: 'POST',
      body: JSON.stringify({ reason, details }),
    }),

  // --- Creator Search ---
  communitySearchCreators: (q: string) =>
    laravelRequest<{ success: boolean; data: any[] }>(`/v1/creators/search?q=${encodeURIComponent(q)}`),
  };

// --- Daemon API (qua Laravel proxy) ---
function daemonLaravel<T>(path: string, options?: RequestInit): Promise<T> {
  return laravelRequest<T>(`/daemon${path}`, options);
}

export const daemon = {
  health: () => daemonLaravel<{ status: string }>('/health'),
  version: () => daemonLaravel<{ version: string }>('/version'),
  models: () => daemonLaravel<{ surfaces: { video: string[]; image: string[]; audio: Record<string, string[]> }; aspects: string[]; videoLengthsSec: number[]; audioDurationsSec: number[] }>('/media/models'),
  skills: () => daemonLaravel<{ video_directions: any[]; image_directions?: any[]; storyboard: any }>('/media/skills'),
  // Popularity stats per skill (JWT-only). Returns a map keyed by skill id.
  // A skill missing from the map is treated as all-zero. Optionally scope to
  // specific skill ids to keep the payload small.
  skillsStats: (skillIds?: string[]) =>
    daemonLaravel<Record<string, { usage_count?: number; likes_count?: number; published_count?: number; last_used_at?: string | null }>>(
      `/media/skills/stats${skillIds?.length ? `?skill_ids=${encodeURIComponent(skillIds.join(','))}` : ''}`
    ),
  status: () => daemonLaravel<any>('/status'),

  listProjects: () =>
    daemonLaravel<{ projects: any[] }>('/projects').then(r => r.projects),

  createProject: (data: { name?: string; surface?: string; _temp?: boolean; skillId?: string; designSystemId?: string }) =>
    daemonLaravel<{ project: any }>('/projects', { method: 'POST', body: JSON.stringify(data) })
      .then(r => r.project),

  getProject: (id: string) =>
    daemonLaravel<{ project: any }>(`/projects/${id}`).then(r => r.project),

  updateProject: (id: string, data: any) =>
    daemonLaravel<any>(`/projects/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  listFiles: (projectId: string) =>
    daemonLaravel<{ files: any[] }>(`/projects/${projectId}/files`).then(r => r.files),

  retryGenerate: (projectId: string, params: { model?: string; prompt?: string; length?: number; aspect?: string }) =>
    daemonLaravel<any>(`/projects/${projectId}/retry`, { method: 'POST', body: JSON.stringify(params) }),

  deleteProject: (projectId: string) =>
    daemonLaravel<any>(`/projects/${projectId}`, { method: 'DELETE' }),

  generate: (projectId: string, params: {
    surface?: string; model?: string; capability?: string; prompt: string; aspect?: string;
    length?: number; duration?: number; image?: string; images?: string[]; voices?: string[]; last_frame?: string; voice?: string;
    audioKind?: string; language?: string; loop?: boolean;
    promptInfluence?: number; compositionDir?: string; metadata?: any; output?: string;
    style?: string; mood?: string; camera?: string; lighting?: string;
    negative_prompt?: string; direction?: string;
    referenceImages?: string[]; audioSetting?: string; watermark?: boolean;
    videoRef?: string;
    mode?: string;
    voiceover?: string;
    autoVoiceover?: boolean;
    /** Locks/varies the generation (DashScope range 0..2147483647). Enables reproducible restores. */
    seed?: number;
  }) =>
    daemonLaravel<{ taskId: string; status: string; startedAt: number }>(
      `/projects/${projectId}/media/generate`,
      { method: 'POST', body: JSON.stringify(params) }
    ),

  listTasks: (projectId: string) =>
    daemonLaravel<{ tasks: any[] }>(`/projects/${projectId}/media/tasks?includeDone=1`).then(r => r.tasks),

  getTask: (taskId: string) =>
    daemonLaravel<any>(`/media/tasks/${taskId}`),

  waitTask: (taskId: string, since?: number, timeoutMs?: number) =>
    daemonLaravel<any>(`/media/tasks/${taskId}/wait`, {
      method: 'POST', body: JSON.stringify({ since, timeoutMs }),
    }),

  providerConfig: () =>
    daemonLaravel<any>('/media/config'),

  updateProviderConfig: (data: { providers: Record<string, { apiKey?: string; baseUrl?: string }> }) =>
    daemonLaravel<any>('/media/config', {
      method: 'PUT', body: JSON.stringify(data),
    }),

  voices: () =>
    daemonLaravel<{ voices: { voiceId: string; name: string; provider?: string; labels?: Record<string, string>; previewUrl?: string }[]; provider?: string; available?: boolean }>('/media/voices'),

  voicesElevenLabs: () =>
    daemonLaravel<{ voices: { voiceId: string; name: string; category?: string; labels?: Record<string, string>; previewUrl?: string }[] }>('/media/providers/elevenlabs/voices'),

  ttsPreview: async (voice: string, text?: string): Promise<string> => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    const res = await fetch(`${LARAVEL_URL}/api/daemon/media/tts-preview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ voice, text: text || 'Xin chào' }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(body.error || res.statusText);
    }
    const blob = await res.blob();
    return URL.createObjectURL(blob);
  },

  deleteFile: (projectId: string, fileName: string) =>
    daemonLaravel<any>(`/projects/${projectId}/files/${encodeURIComponent(fileName)}`, { method: 'DELETE' }),

  uploadFile: async (projectId: string, file: File): Promise<any> => {
    const form = new FormData();
    form.append('file', file);
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    const res = await fetch(`${LARAVEL_URL}/api/daemon/projects/${projectId}/upload`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: res.statusText }));
      throw new ApiError(body.error || res.statusText, res.status);
    }
    return res.json();
  },
};
