'use client';

import { laravel } from '@/lib/api/client';
import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';

interface RenderParams {
  editSb: any;
  addToast: any;
  router: AppRouterInstance;
}

export async function handleRenderMulti({ editSb, addToast, router }: RenderParams) {
  try {
    await laravel.renderStoryboard(editSb.uuid);
    addToast('Đã bắt đầu render', 'success');
    router.push(`/studio/storyboard/flow/${editSb.uuid}`);
  } catch (e: any) {
    addToast(e?.message || 'Lỗi', 'error');
  }
}
