'use client';

import { useState, useCallback } from 'react';
import { daemon } from '@/lib/api/client';

interface ReferencePickerParams {
  setNodes: any;
  setSceneRefPreviews: any;
  setSceneFormData: any;
}

export function useReferencePicker({ setNodes, setSceneRefPreviews, setSceneFormData }: ReferencePickerParams) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<{ nodeId: string; field: 'reference_image' | 'last_frame_image' } | null>(null);

  const openRefPicker = useCallback((nodeId: string, field: 'reference_image' | 'last_frame_image') => {
    setPickerTarget({ nodeId, field });
    setPickerOpen(true);
  }, []);

  const handleRefSelect = useCallback(async (fileOrAsset: File | any) => {
    if (!pickerTarget) return;
    const { nodeId, field } = pickerTarget;

    if (fileOrAsset instanceof File) {
      const file = fileOrAsset;
      const preview = URL.createObjectURL(file);
      setNodes((nds: any[]) => nds.map(n => n.id === nodeId ? {
        ...n, data: {
          ...n.data,
          [field === 'reference_image' ? 'refPreview' : 'lastFramePreview']: preview,
          has_reference: field === 'reference_image' ? true : n.data.has_reference,
        },
      } : n));
      if (field === 'reference_image') {
        setSceneRefPreviews((prev: any) => ({ ...prev, [nodeId]: preview }));
      }
      try {
        const project = await daemon.createProject({ name: `ref-${nodeId}-${Date.now()}` });
        const result: any = await daemon.uploadFile(project.id, file);
        const filename = result.filename || result.name || file.name;
        setSceneFormData((prev: any) => ({ ...prev, [nodeId]: { ...prev[nodeId], [field]: filename } }));
        setNodes((nds: any[]) => nds.map(n => n.id === nodeId ? { ...n, data: { ...n.data, [field]: filename } } : n));
      } catch (e: any) {
        setSceneFormData((prev: any) => ({ ...prev, [nodeId]: { ...prev[nodeId], [field]: file.name } }));
      }
      setPickerOpen(false);
      setPickerTarget(null);
      return;
    }

    if (fileOrAsset.id && fileOrAsset.previewUrl) {
      const asset = fileOrAsset;
      try {
        const token = localStorage.getItem('auth_token');
        const res = await fetch(asset.downloadUrl || asset.previewUrl, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const blob = await res.blob();
          const file = new File([blob], asset.name, { type: asset.mime || blob.type });
          const preview = URL.createObjectURL(file);
          setNodes((nds: any[]) => nds.map(n => n.id === nodeId ? {
            ...n, data: {
              ...n.data,
              [field === 'reference_image' ? 'refPreview' : 'lastFramePreview']: preview,
              has_reference: field === 'reference_image' ? true : n.data.has_reference,
            },
          } : n));
          if (field === 'reference_image') {
            setSceneRefPreviews((prev: any) => ({ ...prev, [nodeId]: preview }));
          }
          const project = await daemon.createProject({ name: `ref-${nodeId}-${Date.now()}` });
          const result: any = await daemon.uploadFile(project.id, file);
          const filename = result.filename || result.name || asset.name;
          setSceneFormData((prev: any) => ({ ...prev, [nodeId]: { ...prev[nodeId], [field]: filename } }));
          setNodes((nds: any[]) => nds.map(n => n.id === nodeId ? { ...n, data: { ...n.data, [field]: filename } } : n));
        } else {
          setSceneFormData((prev: any) => ({ ...prev, [nodeId]: { ...prev[nodeId], [field]: asset.name } }));
        }
      } catch {
        setSceneFormData((prev: any) => ({ ...prev, [nodeId]: { ...prev[nodeId], [field]: asset.name } }));
      }
    }

    setPickerOpen(false);
    setPickerTarget(null);
  }, [pickerTarget, setNodes, setSceneRefPreviews, setSceneFormData]);

  return { pickerOpen, setPickerOpen, pickerTarget, setPickerTarget, openRefPicker, handleRefSelect };
}
