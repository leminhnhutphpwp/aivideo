import { Loader2 } from 'lucide-react';

export default function LoadingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-[#FF5A1F]" />
        <p className="text-sm text-slate-500 font-medium">Đang tải...</p>
      </div>
    </div>
  );
}
