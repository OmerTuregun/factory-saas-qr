import { useNavigate } from 'react-router-dom';
import { MapPin, Edit, QrCode, Trash2, Eye, Cpu, Wrench } from 'lucide-react';
import type { Machine } from '../../types';
import StatusBadge from '../common/StatusBadge';

interface MachineCardProps {
  machine: Machine;
  onQRClick: () => void;
  onEditClick: () => void;
  onDeleteClick: () => void;
}

export default function MachineCard({ machine, onQRClick, onEditClick, onDeleteClick }: MachineCardProps) {
  const navigate = useNavigate();

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 overflow-hidden group">
      {/* Header with subtle background */}
      <div className="bg-gradient-to-r from-gray-50 to-gray-100/50 px-5 py-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 truncate pr-3">
            {machine.name}
          </h3>
          <StatusBadge status={machine.status} className="flex-shrink-0" />
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        {/* Icon and Description */}
        <div className="flex gap-4 mb-4">
          {/* Machine Icon - Changed to Cpu for professional look */}
          <div className="flex-shrink-0">
            <div className="h-16 w-16 bg-gradient-to-br from-slate-100 to-slate-200 rounded-lg flex items-center justify-center shadow-inner">
              <Cpu className="h-9 w-9 text-slate-500" />
            </div>
          </div>

          {/* Description */}
          <div className="flex-1 min-w-0">
            {machine.description ? (
              <p className="text-sm text-gray-600 line-clamp-3">
                {machine.description}
              </p>
            ) : (
              <p className="text-sm text-gray-400 italic">
                Açıklama eklenmemiş
              </p>
            )}
          </div>
        </div>

        {/* Info Grid - QR Code removed */}
        <div className="space-y-2.5 mb-4 pb-4 border-b border-gray-100">
          {/* Location */}
          {machine.location ? (
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-gray-400 flex-shrink-0" />
              <span className="text-gray-700">{machine.location}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-gray-300 flex-shrink-0" />
              <span className="text-gray-400 italic">Konum belirtilmemiş</span>
            </div>
          )}

          {/* Maintenance Count */}
          <div className="flex items-center gap-2 text-sm">
            <Wrench className="h-4 w-4 text-gray-400 flex-shrink-0" />
            <span className="text-gray-700">
              {machine.maintenanceLogCount || 0} Arıza Kaydı
            </span>
          </div>
        </div>

        {/* Action Buttons Footer - Extended */}
        <div className="flex items-center justify-end gap-1.5">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onQRClick();
            }}
            className="p-2 text-gray-600 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors"
            title="QR Kodu Göster"
          >
            <QrCode className="h-4 w-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEditClick();
            }}
            className="p-2 text-gray-600 hover:bg-amber-50 hover:text-amber-600 rounded-lg transition-colors"
            title="Düzenle"
          >
            <Edit className="h-4 w-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDeleteClick();
            }}
            className="p-2 text-gray-600 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
            title="Sil"
          >
            <Trash2 className="h-4 w-4" />
          </button>
          <button
            onClick={() => navigate(`/machines/${machine.id}`)}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-brand-600 hover:bg-brand-50 rounded-lg transition-colors ml-1"
            title="Detayları Görüntüle"
          >
            <Eye className="h-4 w-4" />
            <span>Detay</span>
          </button>
        </div>
      </div>

      {/* Hover indicator (subtle gradient at bottom) */}
      <div className="h-1 bg-gradient-to-r from-brand-400 to-brand-600 opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );
}
