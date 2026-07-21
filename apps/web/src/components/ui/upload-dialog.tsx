'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, UploadCloud, FileText, Image as ImageIcon, Film, Music, Box, Trash2, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { t } from '@/lib/i18n';

const MAX_FILE_SIZE_MB = 20;
const MAX_FILE_SIZE = MAX_FILE_SIZE_MB * 1024 * 1024;

const ALLOWED_MIME_TYPES = [
  'image/png', 'image/jpeg', 'image/jpg', 'image/webp',
  'video/mp4', 'video/webm', 'video/quicktime',
  'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/mpeg',
  'model/gltf-binary', 'model/gltf+json',
];

const ALLOWED_EXTENSIONS = [
  '.png', '.jpg', '.jpeg', '.webp',
  '.mp4', '.webm', '.mov',
  '.mp3', '.wav', '.ogg',
  '.glb', '.gltf',
];

interface FileEntry {
  file: File;
  id: string;
  preview: string | null;
  error: string | null;
}

interface UploadDialogProps {
  open: boolean;
  onClose: () => void;
  onUpload: (files: File[]) => Promise<void>;
}

function getFileIcon(mime: string) {
  if (mime.startsWith('image/')) return <ImageIcon className="h-5 w-5" />;
  if (mime.startsWith('video/')) return <Film className="h-5 w-5" />;
  if (mime.startsWith('audio/')) return <Music className="h-5 w-5" />;
  if (mime.startsWith('model/')) return <Box className="h-5 w-5" />;
  return <FileText className="h-5 w-5" />;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function UploadDialog({ open, onClose, onUpload }: UploadDialogProps) {
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keep a live ref to files so unmount cleanup can revoke previews without re-subscribing.
  const filesRef = useRef<FileEntry[]>([]);
  filesRef.current = files;

  const resetAndClose = useCallback(() => {
    if (uploading) return;
    files.forEach(f => { if (f.preview) URL.revokeObjectURL(f.preview); });
    setFiles([]);
    setDragOver(false);
    onClose();
  }, [uploading, onClose, files]);

  // Revoke any remaining object URLs if the dialog unmounts mid-selection.
  useEffect(() => () => {
    filesRef.current.forEach(f => { if (f.preview) URL.revokeObjectURL(f.preview); });
  }, []);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') resetAndClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, resetAndClose]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const validateFile = (file: File): string | null => {
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!ALLOWED_MIME_TYPES.includes(file.type) && !ALLOWED_EXTENSIONS.includes(ext)) {
      return t('upload.unsupportedType');
    }
    if (file.size > MAX_FILE_SIZE) {
      return t('upload.sizeExceeded');
    }
    return null;
  };

  const processFiles = useCallback((incoming: FileList | File[]) => {
    const newEntries: FileEntry[] = Array.from(incoming).map((file) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const error = validateFile(file);
      let preview: string | null = null;
      if (!error && file.type.startsWith('image/')) {
        preview = URL.createObjectURL(file);
      }
      return { file, id, preview, error };
    });
    setFiles(prev => [...prev, ...newEntries]);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length) {
      processFiles(e.dataTransfer.files);
    }
  }, [processFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      processFiles(e.target.files);
      e.target.value = '';
    }
  };

  const removeFile = (id: string) => {
    setFiles(prev => {
      const entry = prev.find(f => f.id === id);
      if (entry?.preview) URL.revokeObjectURL(entry.preview);
      return prev.filter(f => f.id !== id);
    });
  };

  const validFiles = files.filter(f => !f.error);
  const hasErrors = files.some(f => f.error);

  const handleUpload = async () => {
    if (!validFiles.length) return;
    setUploading(true);
    try {
      await onUpload(validFiles.map(f => f.file));
      files.forEach(f => { if (f.preview) URL.revokeObjectURL(f.preview); });
      setFiles([]);
      onClose();
    } finally {
      setUploading(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 bg-[#16141a]/60 backdrop-blur-sm"
            onClick={resetAndClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', stiffness: 400, damping: 35 }}
            className="relative w-[90vw] max-w-2xl bg-[#16141a] border border-white/12 rounded-2xl shadow-md flex flex-col max-h-[85vh]"
          >
            <div className="flex items-center justify-between p-6 pb-0">
              <div className="space-y-1">
                <h2 className="text-lg font-display font-semibold text-white tracking-tight">{t('upload.title')}</h2>
                <p className="text-xs text-slate-500 font-medium">{t('upload.subtitle')}</p>
              </div>
              <button onClick={resetAndClose} className="text-slate-400 hover:text-white transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => inputRef.current?.click()}
              className={`mx-8 mt-6 rounded-2xl border-2 border-dashed transition-all cursor-pointer ${
                dragOver
                  ? 'border-[#FF5A1F] bg-[#FF5A1F]/5'
                  : 'border-white/10 bg-[#16141a] hover:border-white/20'
              }`}
            >
              <input ref={inputRef} type="file" multiple className="hidden"
                accept={ALLOWED_MIME_TYPES.join(',')} onChange={handleInputChange} />
              <div className="flex flex-col items-center justify-center py-10 px-6 text-center">
                <div className={`h-14 w-14 rounded-2xl flex items-center justify-center mb-4 transition-all ${
                  dragOver ? 'bg-[#FF5A1F]/20 text-[#FF5A1F]' : 'bg-white/5 text-slate-400'
                }`}>
                  <UploadCloud className="h-7 w-7" />
                </div>
                <p className="text-sm font-semibold text-white mb-1">{t('upload.dropzone')}</p>
                <p className="text-[11px] text-slate-500 font-medium">{t('upload.orClick')}</p>
                <p className="text-[10px] text-slate-500 font-medium mt-3">
                  {t('upload.maxSize')}: {MAX_FILE_SIZE_MB}MB · {t('upload.allowedTypes')}: PNG, JPG, WebP, MP4, WebM, MOV, MP3, WAV, OGG, GLB, glTF
                </p>
              </div>
            </div>

            {files.length > 0 && (
              <div className="mx-8 mt-4 flex-1 overflow-y-auto custom-scrollbar space-y-2 min-h-0">
                {files.map(entry => (
                  <div key={entry.id}
                    className={`flex items-center gap-4 p-3 rounded-xl transition-all ${
                      entry.error ? 'bg-red-500/5 border border-red-500/10' : 'bg-white/[0.02] border border-white/12'
                    }`}>
                    {entry.preview ? (
                      <div className="h-12 w-12 rounded-lg overflow-hidden shrink-0 bg-[#16141a]">
                        <img src={entry.preview} alt="" className="h-full w-full object-cover" />
                      </div>
                    ) : (
                      <div className={`h-12 w-12 rounded-lg shrink-0 flex items-center justify-center ${
                        entry.error ? 'bg-red-500/10 text-red-400' : 'bg-white/5 text-slate-500'
                      }`}>
                        {getFileIcon(entry.file.type)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold truncate ${entry.error ? 'text-red-400' : 'text-white'}`}>
                        {entry.file.name}
                      </p>
                      <p className="text-[10px] text-slate-400 font-medium">
                        {formatSize(entry.file.size)}
                        {entry.error && <span className="text-red-400 ml-2">· {entry.error}</span>}
                      </p>
                    </div>
                    {entry.error ? (
                      <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
                    ) : (
                      <button onClick={(e) => { e.stopPropagation(); removeFile(entry.id); }}
                        className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-400 hover:bg-red-500/5 transition-all shrink-0">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between p-6 pt-6">
              <div className="text-[11px] text-slate-400 font-medium">
                {validFiles.length > 0
                  ? `${validFiles.length} ${t('upload.filesReady')}`
                  : t('upload.noFiles')}
              </div>
              <div className="flex items-center gap-3">
                <Button onClick={resetAndClose} variant="ghost"
                  className="h-10 px-6 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all text-sm font-semibold"
                  disabled={uploading}>
                  {t('common.cancel')}
                </Button>
                <Button onClick={handleUpload}
                  disabled={!validFiles.length || uploading}
                  className="h-10 px-8 rounded-xl bg-[#FF5A1F] hover:bg-[#FF6A2B] text-white font-bold text-sm tracking-tight shadow-sm shadow-[#FF5A1F]/20 transition-all disabled:opacity-50">
                  {uploading ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t('upload.uploading')}</>
                  ) : (
                    <><UploadCloud className="h-4 w-4 mr-2" />{t('upload.uploadButton')}</>
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
