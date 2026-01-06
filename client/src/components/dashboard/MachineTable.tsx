import { useNavigate } from 'react-router-dom';
import type { Machine } from '../../types';
import StatusBadge from '../common/StatusBadge';
import { MapPin, QrCode, Calendar, Eye } from 'lucide-react';

interface MachineTableProps {
  machines: Machine[];
}

export default function MachineTable({ machines }: MachineTableProps) {
  const navigate = useNavigate();

  if (machines.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Henüz makine bulunmuyor.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Makine Adı
            </th>
            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Konum
            </th>
            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              QR Kod
            </th>
            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Durum
            </th>
            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Arıza Sayısı
            </th>
            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Eklenme Tarihi
            </th>
            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              İşlemler
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {machines.map((machine) => (
            <tr
              key={machine.id}
              className="hover:bg-gray-50 transition-colors cursor-pointer"
              onClick={() => navigate(`/machines/${machine.id}`)}
            >
              <td className="py-4 px-4">
                <div>
                  <p className="font-medium text-gray-900">{machine.name}</p>
                  {machine.description && (
                    <p className="text-sm text-gray-500 mt-0.5">{machine.description}</p>
                  )}
                </div>
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
                <div className="flex items-center gap-1.5">
                  <QrCode className="h-4 w-4 text-gray-400" />
                  <code className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">
                    {machine.qrCode}
                  </code>
                </div>
              </td>
              <td className="py-4 px-4">
                <StatusBadge status={machine.status} />
              </td>
              <td className="py-4 px-4">
                <span className="text-sm text-gray-900 font-medium">
                  {machine.maintenanceLogCount}
                </span>
              </td>
              <td className="py-4 px-4">
                <div className="flex items-center gap-1.5 text-sm text-gray-600">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  {new Date(machine.createdAt).toLocaleDateString('tr-TR')}
                </div>
              </td>
              <td className="py-4 px-4">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/machines/${machine.id}`);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-brand-600 hover:text-brand-700 hover:bg-brand-50 rounded-lg transition-colors"
                >
                  <Eye className="h-4 w-4" />
                  Detay
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

