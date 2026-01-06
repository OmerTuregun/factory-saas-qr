import { useNavigate } from 'react-router-dom';
import { MapPin, Calendar, Edit, QrCode as QrCodeIcon, Trash2, Eye } from 'lucide-react';
import type { Machine } from '../../types';
import StatusBadge from '../common/StatusBadge';

interface MachineListItemProps {
  machine: Machine;
  onQRClick: () => void;
  onEditClick: () => void;
  onDeleteClick: () => void;
}

export default function MachineListItem({ machine, onQRClick, onEditClick, onDeleteClick }: MachineListItemProps) {
  const navigate = useNavigate();

  return (
    <tr className="hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0">
      <td className="py-4 px-4">
        <div className="flex items-center gap-3">
          {/* Status Dot */}
          <div className="flex-shrink-0">
            {machine.status === 'Active' && (
              <div className="h-3 w-3 bg-green-500 rounded-full" />
            )}
            {machine.status === 'UnderMaintenance' && (
              <div className="h-3 w-3 bg-orange-500 rounded-full" />
            )}
            {machine.status === 'Broken' && (
              <div className="h-3 w-3 bg-red-500 rounded-full animate-pulse" />
            )}
          </div>
          <div className="min-w-0">
            <p className="font-medium text-gray-900 truncate">{machine.name}</p>
            {machine.description && (
              <p className="text-sm text-gray-500 truncate">{machine.description}</p>
            )}
          </div>
        </div>
      </td>
      <td className="py-4 px-4">
        <StatusBadge status={machine.status} />
      </td>
      <td className="py-4 px-4">
        {machine.location ? (
          <div className="flex items-center gap-1.5 text-sm text-gray-600">
            <MapPin className="h-4 w-4 text-gray-400" />
            {machine.location}
          </div>
        ) : (
          <span className="text-sm text-gray-400">-</span>
        )}
      </td>
      <td className="py-4 px-4">
        <span className="text-sm text-gray-900 font-medium">
          {machine.maintenanceLogCount || 0}
        </span>
      </td>
      <td className="py-4 px-4">
        <div className="flex items-center gap-1.5 text-sm text-gray-600">
          <Calendar className="h-4 w-4 text-gray-400" />
          {new Date(machine.createdAt).toLocaleDateString('tr-TR', {
            day: '2-digit',
            month: 'short',
          })}
        </div>
      </td>
      <td className="py-4 px-4">
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onQRClick();
            }}
            className="p-2 text-gray-600 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors"
            title="QR Kodu Göster"
          >
            <QrCodeIcon className="h-4 w-4" />
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
            className="p-2 text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
            title="Detay"
          >
            <Eye className="h-4 w-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}

