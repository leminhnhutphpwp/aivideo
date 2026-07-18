'use client';

import { laravel } from '@/lib/api/client';
import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';

interface SaveParams {
  editSb: any;
  title: string;
  nodes: any[];
  buildPayload: () => any;
  addToast: any;
  router: AppRouterInstance;
  renderMode?: string;
}

export async function handleSaveMulti({ editSb, title, nodes, buildPayload, addToast, router, renderMode }: SaveParams) {
  if (!title.trim()) { addToast('Vui lòng nhập tiêu đề', 'error'); return; }
  const minScenes = renderMode === 'storyboard_image' ? 1 : 2;
  if (nodes.length < minScenes) { addToast(renderMode === 'storyboard_image' ? 'Cần ít nhất 1 cảnh' : 'Cần ít nhất 2 cảnh', 'error'); return; }
  const p = buildPayload();
  if (editSb) {
    await laravel.updateStoryboard(editSb.uuid, p);
    addToast('Đã cập nhật', 'success');
    router.push('/studio/storyboard');
  } else {
    const r = await laravel.createStoryboard(p);
    addToast('Đã tạo storyboard', 'success');
    router.push(`/studio/storyboard/flow/${r.uuid}`);
  }
}
