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
} from 'lucide-react';
import machineService from '../services/machineService';
import type { Machine } from '../types';
import StatusBadge from '../components/common/StatusBadge';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import { formatDate } from '../lib/utils';

export default function MachineDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qrRef = useRef<HTMLDivElement>(null);

  const [machine, setMachine] = useState<Machine | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchMachine(id); // ID is UUID string, don't parse!
    }
  }, [id]);

  const fetchMachine = async (machineId: string) => {
    try {
      setLoading(true);
      setError(null);
      console.log('🔄 Fetching machine with ID:', machineId);
      const data = await machineService.getById(machineId);
      console.log('✅ Machine fetched:', data);
      setMachine(data);
    } catch (err) {
      console.error('Error fetching machine:', err);
      setError('Makine bilgileri yüklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
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
      {/* Header with Back Button */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
          <span className="font-medium">Geri Dön</span>
        </button>
      </div>

      {/* Maintenance Warning Banner */}
      {machine.status === 'UnderMaintenance' && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5" />
          <div>
            <h3 className="font-semibold text-orange-900">Makine Bakımda</h3>
            <p className="text-sm text-orange-700 mt-1">
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
          <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{machine.name}</h1>
                {machine.description && (
                  <p className="text-gray-500 mt-1">{machine.description}</p>
                )}
              </div>
              <StatusBadge status={machine.status} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Location */}
              {machine.location && (
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <MapPin className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Konum</p>
                    <p className="text-base font-semibold text-gray-900 mt-1">
                      {machine.location}
                    </p>
                  </div>
                </div>
              )}

              {/* Tenant */}
              <div className="flex items-start gap-3">
                <div className="p-2 bg-purple-50 rounded-lg">
                  <Building2 className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Firma</p>
                  <p className="text-base font-semibold text-gray-900 mt-1">
                    {machine.tenantName}
                  </p>
                </div>
              </div>

              {/* Created Date */}
              <div className="flex items-start gap-3">
                <div className="p-2 bg-green-50 rounded-lg">
                  <Calendar className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Eklenme Tarihi</p>
                  <p className="text-base font-semibold text-gray-900 mt-1">
                    {new Date(machine.createdAt).toLocaleDateString('tr-TR')}
                  </p>
                </div>
              </div>

              {/* Maintenance Count */}
              <div className="flex items-start gap-3">
                <div className="p-2 bg-orange-50 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Arıza Bildirimi</p>
                  <p className="text-base font-semibold text-gray-900 mt-1">
                    {machine.maintenanceLogCount} Adet
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* QR Code Info Card */}
          <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">QR Kod Bilgisi</h2>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm font-medium text-gray-500 mb-2">QR Kod İçeriği:</p>
              <code className="block text-sm font-mono bg-white px-3 py-2 rounded border border-gray-200 break-all">
                {qrCodeValue}
              </code>
              <p className="text-xs text-gray-500 mt-3">
                Bu QR kod, işçilerin makineyi hızlıca tanımlayıp arıza bildirmesi için kullanılır.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column - QR Code & Actions */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-6 sticky top-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">QR Kodu</h2>
            
            {/* QR Code Display */}
            <div className="bg-white p-6 rounded-lg border-2 border-gray-200 mb-6" ref={qrRef}>
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
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors"
              >
                <Printer className="h-5 w-5" />
                Yazdır
              </button>
            </div>

            {/* Status Info */}
            <div className="mt-6 pt-6 border-t border-gray-100">
              <div className="flex items-center gap-2 text-sm">
                {machine.status === 'Active' ? (
                  <>
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-gray-600">Makine aktif ve kullanılabilir</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-4 w-4 text-orange-600" />
                    <span className="text-gray-600">Makine kullanım dışı</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

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

