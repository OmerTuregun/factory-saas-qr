import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Scanner } from '@yudiel/react-qr-scanner';
import { Camera, AlertCircle, ArrowLeft, Keyboard } from 'lucide-react';

export default function QRScanner() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [manualMode, setManualMode] = useState(false);
  const [manualId, setManualId] = useState('');
  const [scanning, setScanning] = useState(true);

  const handleScan = async (result: any) => {
    if (!scanning) return;

    const qrData = result?.[0]?.rawValue || result?.text;
    
    if (qrData) {
      console.log('🔍 QR Code scanned:', qrData);
      setScanning(false);
      
      try {
        // Find machine by QR code in database
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

        const response = await fetch(
          `${supabaseUrl}/rest/v1/machines?qr_code=eq.${qrData}&select=id`,
          {
            headers: {
              'apikey': supabaseKey,
              'Authorization': `Bearer ${supabaseKey}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error('Makine bulunamadı');
        }

        const machines = await response.json();
        
        if (!machines || machines.length === 0) {
          setError('Bu QR kodu kayıtlı bir makineye ait değil.');
          setTimeout(() => {
            setError(null);
            setScanning(true);
          }, 3000);
          return;
        }

        const machineId = machines[0].id;
        console.log('✅ Machine found:', machineId);
        
        // Başarılı tarama feedback'i
        navigator.vibrate?.(200); // Mobilde titreşim
        
        // Arıza bildirim sayfasına yönlendir
        setTimeout(() => {
          navigate(`/report-fault/${machineId}`);
        }, 500);
      } catch (err: any) {
        console.error('QR Scan Error:', err);
        setError('QR kod işlenirken hata oluştu. Tekrar deneyin.');
        setTimeout(() => {
          setError(null);
          setScanning(true);
        }, 3000);
      }
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!manualId.trim()) {
      setError('Lütfen bir QR kod girin.');
      return;
    }
    
    // Use the QR code to find machine (same as scan)
    console.log('🔍 Manual QR code:', manualId);
    handleScan([{ rawValue: manualId }]);
  };

  return (
    <div className="min-h-screen bg-gray-900 relative">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-20 bg-gradient-to-b from-gray-900 to-transparent p-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-4 py-2 text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            <span className="font-medium">Geri</span>
          </button>

          <button
            onClick={() => setManualMode(!manualMode)}
            className="flex items-center gap-2 px-4 py-2 text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            {manualMode ? (
              <>
                <Camera className="h-5 w-5" />
                <span>Kamera</span>
              </>
            ) : (
              <>
                <Keyboard className="h-5 w-5" />
                <span>Manuel</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        {!manualMode ? (
          <>
            {/* Camera Scanner */}
            <div className="w-full max-w-md">
              <div className="mb-6 text-center">
                <Camera className="h-12 w-12 text-white mx-auto mb-3" />
                <h1 className="text-2xl font-bold text-white mb-2">
                  QR Kod Tara
                </h1>
                <p className="text-gray-300">
                  Makine üzerindeki QR kodu kamera ile okutun
                </p>
              </div>

              {/* Scanner Container */}
              <div className="relative rounded-2xl overflow-hidden border-4 border-white/20 shadow-2xl">
                <Scanner
                  onScan={handleScan}
                  onError={(err) => {
                    console.error('Scanner Error:', err);
                    setError('Kamera erişim hatası. Manuel mod kullanabilirsiniz.');
                  }}
                  components={{
                    audio: false,
                    onOff: false,
                    torch: true,
                    zoom: false,
                    finder: true,
                  }}
                  styles={{
                    container: {
                      width: '100%',
                      aspectRatio: '1',
                    },
                  }}
                />

                {/* Scanning Overlay */}
                {scanning && (
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute inset-0 border-2 border-brand-400/50">
                      {/* Corner markers */}
                      <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-brand-400" />
                      <div className="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 border-brand-400" />
                      <div className="absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 border-brand-400" />
                      <div className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 border-brand-400" />
                    </div>
                    
                    {/* Scanning line animation */}
                    <div className="absolute inset-x-0 top-1/2 h-0.5 bg-brand-400 animate-pulse" />
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Manual Mode */}
            <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6">
              <div className="text-center mb-6">
                <Keyboard className="h-12 w-12 text-brand-600 mx-auto mb-3" />
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  Manuel Giriş
                </h1>
                <p className="text-gray-600">
                  Makine ID'sini elle girin
                </p>
              </div>

              <form onSubmit={handleManualSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    QR Kod
                  </label>
                  <input
                    type="text"
                    value={manualId}
                    onChange={(e) => setManualId(e.target.value)}
                    placeholder="QR kodunu girin (Örn: QR-1234567890-ABC)"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-lg"
                    autoFocus
                  />
                </div>

                <button
                  type="submit"
                  className="w-full px-6 py-3 bg-brand-600 text-white font-semibold rounded-lg hover:bg-brand-700 transition-colors"
                >
                  Devam Et
                </button>
              </form>
            </div>
          </>
        )}

        {/* Error Message */}
        {error && (
          <div className="absolute bottom-8 left-4 right-4 bg-red-500 text-white px-4 py-3 rounded-lg shadow-lg flex items-start gap-3 animate-bounce">
            <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        {/* Instructions */}
        {!manualMode && !error && (
          <div className="absolute bottom-8 left-4 right-4 bg-white/10 backdrop-blur-md text-white px-4 py-3 rounded-lg">
            <p className="text-sm text-center">
              QR kodu çerçeve içine getirin. Otomatik olarak taranacaktır.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

