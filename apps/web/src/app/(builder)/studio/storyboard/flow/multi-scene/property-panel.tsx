'use client';

import { motion, AnimatePresence } from 'motion/react';
import { COLORS } from '../shared/constants';
import { PropertyPanelBasic } from './property-panel-basic';
import { PropertyPanelCamera } from './property-panel-camera';
import { PropertyPanelReference } from './property-panel-reference';
import { PropertyPanelEdgeLabel } from './property-panel-edge-label';
import type { Node } from '@xyflow/react';
import type { SceneFormData } from '@/lib/api/storyboard-types';

interface MultiScenePropertyPanelProps {
  selectedScene: SceneFormData | null;
  selectedNode: Node | null;
  hasIncomingEdge: boolean;
  selectedNodeId: string | null;
  sceneRefPreviews: Record<string, string>;
  onClose: () => void;
  openBasic: boolean; onToggleBasic: () => void;
  openCamera: boolean; onToggleCamera: () => void;
  openAudio: boolean; onToggleAudio: () => void;
  openRef: boolean; onToggleRef: () => void;
  updateField: (key: string, field: string, value: any) => void;
  openRefPicker: (nodeId: string, field: 'reference_image' | 'last_frame_image') => void;
  options: { durations: number[] };
  renderMode: 'multi_scene' | 'single_flow';
}

export function MultiScenePropertyPanel({
  selectedScene, selectedNode, hasIncomingEdge, selectedNodeId,
  sceneRefPreviews, onClose, openBasic, onToggleBasic, openCamera,
  onToggleCamera, openAudio, onToggleAudio, openRef, onToggleRef,
  updateField, openRefPicker, options, renderMode,
}: MultiScenePropertyPanelProps) {
  if (!selectedScene || !selectedNode || !selectedNodeId) return null;

  const sceneNumber = (selectedNode.data as any)?.sceneNumber || 1;
  const colorIndex = (sceneNumber - 1) % COLORS.length;
  const color = COLORS[colorIndex];

  return (
    <AnimatePresence>
      <>
        {/* Mobile backdrop */}
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 bg-zinc-950/70 backdrop-blur-sm z-30 md:hidden"
          onClick={onClose}
        />
        {/* Panel */}
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="border-l border-white/[0.04] bg-zinc-950/95 backdrop-blur-xl overflow-y-auto z-40 md:z-10
            fixed inset-0 md:relative md:inset-auto md:shrink-0
            md:w-[240px] lg:w-[300px]
            [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-white/10 hover:[&::-webkit-scrollbar-thumb]:bg-white/20 [&::-webkit-scrollbar-thumb]:rounded-full"
        >
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/[0.04]">
            <div className="flex items-center gap-2">
              <div
                className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold"
                style={{ backgroundColor: color + '22', color: color }}
              >
                {sceneNumber}
              </div>
              <span className="text-xs font-semibold text-white">Cảnh {sceneNumber}</span>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/[0.04] text-slate-600 text-[10px] cursor-pointer">✕</button>
          </div>

          <PropertyPanelBasic
            prompt={selectedScene.prompt}
            durationSeconds={selectedScene.duration_seconds}
            aspectRatio={selectedScene.aspect_ratio}
            resolution={selectedScene.resolution}
            durations={options.durations || []}
            renderMode={renderMode}
            onUpdateField={(field, value) => updateField(selectedNodeId, field, value)}
            open={openBasic}
            onToggle={onToggleBasic}
          />

          {renderMode === 'multi_scene' && (
            <PropertyPanelCamera
              cameraMovement={selectedScene.camera_movement}
              style={selectedScene.style}
              mood={selectedScene.mood}
              lighting={selectedScene.lighting}
              negativePrompt={selectedScene.negative_prompt}
              seed={selectedScene.seed}
              onUpdateField={(field, value) => updateField(selectedNodeId, field, value)}
              open={openCamera}
              onToggle={onToggleCamera}
            />
          )}

          {renderMode === 'multi_scene' && (
            <PropertyPanelReference
              referenceImage={selectedScene.reference_image}
              lastFrameImage={selectedScene.last_frame_image}
              refPreviewUrl={sceneRefPreviews[selectedNodeId]}
              onUpdateField={(field, value) => updateField(selectedNodeId, field, value)}
              onOpenRefPicker={(field) => openRefPicker(selectedNodeId, field)}
              hasRefImage={!!selectedScene.reference_image}
              open={openRef}
              onToggle={onToggleRef}
            />
          )}

          {hasIncomingEdge && (
            <PropertyPanelEdgeLabel
              edgeLabel={selectedScene.edge_label || ''}
              onUpdateField={(field, value) => updateField(selectedNodeId, field, value)}
            />
          )}
        </motion.div>
      </>
    </AnimatePresence>
  );
}
