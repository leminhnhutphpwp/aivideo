'use client';

interface BarChartProps {
  data: { label: string; value: number }[];
  height?: number;
  maxValue?: number;
}

export function BarChart({ data, height = 160, maxValue }: BarChartProps) {
  const max = maxValue ?? Math.max(...data.map(d => d.value), 1);
  return (
    <div className="flex items-end gap-2 md:gap-3" style={{ height }}>
      {data.map((d) => (
        <div key={d.label} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
          <span className="text-[10px] font-bold text-slate-500">{d.value}</span>
          <div
            className="w-full rounded-md bg-[#FF5A1F]/20 hover:bg-[#FF5A1F]/40 transition-all relative overflow-hidden"
            style={{ height: `${(d.value / max) * 100}%`, minHeight: 4 }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-[#FF5A1F] to-[#FF5A1F]/40 rounded-md" />
          </div>
          <span className="text-[9px] font-medium text-slate-600 truncate w-full text-center">{d.label}</span>
        </div>
      ))}
    </div>
  );
}
