'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Film, Image as ImageIcon, X, Play } from 'lucide-react';
import { daemon, laravel } from '@/lib/api/client';
import { useAuthStore } from '@/stores/auth-store';
import { useDaemonStore, initDaemonCheck } from '@/stores/daemon-store';
import { useToastStore } from '@/stores/toast-store';
import { t } from '@/lib/i18n';
import {
  FALLBACK_PRESETS, PRESET_ICON_MAP, STYLE_SUGGESTIONS,
  STYLE_OPTIONS, MOOD_OPTIONS, CAMERA_OPTIONS, LIGHTING_OPTIONS,
  sortSkillsByPopularity,
  type DirectionPreset,
} from '@/components/studio/options';
import { VideoLayout } from '@/components/studio/video/video-layout';
import { type VideoScene, type VideoFeature } from '@/components/studio/video/types';
import { VideoPresets } from '@/components/studio/video/video-presets';
import { VideoSceneEditor } from '@/components/studio/video/video-scene-editor';
import { VideoSidebar } from '@/components/studio/video/video-sidebar';
import { ReferencePicker } from '@/components/studio/reference-picker';

interface FeatureConfig {
  capability: string;
  showLastFrame: boolean;
  maxUploadMB: number;
  acceptTypes: string;
  requireRefImage: boolean;
  requireRefText?: string;
}

const FEATURE_CONFIG: Record<string, FeatureConfig> = {
  'text-to-video': {
    capability: 't2v', showLastFrame: false,
    maxUploadMB: 16, acceptTypes: 'image/*', requireRefImage: false,
  },
  'image-to-video': {
    capability: 'i2v', showLastFrame: true,
    maxUploadMB: 16, acceptTypes: 'image/*', requireRefImage: true,
    requireRefText: 'Vui lòng tải ảnh tham chiếu cho ít nhất một cảnh',
  },
  'reference-to-video': {
    capability: 'r2v', showLastFrame: true,
    maxUploadMB: 200, acceptTypes: 'image/*,video/*', requireRefImage: true,
    requireRefText: 'Vui lòng tải ảnh/video tham chiếu cho ít nhất một cảnh',
  },
  'video-edit': {
    capability: 'video-edit', showLastFrame: false,
    maxUploadMB: 100, acceptTypes: 'video/*,image/*', requireRefImage: false,
  },
  'video-editing': {
    capability: 'video-edit', showLastFrame: false,
    maxUploadMB: 100, acceptTypes: 'video/*,image/*', requireRefImage: false,
  },
  'character-animation': {
    capability: 'character-anim', showLastFrame: false,
    maxUploadMB: 200, acceptTypes: 'image/*,video/*', requireRefImage: true,
    requireRefText: 'Vui lòng tải ảnh nhân vật và video tham chiếu chuyển động',
  },
};

function genId() { return Math.random().toString(36).slice(2, 9); }
function newScene(): VideoScene {
  return { id: genId(), prompt: '', duration: 8, style: '', mood: '', camera: '', lighting: '', negativePrompt: '', referenceImage: '', referencePreview: '', lastFrameImage: '', lastFramePreview: '' };
}

export default function VideoFeaturePage() {
  const params = useParams();
  const feature = (params.feature as string) || 'text-to-video';
  const config = FEATURE_CONFIG[feature] || FEATURE_CONFIG['text-to-video'];
  const router = useRouter();
  const addToast = useToastStore(s => s.addToast);
  const [aspect, setAspect] = useState('16:9');
  const [aspects, setAspects] = useState<string[]>(['16:9', '9:16', '1:1', '4:3']);
  const [resolution, setResolution] = useState('720p');
  const [resolutions, setResolutions] = useState<{ code: string; name: string; multiplier: number; }[]>([]);
  const [durations, setDurations] = useState<number[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerSceneId, setPickerSceneId] = useState<string | null>(null);
  const [pickerTarget, setPickerTarget] = useState<'firstFrame' | 'lastFrame'>('firstFrame');
  const daemonOk = useDaemonStore(s => s.ok);
  const [generating, setGenerating] = useState(false);
  const [directionPresets, setDirectionPresets] = useState<DirectionPreset[]>(FALLBACK_PRESETS);
  const [selectedPresetId, setSelectedPresetId] = useState<string>('none');
  const [scene, setScene] = useState<VideoScene>(newScene());
  const referenceFilesRef = useRef<Map<string, { file: File; target: 'firstFrame' | 'lastFrame' }>>(new Map());
  const voiceInputRef = useRef<HTMLInputElement>(null);
  const voiceIndexRef = useRef<number>(-1);
  const [multiReferenceFiles, setMultiReferenceFiles] = useState<File[]>([]);
  const [multiReferencePreviews, setMultiReferencePreviews] = useState<string[]>([]);
  const [referenceVoices, setReferenceVoices] = useState<Record<number, File>>({});
  const [editReferenceFiles, setEditReferenceFiles] = useState<File[]>([]);
  const [editReferencePreviews, setEditReferencePreviews] = useState<string[]>([]);
  const [audioSetting, setAudioSetting] = useState<'auto' | 'origin'>('auto');
  const [animateVideoFile, setAnimateVideoFile] = useState<File | null>(null);
  const [animateVideoPreview, setAnimateVideoPreview] = useState<string>('');
  const [animateMode, setAnimateMode] = useState<'wan-std' | 'wan-pro'>('wan-std');
  const animateVideoInputRef = useRef<HTMLInputElement>(null);
  const [priceData, setPriceData] = useState<any>(null);
  const [priceLoading, setPriceLoading] = useState(false);
  const [priceError, setPriceError] = useState<string | null>(null);
  const priceAbortRef = useRef<AbortController | null>(null);

  const hasPrompt = !!scene.prompt.trim();

  useEffect(() => {
    initDaemonCheck();
    daemon.models().then((data: any) => {
      if (data.aspects) setAspects(data.aspects);
    }).catch(() => {});

    // Load duration tiers from backend (single source of truth)
    laravel.pricingDurations().then((durationsData: { code: string; seconds: number; name: string }[]) => {
      const seconds = durationsData.map(d => d.seconds);
      setDurations(seconds);
      setScene(prev => {
        if (seconds.includes(prev.duration)) return prev;
        const closest = seconds.reduce((a: number, b: number) =>
          Math.abs(b - prev.duration) < Math.abs(a - prev.duration) ? b : a, seconds[0] || prev.duration
        );
        return { ...prev, duration: closest };
      });
    }).catch(() => {});
    // Load direction skills + popularity stats together (one stats call, no N+1).
    // Stats are JWT-only (studio is authenticated); on failure we keep default order.
    Promise.all([
      daemon.skills(),
      daemon.skillsStats().catch(() => ({})),
    ]).then(([data, stats]: [any, any]) => {
      const dirs = data.video_directions || [];
      if (dirs.length > 0) {
        let presets: DirectionPreset[] = dirs.map((d: any) => ({
          id: d.id, label: d.label, desc: d.desc,
          icon: PRESET_ICON_MAP[d.id] || Film,
          style: ({ cinematic: 'Cinematic', explainer: 'Minimalist', 'motion-graphics': 'Oil Painting', 'product-reveal': 'Realistic', 'social-ad': 'Minimalist', 'food': 'Realistic', 'travel': 'Cinematic', 'event': 'Cinematic', 'review': 'Realistic', 'beauty': 'Realistic', 'none': '' } as Record<string,string>)[d.id] || 'Cinematic',
          mood: d.moodTones?.[0] || 'Dramatic', camera: d.cameraPresets?.[0] || 'Fixed',
          lighting: d.lightingPresets?.[0] || 'Natural', aspectHints: d.aspectHints,
          moodTones: d.moodTones, cameraPresets: d.cameraPresets, lightingPresets: d.lightingPresets,
          examplePrompt: d.examplePrompt || '',
          examplePromptVi: d.examplePromptVi || '',
        }));
        // Surface the most-used / most-liked directions first; "none" stays pinned last
        // (existing convention for the video builder).
        presets = sortSkillsByPopularity(presets, stats, (p) => p.id, 'end');
        setDirectionPresets(presets);
      }
    }).catch(() => {});
    // Fetch resolutions from pricing config
    const videoTypeMap: Record<string, string> = {
      'text-to-video': 'text_to_video',
      'image-to-video': 'image_to_video',
      'reference-to-video': 'reference_to_video',
      'video-edit': 'video_edit',
      'video-editing': 'video_edit',
      'character-animation': 'character_animation',
    };
    const vt = videoTypeMap[feature] || 'text_to_video';
    laravel.pricingConfig(vt).then((data: any) => {
      if (data.resolutions?.length) {
        setResolutions(data.resolutions);
        if (data.resolutions.length > 0 && !data.resolutions.find((r: any) => r.code === resolution)) {
          setResolution(data.resolutions[0].code);
        }
      }
    }).catch(() => {});
  }, [feature, config.capability]);

  // Price calculation with debounce
  useEffect(() => {
    if (!hasPrompt || durations.length === 0) {
      setPriceData(null);
      setPriceError(null);
      return;
    }

    const timer = setTimeout(() => {
      const durationSec = scene.duration;
      const closestDuration = durations.reduce((prev, curr) =>
        Math.abs(curr - durationSec) < Math.abs(prev - durationSec) ? curr : prev
      );
      const durationCode = `${closestDuration}s`;

      // Map feature to video_type
      const videoTypeMap: Record<string, string> = {
        'text-to-video': 'text_to_video',
        'image-to-video': 'image_to_video',
        'reference-to-video': 'reference_to_video',
        'video-edit': 'video_edit',
        'video-editing': 'video_edit',
        'character-animation': 'character_animation',
      };
      const videoType = videoTypeMap[feature] || 'text_to_video';

      // Abort previous request
      if (priceAbortRef.current) {
        priceAbortRef.current.abort();
      }
      priceAbortRef.current = new AbortController();

      setPriceLoading(true);
      setPriceError(null);

      laravel.pricingCalculate({
        video_type: videoType,
        duration: durationCode,
        resolution: resolution,
        quality: feature === 'character-animation' && animateMode === 'wan-pro' ? 'premium' : 'standard',
        quantity: 1,
        // voiceover priced separately — post-generation
      }).then((res: any) => {
        setPriceData(res);
      }).catch((err: any) => {
        if (err.name !== 'AbortError') {
          setPriceError(err.message || 'Không thể tính giá');
        }
      }).finally(() => {
        setPriceLoading(false);
      });
    }, 600);

    return () => clearTimeout(timer);
  }, [hasPrompt, scene.duration, feature, resolution, durations, animateMode]);

  const updateScene = (field: string, value: any) =>
    setScene(prev => ({ ...prev, [field]: value }));

  const applyPreset = (_id: string, preset: DirectionPreset) => {
    setSelectedPresetId(preset.id);
    updateScene('style', preset.style);
    updateScene('mood', preset.mood);
    updateScene('camera', preset.camera);
    updateScene('lighting', preset.lighting);
    if (preset.aspectHints?.length && !preset.aspectHints.includes(aspect)) setAspect(preset.aspectHints[0]);
  };
  const isActivePreset = (preset: DirectionPreset) => selectedPresetId === preset.id;

  const selectedPreset = directionPresets.find(p => p.id === selectedPresetId);
  const suggestedStyles = STYLE_SUGGESTIONS[selectedPresetId!];
  const filteredStyleOptions = selectedPreset && selectedPresetId !== 'none' && suggestedStyles?.length
    ? STYLE_OPTIONS.filter(o => suggestedStyles.includes(o.value)) : STYLE_OPTIONS;
  const filteredMoodOptions = selectedPreset && selectedPresetId !== 'none' && selectedPreset.moodTones?.length
    ? MOOD_OPTIONS.filter(o => selectedPreset.moodTones!.includes(o.value)) : MOOD_OPTIONS;
  const filteredCameraOptions = selectedPreset && selectedPresetId !== 'none' && selectedPreset.cameraPresets?.length
    ? CAMERA_OPTIONS.filter(o => selectedPreset.cameraPresets!.includes(o.value)) : CAMERA_OPTIONS;
  const filteredLightingOptions = selectedPreset && selectedPresetId !== 'none' && selectedPreset.lightingPresets?.length
    ? LIGHTING_OPTIONS.filter(o => selectedPreset.lightingPresets!.includes(o.value)) : LIGHTING_OPTIONS;

  const handleOpenPicker = (sceneId: string, target: 'firstFrame' | 'lastFrame') => {
    setPickerSceneId(sceneId);
    setPickerTarget(target);
    setPickerOpen(true);
  };

  const addMultiReference = (file: File) => {
    setMultiReferenceFiles(prev => [...prev, file]);
    const previewUrl = file.type.startsWith('video/') || file.type.startsWith('image/') ? URL.createObjectURL(file) : '';
    setMultiReferencePreviews(prev => [...prev, previewUrl]);
  };

  const addEditReference = (file: File) => {
    if (editReferenceFiles.length >= 4) {
      addToast('Tối đa 4 ảnh tham chiếu', 'warning');
      return;
    }
    setEditReferenceFiles(prev => [...prev, file]);
    setEditReferencePreviews(prev => [...prev, URL.createObjectURL(file)]);
  };

  const removeEditReference = (index: number) => {
    setEditReferenceFiles(prev => prev.filter((_, i) => i !== index));
    setEditReferencePreviews(prev => {
      const url = prev[index];
      if (url) URL.revokeObjectURL(url);
      return prev.filter((_, i) => i !== index);
    });
  };

  const addMultiReferenceFromAsset = async (asset: any) => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
      const res = await fetch(asset.downloadUrl || asset.previewUrl, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const file = new File([blob], asset.name, { type: asset.mime || blob.type });
      addMultiReference(file);
    } catch (err: any) {
      addToast(`Lỗi tải tài nguyên: ${err.message}`, 'error');
    }
  };

  const handlePickerSelect = async (fileOrAsset: File | any) => {
    // Multi-ref mode (picker opened directly, not via handleOpenPicker)
    const isMultiRef = (feature === 'reference-to-video' || feature === 'video-edit' || feature === 'video-editing') && !pickerSceneId;
    if (isMultiRef) {
      if (fileOrAsset instanceof File) {
        if (feature === 'reference-to-video') {
          addMultiReference(fileOrAsset);
        } else {
          addEditReference(fileOrAsset);
        }
      } else if (fileOrAsset.id && fileOrAsset.previewUrl) {
        if (feature === 'reference-to-video') {
          await addMultiReferenceFromAsset(fileOrAsset);
        } else {
          addToast('Chọn ảnh tham chiếu từ thư viện', 'info');
          try {
            const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
            const res = await fetch(fileOrAsset.downloadUrl || fileOrAsset.previewUrl, {
              headers: token ? { Authorization: `Bearer ${token}` } : {},
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const blob = await res.blob();
            const file = new File([blob], fileOrAsset.name, { type: fileOrAsset.mime || blob.type });
            addEditReference(file);
          } catch (err: any) {
            addToast(`Lỗi tải tài nguyên: ${err.message}`, 'error');
          }
        }
      }
      setPickerOpen(false);
      return;
    }

    const sceneId = pickerSceneId;
    if (!sceneId) return;

    // If it's a File (from Upload tab), store for later upload during generate
    if (fileOrAsset instanceof File) {
      const file = fileOrAsset;
      const previewField = pickerTarget === 'lastFrame' ? 'lastFramePreview' : 'referencePreview';
      const imageField = pickerTarget === 'lastFrame' ? 'lastFrameImage' : 'referenceImage';
      updateScene(previewField, URL.createObjectURL(file));
      updateScene(imageField, file.name);
      referenceFilesRef.current.set(`${sceneId}:${pickerTarget}`, { file, target: pickerTarget });
      addToast('File đã chọn, sẽ tải lên khi tạo video', 'info');
      setPickerOpen(false);
      return;
    }

    // If it's an AssetItem (from Library tab), download and store
    if (fileOrAsset.id && fileOrAsset.previewUrl) {
      const asset = fileOrAsset;
      addToast('Đang tải tài nguyên...', 'info');
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
        const res = await fetch(asset.downloadUrl || asset.previewUrl, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const blob = await res.blob();
        const file = new File([blob], asset.name, { type: asset.mime || blob.type });

        const previewField = pickerTarget === 'lastFrame' ? 'lastFramePreview' : 'referencePreview';
        const imageField = pickerTarget === 'lastFrame' ? 'lastFrameImage' : 'referenceImage';
        updateScene(previewField, URL.createObjectURL(file));
        updateScene(imageField, asset.name);
        referenceFilesRef.current.set(`${sceneId}:${pickerTarget}`, { file, target: pickerTarget });
        addToast('Đã chọn tài nguyên', 'success');
      } catch (err: any) {
        addToast(`Lỗi tải tài nguyên: ${err.message}`, 'error');
      }
      setPickerOpen(false);
    }
  };

  const removeMultiReference = (index: number) => {
    setMultiReferenceFiles(prev => prev.filter((_, i) => i !== index));
    setMultiReferencePreviews(prev => {
      const url = prev[index];
      if (url) URL.revokeObjectURL(url);
      return prev.filter((_, i) => i !== index);
    });
    setReferenceVoices(prev => {
      const next = { ...prev };
      delete next[index];
      // Re-index remaining voices
      const reindexed: Record<number, File> = {};
      let j = 0;
      for (const key of Object.keys(next)) {
        const k = parseInt(key);
        if (k > index) {
          reindexed[j] = next[k];
        } else if (k < index) {
          reindexed[k] = next[k];
        }
        j++;
      }
      return reindexed;
    });
  };

  const handleVoiceUpload = (index: number) => {
    voiceIndexRef.current = index;
    voiceInputRef.current?.click();
  };

  const handleVoiceFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const idx = voiceIndexRef.current;
    if (idx < 0) return;
    setReferenceVoices(prev => ({ ...prev, [idx]: file }));
    addToast(`Đã thêm voice cho entity ${idx + 1}: ${file.name}`, 'info');
    if (voiceInputRef.current) voiceInputRef.current.value = '';
  };

  const handleGenerate = async () => {
    if (!hasPrompt) { addToast('Vui lòng nhập prompt', 'warning'); return; }
    if (config.requireRefImage && feature === 'reference-to-video' && multiReferenceFiles.length === 0) {
      addToast(config.requireRefText || 'Vui lòng tải ảnh/video tham chiếu', 'warning');
      return;
    }
    if ((feature === 'video-edit' || feature === 'video-editing') && !scene.referenceImage) {
      addToast('Vui lòng tải video cần chỉnh sửa', 'warning');
      return;
    }
    if (feature === 'character-animation') {
      if (!scene.referenceImage) {
        addToast('Vui lòng tải ảnh nhân vật', 'warning');
        return;
      }
      if (!animateVideoFile) {
        addToast('Vui lòng tải video tham chiếu chuyển động', 'warning');
        return;
      }
    }
    if (config.requireRefImage && feature !== 'reference-to-video' && feature !== 'character-animation' && !scene.referenceImage) {
      addToast(config.requireRefText || 'Vui lòng tải ảnh tham chiếu', 'warning');
      return;
    }
    setGenerating(true);
    try {
      const project = await daemon.createProject({ name: scene.prompt.slice(0, 60), surface: 'video', skillId: feature });

      // R2V multi-ref flow
      if (feature === 'reference-to-video') {
        const imageFilenames: string[] = [];
        const voiceFilenames: string[] = [];
        for (let i = 0; i < multiReferenceFiles.length; i++) {
          try {
            const result = await daemon.uploadFile(project.id, multiReferenceFiles[i]);
            imageFilenames.push(result.files?.[0]?.name || result.filename || result.file || multiReferenceFiles[i].name);
          } catch (err: any) {
            addToast(`Lỗi upload file ${i + 1}: ${err.message}`, 'error');
          }
        }
        for (let i = 0; i < multiReferenceFiles.length; i++) {
          const voiceFile = referenceVoices[i];
          if (voiceFile) {
            try {
              const result = await daemon.uploadFile(project.id, voiceFile);
              voiceFilenames.push(result.files?.[0]?.name || result.filename || result.file || voiceFile.name);
            } catch (err: any) {
              addToast(`Lỗi upload voice ${i + 1}: ${err.message}`, 'error');
            }
          } else {
            voiceFilenames.push('');
          }
        }

        let lastFrameFilename: string | undefined;
        const lastRefFile = referenceFilesRef.current.get(`${scene.id}:lastFrame`);
        if (lastRefFile) {
          try {
            const result = await daemon.uploadFile(project.id, lastRefFile.file);
            lastFrameFilename = result.files?.[0]?.name || result.filename || result.file || lastRefFile.file.name;
          } catch (err: any) {
            addToast(`Lỗi upload last frame: ${err.message}`, 'error');
          }
        }
        referenceFilesRef.current.delete(`${scene.id}:lastFrame`);

        await daemon.generate(project.id, {
          capability: config.capability, prompt: scene.prompt, surface: 'video',
          aspect, length: scene.duration,
          style: scene.style || undefined, mood: scene.mood || undefined,
          camera: scene.camera || undefined, lighting: scene.lighting || undefined,
          negative_prompt: scene.negativePrompt || undefined,
          images: imageFilenames.length > 0 ? imageFilenames : undefined,
          voices: voiceFilenames.some(Boolean) ? voiceFilenames : undefined,
          last_frame: lastFrameFilename,
          ...(priceData?.calculation_id ? { calculation_id: priceData.calculation_id, expected_total: priceData.pricing?.total_credits ?? priceData.total } : {}),
        });
        router.push(`/projects/${project.id}`);
        return;
      }

      // Video-edit multi-ref flow
      if (feature === 'video-edit' || feature === 'video-editing') {
        const referenceFilenames: string[] = [];
        for (let i = 0; i < editReferenceFiles.length; i++) {
          try {
            const result = await daemon.uploadFile(project.id, editReferenceFiles[i]);
            referenceFilenames.push(result.files?.[0]?.name || result.filename || result.file || editReferenceFiles[i].name);
          } catch (err: any) {
            addToast(`Lỗi upload ảnh tham chiếu ${i + 1}: ${err.message}`, 'error');
          }
        }

        let videoFilename: string | undefined;
        const refFile = referenceFilesRef.current.get(`${scene.id}:firstFrame`);
        if (refFile) {
          try {
            const result = await daemon.uploadFile(project.id, refFile.file);
            videoFilename = result.files?.[0]?.name || result.filename || result.file || refFile.file.name;
          } catch (err: any) {
            addToast(`Lỗi upload video: ${err.message}`, 'error');
          }
        }
        referenceFilesRef.current.delete(`${scene.id}:firstFrame`);

        await daemon.generate(project.id, {
          capability: config.capability, prompt: scene.prompt, surface: 'video',
          length: scene.duration,
          style: scene.style || undefined, mood: scene.mood || undefined,
          camera: scene.camera || undefined, lighting: scene.lighting || undefined,
          negative_prompt: scene.negativePrompt || undefined,
          image: videoFilename,
          referenceImages: referenceFilenames.length > 0 ? referenceFilenames : undefined,
          audioSetting,
          metadata: { inputImage: videoFilename, images: referenceFilenames, lastFrameImage: undefined },
          ...(priceData?.calculation_id ? { calculation_id: priceData.calculation_id, expected_total: priceData.pricing?.total_credits ?? priceData.total } : {}),
        });
        router.push(`/projects/${project.id}`);
        return;
      }

      // Character animation: upload image (character) + video (motion reference)
      if (feature === 'character-animation') {
        let imageFilename: string | undefined;
        const refFile = referenceFilesRef.current.get(`${scene.id}:firstFrame`);
        if (refFile) {
          try {
            const result = await daemon.uploadFile(project.id, refFile.file);
            imageFilename = result.files?.[0]?.name || result.filename || result.file || refFile.file.name;
          } catch (err: any) {
            addToast(`Lỗi upload ảnh nhân vật: ${err.message}`, 'error');
          }
        }
        referenceFilesRef.current.delete(`${scene.id}:firstFrame`);

        let videoFilename: string | undefined;
        if (animateVideoFile) {
          try {
            const result = await daemon.uploadFile(project.id, animateVideoFile);
            videoFilename = result.files?.[0]?.name || result.filename || result.file || animateVideoFile.name;
          } catch (err: any) {
            addToast(`Lỗi upload video tham chiếu: ${err.message}`, 'error');
          }
        }

        if (animateVideoPreview) {
          URL.revokeObjectURL(animateVideoPreview);
          setAnimateVideoPreview('');
        }

        await daemon.generate(project.id, {
          capability: config.capability, prompt: scene.prompt, surface: 'video',
          aspect, length: scene.duration,
          style: scene.style || undefined, mood: scene.mood || undefined,
          camera: scene.camera || undefined, lighting: scene.lighting || undefined,
          negative_prompt: scene.negativePrompt || undefined,
          image: imageFilename,
          videoRef: videoFilename,
          mode: animateMode,
          metadata: { inputImage: imageFilename },
          ...(priceData?.calculation_id ? { calculation_id: priceData.calculation_id, expected_total: priceData.pricing?.total_credits ?? priceData.total } : {}),
        });
        router.push(`/projects/${project.id}`);
        return;
      }

      // Non-R2V single ref flow
      let imageFilename: string | undefined;
      let lastFrameFilename: string | undefined;

      const ffEntry = referenceFilesRef.current.get(`${scene.id}:firstFrame`);
      if (ffEntry) {
        try {
          const result = await daemon.uploadFile(project.id, ffEntry.file);
          imageFilename = result.files?.[0]?.name || result.filename || result.file || ffEntry.file.name;
        } catch (err: any) {
          addToast(`Lỗi upload ảnh: ${err.message}`, 'error');
        }
      }

      const lfEntry = referenceFilesRef.current.get(`${scene.id}:lastFrame`);
      if (lfEntry) {
        try {
          const result = await daemon.uploadFile(project.id, lfEntry.file);
          lastFrameFilename = result.files?.[0]?.name || result.filename || result.file || lfEntry.file.name;
        } catch (err: any) {
          addToast(`Lỗi upload last frame: ${err.message}`, 'error');
        }
      }

      referenceFilesRef.current.delete(`${scene.id}:firstFrame`);
      referenceFilesRef.current.delete(`${scene.id}:lastFrame`);

      await daemon.generate(project.id, {
        capability: config.capability, prompt: scene.prompt, surface: 'video',
        aspect, length: scene.duration,
        style: scene.style || undefined, mood: scene.mood || undefined,
        camera: scene.camera || undefined, lighting: scene.lighting || undefined,
        negative_prompt: scene.negativePrompt || undefined,
        image: imageFilename,
        last_frame: lastFrameFilename,
        metadata: { inputImage: imageFilename, lastFrameImage: lastFrameFilename },
        ...(priceData?.calculation_id ? { calculation_id: priceData.calculation_id, expected_total: priceData.pricing?.total_credits ?? priceData.total } : {}),
      });
      router.push(`/projects/${project.id}`);
    } catch (err: any) { addToast(err.message || t('studio.createFailed'), 'error'); }
    finally { setGenerating(false); }
  };

  const getDisabledNames = () => {
    const names: string[] = [];
    if (feature === 'reference-to-video') {
      names.push(...multiReferenceFiles.map(f => f.name));
    } else if (feature === 'video-edit' || feature === 'video-editing') {
      names.push(...editReferenceFiles.map(f => f.name));
    }
    if (scene.referenceImage) names.push(scene.referenceImage);
    if (scene.lastFrameImage) names.push(scene.lastFrameImage);
    if (animateVideoFile) names.push(animateVideoFile.name);
    return names;
  };

  return (
    <VideoLayout feature={feature as VideoFeature}>
      <div className="grid grid-cols-12 gap-6">
        {/* Sidebar first on mobile (order-first), then main content */}
        <div className="col-span-12 lg:col-span-4 order-first lg:order-last">
          <VideoSidebar aspect={aspect} aspects={aspects} onAspectChange={setAspect}
            resolution={resolution} resolutions={resolutions} onResolutionChange={setResolution}
            hasPrompt={hasPrompt} totalDuration={scene.duration}
            generating={generating} daemonOk={daemonOk} onGenerate={handleGenerate}
            feature={feature as VideoFeature}
            priceData={priceData} priceLoading={priceLoading} priceError={priceError} />
        </div>
        <div className="col-span-12 lg:col-span-8 space-y-5">
          <VideoPresets directionPresets={directionPresets} selectedPresetId={selectedPresetId}
            targetSceneId={scene.id} onApplyPreset={applyPreset} isActivePreset={isActivePreset} />
          <div className="space-y-4">
            <VideoSceneEditor scene={scene}
              filteredStyleOptions={filteredStyleOptions} filteredMoodOptions={filteredMoodOptions}
              filteredCameraOptions={filteredCameraOptions} filteredLightingOptions={filteredLightingOptions}
              durations={durations} feature={feature as VideoFeature}
              skillId={selectedPresetId}
              onUpdate={updateScene}
              onOpenPicker={handleOpenPicker}
              uploadingSceneId={pickerSceneId} />

            {feature === 'reference-to-video' && (
              <div className="bg-zinc-950 border border-white/5 rounded-2xl p-4 space-y-3">
                <label className="text-[10px] font-semibold text-slate-500 flex items-center gap-1">
                  <ImageIcon className="h-3 w-3" /> Ảnh/Video tham chiếu
                </label>
                <p className="text-[10px] text-slate-600 leading-relaxed">
                  Tải lên tối đa 5 ảnh/video. Trong prompt, bạn có thể gọi 'Video 1', 'Image 1' để tham chiếu đến từng entity.
                </p>
                {multiReferencePreviews.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {multiReferenceFiles.map((file, i) => {
                      const isImage = file.type.startsWith('image/');
                      const previewUrl = multiReferencePreviews[i];
                      return (
                        <div key={`${file.name}-${i}`} className="relative rounded-xl border border-white/10 overflow-hidden bg-white/[0.02] group">
                          {file.type.startsWith('video/') && previewUrl ? (
                            <div className="w-full aspect-square relative group/preview overflow-hidden bg-zinc-950">
                              <video src={previewUrl} className="w-full h-full object-cover" muted preload="metadata" />
                              <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/40 opacity-0 group-hover/preview:opacity-100 transition-opacity">
                                <div className="h-8 w-8 rounded-full bg-[#FF5A1F] flex items-center justify-center shadow-sm">
                                  <Play className="h-3.5 w-3.5 text-white fill-white ml-0.5" />
                                </div>
                              </div>
                            </div>
                          ) : isImage && previewUrl ? (
                            <img src={previewUrl} alt={file.name} className="w-full aspect-square object-cover" />
                          ) : (
                            <div className="w-full aspect-square flex items-center justify-center bg-white/[0.02]">
                              {file.type.startsWith('video/') ? <Film className="h-8 w-8 text-slate-600" /> : <ImageIcon className="h-8 w-8 text-slate-600" />}
                            </div>
                          )}
                          <span className="absolute top-1.5 left-1.5 bg-zinc-950/60 text-[10px] text-white px-1.5 py-0.5 rounded-md font-medium">
                            {file.type.startsWith('video/') ? `Video ${i + 1}` : `Image ${i + 1}`}
                          </span>
                          <button onClick={() => removeMultiReference(i)}
                            className="absolute top-1.5 right-1.5 h-6 w-6 rounded-full bg-zinc-950/60 flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-red-500 transition-all text-white/70 hover:text-white text-xs cursor-pointer">
                            ✕
                          </button>
                          <div className="p-2 border-t border-white/5 flex items-center gap-1">
                            <p className="text-[10px] font-medium text-white truncate flex-1">{file.name}</p>
                            <button onClick={() => handleVoiceUpload(i)}
                              className={`shrink-0 cursor-pointer h-6 px-1.5 rounded-md text-[9px] font-medium transition-all ${referenceVoices[i] ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-white/5 text-slate-500 hover:text-white border border-white/10'}`}
                              title={referenceVoices[i] ? `Voice: ${referenceVoices[i].name}` : 'Upload voice cho entity này'}>
                              {referenceVoices[i] ? '🎤' : '➕'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                <div className="flex gap-2">
                  {multiReferenceFiles.length > 0 && multiReferenceFiles.length < 5 && (
                    <button onClick={() => { setPickerSceneId(null); setPickerOpen(true); }}
                      className="flex items-center gap-2 h-10 px-4 rounded-xl border border-dashed border-white/10 bg-white/5 text-xs font-medium text-slate-400 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all cursor-pointer">
                      <ImageIcon className="h-4 w-4" /> Thêm tham chiếu
                    </button>
                  )}
                  {multiReferenceFiles.length === 0 && (
                    <button onClick={() => { setPickerSceneId(null); setPickerOpen(true); }}
                      className="flex items-center gap-2 h-10 px-4 rounded-xl border border-dashed border-[#FF5A1F]/30 bg-[#FF5A1F]/5 text-xs font-medium text-[#FF5A1F] hover:bg-[#FF5A1F]/10 hover:border-[#FF5A1F]/50 transition-all cursor-pointer">
                      <ImageIcon className="h-4 w-4" /> Chọn ảnh/video tham chiếu
                    </button>
                  )}
                </div>
              </div>
            )}

            {(feature === 'video-edit' || feature === 'video-editing') && (
              <div className="bg-zinc-950 border border-white/5 rounded-2xl p-4 space-y-3">
                <label className="text-[10px] font-semibold text-slate-500 flex items-center gap-1">
                  <ImageIcon className="h-3 w-3" /> Ảnh tham chiếu (tuỳ chọn, tối đa 4)
                </label>
                <p className="text-[10px] text-slate-600 leading-relaxed">
                  Thêm ảnh tham chiếu để AI hiểu rõ hơn về ngữ cảnh chỉnh sửa.
                </p>
                {editReferencePreviews.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {editReferenceFiles.map((file, i) => {
                      const isImage = file.type.startsWith('image/');
                      const previewUrl = editReferencePreviews[i];
                      return (
                        <div key={`${file.name}-${i}`} className="relative rounded-xl border border-white/10 overflow-hidden bg-white/[0.02] group">
                          {file.type.startsWith('video/') && previewUrl ? (
                            <div className="w-full aspect-square relative group/preview overflow-hidden bg-zinc-950">
                              <video src={previewUrl} className="w-full h-full object-cover" muted preload="metadata" />
                              <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/40 opacity-0 group-hover/preview:opacity-100 transition-opacity">
                                <div className="h-8 w-8 rounded-full bg-[#FF5A1F] flex items-center justify-center shadow-sm">
                                  <Play className="h-3.5 w-3.5 text-white fill-white ml-0.5" />
                                </div>
                              </div>
                            </div>
                          ) : isImage && previewUrl ? (
                            <img src={previewUrl} alt={file.name} className="w-full aspect-square object-cover" />
                          ) : (
                            <div className="w-full aspect-square flex items-center justify-center bg-white/[0.02]">
                              {file.type.startsWith('video/') ? <Film className="h-8 w-8 text-slate-600" /> : <ImageIcon className="h-8 w-8 text-slate-600" />}
                            </div>
                          )}
                          <span className="absolute top-1.5 left-1.5 bg-zinc-950/60 text-[10px] text-white px-1.5 py-0.5 rounded-md font-medium">
                            {file.type.startsWith('video/') ? `Video ${i + 1}` : `Image ${i + 1}`}
                          </span>
                          <button onClick={() => removeEditReference(i)}
                            className="absolute top-1.5 right-1.5 h-6 w-6 rounded-full bg-zinc-950/60 flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-red-500 transition-all text-white/70 hover:text-white text-xs cursor-pointer">
                            ✕
                          </button>
                          <div className="p-2 border-t border-white/5">
                            <p className="text-[10px] font-medium text-white truncate">{file.name}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                <div className="flex gap-2">
                  {editReferenceFiles.length < 4 && (
                    <button onClick={() => { setPickerSceneId(null); setPickerOpen(true); }}
                      className="flex items-center gap-2 h-10 px-4 rounded-xl border border-dashed border-white/10 bg-white/5 text-xs font-medium text-slate-400 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all cursor-pointer">
                      <ImageIcon className="h-4 w-4" /> {editReferenceFiles.length > 0 ? 'Thêm ảnh' : 'Chọn ảnh tham chiếu'}
                    </button>
                  )}
                </div>
                  <div className="border-t border-white/5 pt-3 space-y-3">
                  <label className="text-[10px] font-semibold text-slate-500">Âm thanh</label>
                  <p className="text-[10px] text-slate-600 leading-relaxed">Chọn "Có" để giữ nguyên audio gốc của video đầu vào. Chọn "Không" để AI tự tạo audio mới phù hợp với nội dung đã chỉnh sửa.</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">Giữ audio gốc</span>
                    <div className="flex gap-1">
                      <button onClick={() => setAudioSetting('origin')}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${audioSetting === 'origin' ? 'bg-[#FF5A1F]/15 text-[#FF5A1F]' : 'bg-white/5 text-slate-500 hover:text-white'}`}>Có</button>
                      <button onClick={() => setAudioSetting('auto')}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${audioSetting === 'auto' ? 'bg-[#FF5A1F]/15 text-[#FF5A1F]' : 'bg-white/5 text-slate-500 hover:text-white'}`}>Không</button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {feature === 'reference-to-video' && config.showLastFrame && (
              <div className="bg-zinc-950 border border-white/5 rounded-2xl p-4 space-y-3">
                <label className="text-[10px] font-semibold text-slate-500">First frame (tuỳ chọn)</label>
                {scene.lastFramePreview ? (
                  <div className="relative rounded-xl border border-white/10 overflow-hidden bg-white/[0.02] group max-w-[200px]">
                    <div className="w-full aspect-square relative overflow-hidden bg-zinc-950">
                      <img src={scene.lastFramePreview} alt="" className="w-full h-full object-cover" />
                    </div>
                    <button onClick={() => { updateScene('lastFrameImage', ''); updateScene('lastFramePreview', ''); }}
                      className="absolute top-1.5 right-1.5 h-6 w-6 rounded-full bg-zinc-950/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500 text-white/70 hover:text-white cursor-pointer">
                      <X className="h-3 w-3" />
                    </button>
                    <div className="p-2 border-t border-white/5">
                      <p className="text-[10px] font-medium text-white truncate">{scene.lastFrameImage || 'First frame'}</p>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => handleOpenPicker(scene.id, 'lastFrame')}
                    className="flex items-center gap-2 h-10 px-4 rounded-xl border border-dashed border-[#FF5A1F]/30 bg-[#FF5A1F]/5 text-xs font-medium text-[#FF5A1F] hover:bg-[#FF5A1F]/10 hover:border-[#FF5A1F]/50 transition-all cursor-pointer">
                    <ImageIcon className="h-4 w-4" /> Thêm first frame
                  </button>
                )}
              </div>
            )}

            {feature === 'character-animation' && (
              <div className="bg-zinc-950 border border-white/5 rounded-2xl p-4 space-y-3">
                <label className="text-[10px] font-semibold text-slate-500 flex items-center gap-1">
                  <Film className="h-3 w-3" /> Video tham chiếu chuyển động
                </label>
                <p className="text-[10px] text-slate-600 leading-relaxed">
                  Tải lên video chuyển động để làm mẫu cho nhân vật. MP4/AVI/MOV, 2-30s, tối đa 200MB.
                </p>
                {animateVideoPreview ? (
                  <div className="relative rounded-xl border border-white/10 overflow-hidden bg-white/[0.02] group max-w-[200px]">
                    <div className="w-full aspect-square relative group/preview overflow-hidden bg-zinc-950">
                      <video src={animateVideoPreview} className="w-full h-full object-cover" muted preload="metadata" />
                      <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/40 opacity-0 group-hover/preview:opacity-100 transition-opacity">
                        <div className="h-8 w-8 rounded-full bg-[#FF5A1F] flex items-center justify-center shadow-sm">
                          <Play className="h-3.5 w-3.5 text-white fill-white ml-0.5" />
                        </div>
                      </div>
                    </div>
                    <button onClick={() => { setAnimateVideoFile(null); setAnimateVideoPreview(''); }}
                      className="absolute top-1.5 right-1.5 h-6 w-6 rounded-full bg-zinc-950/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500 text-white/70 hover:text-white cursor-pointer">
                      <X className="h-3 w-3" />
                    </button>
                    <div className="p-2 border-t border-white/5">
                      <p className="text-[10px] font-medium text-white truncate">{animateVideoFile?.name || 'Video tham chiếu'}</p>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => animateVideoInputRef.current?.click()}
                    className="flex items-center gap-2 h-10 px-4 rounded-xl border border-dashed border-[#FF5A1F]/30 bg-[#FF5A1F]/5 text-xs font-medium text-[#FF5A1F] hover:bg-[#FF5A1F]/10 hover:border-[#FF5A1F]/50 transition-all cursor-pointer">
                    <Film className="h-4 w-4" /> Chọn video chuyển động
                  </button>
                )}
                <div className="border-t border-white/5 pt-3 space-y-3">
                  <label className="text-[10px] font-semibold text-slate-500">Chất lượng</label>
                  <p className="text-[10px] text-slate-600 leading-relaxed">Chọn chế độ tạo ảnh động cho nhân vật. Standard tạo nhanh với chất lượng cơ bản (15fps). Professional cho chuyển động mượt mà hơn (25fps) nhưng tốn nhiều credits hơn.</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">Chế độ tạo</span>
                    <div className="flex gap-1">
                      <button onClick={() => setAnimateMode('wan-std')}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${animateMode === 'wan-std' ? 'bg-[#FF5A1F]/15 text-[#FF5A1F]' : 'bg-white/5 text-slate-500 hover:text-white'}`}>Standard</button>
                      <button onClick={() => setAnimateMode('wan-pro')}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${animateMode === 'wan-pro' ? 'bg-[#FF5A1F]/15 text-[#FF5A1F]' : 'bg-white/5 text-slate-500 hover:text-white'}`}>Professional</button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <input ref={voiceInputRef} type="file" accept="audio/*" className="hidden" onChange={handleVoiceFileSelected} />
      <input ref={animateVideoInputRef} type="file" accept="video/*" className="hidden" onChange={(e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setAnimateVideoFile(file);
        setAnimateVideoPreview(URL.createObjectURL(file));
        if (animateVideoInputRef.current) animateVideoInputRef.current.value = '';
      }} />
      <ReferencePicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={handlePickerSelect}
        acceptTypes={
          feature === 'character-animation' ? 'image/*' :
          (feature === 'video-edit' || feature === 'video-editing') && !pickerSceneId ? 'image/*' :
          config.acceptTypes
        }
        maxSizeMB={config.maxUploadMB}
        featureLabel={feature === 'video-edit' || feature === 'video-editing' ? 'Video tham chiếu' : feature === 'reference-to-video' ? 'Tham chiếu' : 'Ảnh tham chiếu'}
        canUpload={(useAuthStore.getState().user as any)?.plan?.slug !== 'free'}
        multiSelect={(feature === 'reference-to-video' || feature === 'video-edit' || feature === 'video-editing') && !pickerSceneId}
        disabledNames={getDisabledNames()}
      />
    </VideoLayout>
  );
}
