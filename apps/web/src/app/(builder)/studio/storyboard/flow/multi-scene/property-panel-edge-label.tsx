'use client';

import { inputC } from '../shared/style-constants';

interface PropertyPanelEdgeLabelProps {
  edgeLabel: string;
  onUpdateField: (field: string, value: any) => void;
}

export function PropertyPanelEdgeLabel({ edgeLabel, onUpdateField }: PropertyPanelEdgeLabelProps) {
  return (
    <div className="p-4 border-t border-white/[0.04]">
      <label className="text-[10px] font-semibold text-slate-400 mb-1.5 block">Nhãn kết nối</label>
      <input
        value={edgeLabel || ''}
        onChange={e => onUpdateField('edge_label', e.target.value)}
        placeholder="vd: Nhánh A, Phong cách B..."
        maxLength={255}
        className={inputC}
      />
    </div>
  );
}
