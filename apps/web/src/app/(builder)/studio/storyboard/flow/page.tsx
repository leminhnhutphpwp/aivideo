'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { MultiSceneEditor } from './multi-scene/multi-scene-editor';

function FlowEditorInner() {
  const searchParams = useSearchParams();
  const editUuid = searchParams.get('id');
  const mode = searchParams.get('mode');
  return <MultiSceneEditor editUuid={editUuid} initialMode={mode} />;
}

export default function FlowEditorPage() {
  return (
    <Suspense fallback={null}>
      <FlowEditorInner />
    </Suspense>
  );
}
