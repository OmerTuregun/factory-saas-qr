import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import {
  ArrowLeft,
  Download,
  Printer,
  MapPin,
  Calendar,
  Building2,
  AlertCircle,
  CheckCircle,
  Edit,
  Trash2,
  User,
} from 'lucide-react';
import machineService from '../services/machineService';
import maintenanceService from '../services/maintenanceService';
import type { Machine } from '../types';
import type { MaintenanceLog } from '../types';
import StatusBadge from '../components/common/StatusBadge';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import PermissionGuard from '../components/auth/PermissionGuard';
import EditMachineModal from '../components/machines/EditMachineModal';
import DeleteConfirmModal from '../components/machines/DeleteConfirmModal';
import FaultResolutionModal from '../components/maintenance/FaultResolutionModal';
import { formatDate } from '../lib/utils';
import toast from 'react-hot-toast';

export default function MachineDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qrRef = useRef<HTMLDivElement>(null);

  const [machine, setMachine] = useState<Machine | null>(null);
  const [maintenanceLogs, setMaintenanceLogs] = useState<MaintenanceLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isResolutionModalOpen, setIsResolutionModalOpen] = useState(false);
  const [selectedMaintenanceLog, setSelectedMaintenanceLog] = useState<MaintenanceLog | null>(null);

  useEffect(() => {
    if (id) {
      fetchMachine(id); // ID is UUID string, don't parse!
      
      // Check if there's a log query parameter
      const urlParams = new URLSearchParams(window.location.search);
      const logId = urlParams.get('log');
      if (logId) {
        // Fetch the specific log and open modal
        maintenanceService.getById(logId)
          .then((log) => {
            setSelectedMaintenanceLog(log);
            setIsResolutionModalOpen(true);
            // Remove query param from URL
            navigate(`/machines/${id}`, { replace: true });
          })
          .catch((error) => {
            console.error('Error fetching maintenance log:', error);
          });
      }
    }
  }, [id, navigate]);

  const fetchMachine = async (machineId: string) => {
    try {
      setLoading(true);
      setError(null);
      console.log('🔄 Fetching machine with ID:', machineId);
      const [machineData, logsData] = await Promise.all([
        machineService.getById(machineId),
        maintenanceService.getAllByMachine(machineId),
      ]);
      console.log('✅ Machine fetched:', machineData);
      setMachine(machineData);
      setMaintenanceLogs(logsData);
    } catch (err) {
      console.error('Error fetching machine:', err);
      setError('Makine bilgileri yüklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenResolutionModal = (log: MaintenanceLog) => {
    setSelectedMaintenanceLog(log);
    setIsResolutionModalOpen(true);
  };

  const handleModalResolved = () => {
    // Refresh maintenance logs after resolution
    if (machine?.id) {
      maintenanceService.getAllByMachine(machine.id).then(setMaintenanceLogs);
    }
  };

  const handleDownloadQR = () => {
    if (!qrRef.current) return;

    const svg = qrRef.current.querySelector('svg');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      
      const pngFile = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.download = `QR-${machine?.name}-${machine?.id}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  const handlePrint = () => {
    window.print();
  };

  const handleEditMachine = async (machineId: string, data: any) => {
    try {
      await machineService.update(machineId, data);
      toast.success('Makine başarıyla güncellendi!');
      setIsEditModalOpen(false);
      fetchMachine(machineId);
    } catch (err) {
      console.error('Failed to update machine:', err);
      toast.error('Makine güncellenirken bir hata oluştu.');
    }
  };

  const handleDeleteMachine = async () => {
    if (!machine) return;
    
    try {
      await machineService.delete(machine.id);
      toast.success('Makine başarıyla silindi!');
      navigate('/machines');
    } catch (err) {
      console.error('Failed to delete machine:', err);
      toast.error('Makine silinirken bir hata oluştu.');
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error || !machine) {
    return (
      <ErrorMessage
        message={error || 'Makine bulunamadı.'}
        onRetry={() => id && fetchMachine(id)}
      />
    );
  }

  // QR Code içeriği: Sadece machine'in unique qr_code'u
  // Scanner bu QR code ile database'den makineyi bulacak
  const qrCodeValue = machine.qrCode;

  return (
    <div className="space-y-6">
      {/* Header with Back Button and Actions */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
          <span className="font-medium">Geri Dön</span>
        </button>

        {/* Admin Actions */}
        <PermissionGuard allowedRoles={['admin']}>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsEditModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white font-medium rounded-lg hover:bg-amber-700 transition-colors shadow-sm"
            >
              <Edit className="h-5 w-5" />
              <span className="hidden sm:inline">Düzenle</span>
            </button>
            <button
              onClick={() => setIsDeleteModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors shadow-sm"
            >
              <Trash2 className="h-5 w-5" />
              <span className="hidden sm:inline">Sil</span>
            </button>
          </div>
        </PermissionGuard>
      </div>

      {/* Maintenance Warning Banner */}
      {machine.status === 'UnderMaintenance' && (
        <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-orange-600 dark:text-orange-400 mt-0.5" />
          <div>
            <h3 className="font-semibold text-orange-900 dark:text-orange-200">Makine Bakımda</h3>
            <p className="text-sm text-orange-700 dark:text-orange-300 mt-1">
              Bu makine şu anda bakım işlemi altındadır. Lütfen kullanmayınız.
            </p>
          </div>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Machine Information */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Info Card */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700 shadow-sm p-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{machine.name}</h1>
                {machine.description && (
                  <p className="text-gray-500 dark:text-gray-400 mt-1">{machine.description}</p>
                )}
              </div>
              <StatusBadge status={machine.status} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Location */}
              {machine.location && (
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                    <MapPin className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Konum</p>
                    <p className="text-base font-semibold text-gray-900 dark:text-white mt-1">
                      {machine.location}
                    </p>
                  </div>
                </div>
              )}

              {/* Tenant */}
              <div className="flex items-start gap-3">
                <div className="p-2 bg-purple-50 dark:bg-purple-900/30 rounded-lg">
                  <Building2 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Firma</p>
                  <p className="text-base font-semibold text-gray-900 dark:text-white mt-1">
                    {machine.tenantName}
                  </p>
                </div>
              </div>

              {/* Created Date */}
              <div className="flex items-start gap-3">
                <div className="p-2 bg-green-50 dark:bg-green-900/30 rounded-lg">
                  <Calendar className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Eklenme Tarihi</p>
                  <p className="text-base font-semibold text-gray-900 dark:text-white mt-1">
                    {new Date(machine.createdAt).toLocaleDateString('tr-TR')}
                  </p>
                </div>
              </div>

              {/* Maintenance Count */}
              <div className="flex items-start gap-3">
                <div className="p-2 bg-orange-50 dark:bg-orange-900/30 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Arıza Bildirimi</p>
                  <p className="text-base font-semibold text-gray-900 dark:text-white mt-1">
                    {machine.maintenanceLogCount} Adet
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* QR Code Info Card */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">QR Kod Bilgisi</h2>
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">QR Kod İçeriği:</p>
              <code className="block text-sm font-mono bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-3 py-2 rounded border border-gray-200 dark:border-gray-600 break-all">
                {qrCodeValue}
              </code>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
                Bu QR kod, işçilerin makineyi hızlıca tanımlayıp arıza bildirmesi için kullanılır.
              </p>
            </div>
          </div>

          {/* Maintenance Logs Card */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Arıza Geçmişi ({maintenanceLogs.length})
            </h2>
            {maintenanceLogs.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                Bu makine için henüz arıza kaydı bulunmuyor.
              </p>
            ) : (
              <div className="space-y-3">
                {maintenanceLogs.map((log) => (
                  <div
                    key={log.id}
                    onClick={() => handleOpenResolutionModal(log)}
                    className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                            {log.title}
                          </h3>
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                              log.priority === 'critical'
                                ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                : log.priority === 'high'
                                ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                                : log.priority === 'medium'
                                ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                                : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                            }`}
                          >
                            {log.priority === 'critical'
                              ? 'Acil'
                              : log.priority === 'high'
                              ? 'Yüksek'
                              : log.priority === 'medium'
                              ? 'Orta'
                              : 'Düşük'}
                          </span>
                        </div>
                        {log.description && (
                          <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 mb-2">
                            {log.description}
                          </p>
                        )}
                        <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-500">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded ${
                              log.status === 'resolved'
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                : log.status === 'in_progress'
                                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                            }`}
                          >
                            {log.status === 'resolved'
                              ? 'Çözüldü'
                              : log.status === 'in_progress'
                              ? 'İşlemde'
                              : 'Bekliyor'}
                          </span>
                          <span>{formatDate(log.createdAt)}</span>
                          {log.reportedBy && (
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {log.reportedBy}
                            </span>
                          )}
                        </div>
                      </div>
                      {log.status !== 'resolved' && (
                        <PermissionGuard allowedRoles={['admin', 'technician']}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenResolutionModal(log);
                            }}
                            className="flex-shrink-0 p-2 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg transition-colors"
                            title="Arızayı Çöz"
                          >
                            <CheckCircle className="h-5 w-5" />
                          </button>
                        </PermissionGuard>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column - QR Code & Actions */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700 shadow-sm p-6 sticky top-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">QR Kodu</h2>
            
            {/* QR Code Display */}
            <div className="bg-white dark:bg-gray-900 p-6 rounded-lg border-2 border-gray-200 dark:border-gray-600 mb-6" ref={qrRef}>
              <div className="flex justify-center">
                <QRCodeSVG
                  value={qrCodeValue}
                  size={220}
                  level="H"
                  includeMargin
                  imageSettings={{
                    src: "/vite.svg",
                    height: 24,
                    width: 24,
                    excavate: true,
                  }}
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                onClick={handleDownloadQR}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-brand-600 text-white font-medium rounded-lg hover:bg-brand-700 transition-colors"
              >
                <Download className="h-5 w-5" />
                QR Kodu İndir
              </button>

              <button
                onClick={handlePrint}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-medium rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                <Printer className="h-5 w-5" />
                Yazdır
              </button>
            </div>

            {/* Status Info */}
            <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-2 text-sm">
                {machine.status === 'Active' ? (
                  <>
                    <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                    <span className="text-gray-600 dark:text-gray-300">Makine aktif ve kullanılabilir</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                    <span className="text-gray-600 dark:text-gray-300">Makine kullanım dışı</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Machine Modal */}
      <EditMachineModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleEditMachine}
        machine={machine}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteMachine}
        machineName={machine?.name || ''}
      />

      {/* Fault Resolution Modal */}
      <FaultResolutionModal
        isOpen={isResolutionModalOpen}
        onClose={() => {
          setIsResolutionModalOpen(false);
          setSelectedMaintenanceLog(null);
        }}
        maintenanceLog={selectedMaintenanceLog}
        onResolved={handleModalResolved}
      />

      {/* Print Styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          ${qrRef.current ? `#qr-print-area, #qr-print-area * {
            visibility: visible;
          }
          #qr-print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }` : ''}
        }
      `}</style>
    </div>
  );
}

