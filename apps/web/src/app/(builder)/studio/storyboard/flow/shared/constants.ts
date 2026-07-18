export const ACCENT = '#FF5A1F';
export const COLORS = ['#FF5A1F', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#F97316'];

// "Ghép cảnh" (multi_scene) render mode is temporarily DISABLED for the initial launch
// (focus = One-Shot `single_flow` + Multi-Panel `storyboard_image`). The toggle renders it as
// "Sắp ra mắt" (disabled) and the `?mode=multi` URL param falls back to One-Shot.
// Backend mirrors this via config/storyboard.php → multi_scene_enabled (env
// STORYBOARD_MULTI_SCENE_ENABLED). ▶ To RE-ENABLE: flip this to true AND set the backend env.
// See worklog 2026-06-23-disable-multi-scene.md for the full re-enable checklist.
export const MULTI_SCENE_ENABLED = false;
