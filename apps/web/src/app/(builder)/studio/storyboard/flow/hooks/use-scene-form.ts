'use client';

import { useState, useCallback } from 'react';
import type { Node } from '@xyflow/react';
import type { SceneFormData } from '@/lib/api/storyboard-types';

export function initForm(key: string): SceneFormData {
  return {
    _key: key,
    parent_key: null,
    prompt: '',
    duration_seconds: 5,
    camera_movement: '',
    lighting: '',
    style: '',
    mood: '',
    negative_prompt: '',
    reference_image: '',
    last_frame_image: '',
    narration: '',
    aspect_ratio: '16:9',
    resolution: '720p',
    edge_label: null,
    position_x: 200,
    position_y: 200,
  };
}

export function useSceneForm() {
  const [sceneFormData, setSceneFormData] = useState<Record<string, SceneFormData>>({});

  const updateField = useCallback((key: string, field: string, value: any) => {
    setSceneFormData((prev) => ({ ...prev, [key]: { ...prev[key], [field]: value } }));
  }, []);

  return { sceneFormData, setSceneFormData, updateField, initForm };
}
