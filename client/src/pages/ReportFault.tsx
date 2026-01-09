import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  AlertTriangle,
  CheckCircle,
  Loader2,
  PackageSearch,
} from 'lucide-react';
import machineService from '../services/machineService';
import maintenanceService from '../services/maintenanceService';
import type { Machine } from '../types';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { useProductTour } from '../hooks/useProductTour';

export default function ReportFault() {
  const { machineId } = useParams<{ machineId: string }>();
  const navigate = useNavigate();
  const { resumeTour } = useProductTour();

  const [machine, setMachine] = useState<Machine | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    description: '',
    priority: 'Medium' as 'Low' | 'Medium' | 'High' | 'Critical',
    reportedBy: '',
  });

  useEffect(() => {
    if (machineId) {
      fetchMachine(machineId); // UUID string olarak kullan
    }
  }, [machineId]);

  // Resume tour from localStorage (multi-page persistence)
  useEffect(() => {
    // Makine yüklendikten sonra turu resume et
    if (!loading && machine) {
      resumeTour();
    }
  }, [loading, machine, resumeTour]);

  const fetchMachine = async (id: string) => { // number yerine string
    try {
      setLoading(true);
      const data = await machineService.getById(id); // String UUID gönder
      setMachine(data);
    } catch (err) {
      console.error('Error fetching machine:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!machine || !formData.description.trim()) {
      return;
    }

    try {
      setSubmitting(true);

      // Title'ı description'ın ilk 50 karakterinden oluştur
      const title = formData.description.length > 50 
        ? formData.description.substring(0, 50) + '...' 
        : formData.description;

      await maintenanceService.report({
        machineId: machine.id, // UUID gönder
        title: title, // Otomatik üretilen title
        description: formData.description,
        priority: formData.priority.toLowerCase() as 'low' | 'medium' | 'high' | 'critical',
        reportedBy: formData.reportedBy || undefined, // Bildiren kişi (opsiyonel)
      });

      setSuccess(true);

      // Başarı feedback'i
      navigator.vibrate?.([200, 100, 200]);

      // 2 saniye sonra dashboard'a yönlendir
      setTimeout(() => {
        navigate('/');
      }, 2000);
    } catch (err) {
      console.error('Error reporting fault:', err);
      alert('Arıza kaydı oluşturulurken bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!machine) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-sm p-6 max-w-md w-full text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Makine Bulunamadı</h2>
          <p className="text-gray-600 mb-4">
            Bu ID'ye ait makine sistemde kayıtlı değil.
          </p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700"
          >
            Dashboard'a Dön
          </button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-sm p-8 max-w-md w-full text-center">
          <div className="bg-green-100 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-12 w-12 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Arıza Kaydı Oluşturuldu!
          </h2>
          <p className="text-gray-600 mb-1">
            Arıza bildirimi başarıyla kaydedildi.
          </p>
          <p className="text-sm text-gray-500">
            Yönlendiriliyor...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="px-4 py-3">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-5 w-5" />
            <span className="font-medium">Geri</span>
          </button>
        </div>
      </div>

      {/* Form Container - Centered */}
      <div className="max-w-xl mx-auto mt-8 mb-24 px-4">
        {/* Machine Info Banner */}
        <div className="bg-brand-600 text-white rounded-xl p-6 mb-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="bg-white/20 rounded-lg p-3">
              <PackageSearch className="h-8 w-8" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-brand-100 mb-1">
                Arıza bildirimi yapıyorsunuz
              </p>
              <h1 className="text-2xl font-bold mb-1">{machine.name}</h1>
              {machine.location && (
                <p className="text-sm text-brand-100">
                  📍 {machine.location}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Description */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-3">
                Sorun Nedir? <span className="text-red-500">*</span>
              </label>
              <textarea
                id="input-fault-description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Makinede karşılaştığınız sorunu detaylı bir şekilde açıklayın..."
                rows={6}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-base resize-none transition-colors"
                required
              />
              <p className="text-xs text-gray-500 mt-2">
                Minimum 10 karakter gereklidir
              </p>
            </div>

            {/* Priority */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-3">
                Öncelik Seviyesi
              </label>
              <div id="select-priority" className="grid grid-cols-2 gap-3">
                {[
                  { value: 'Low', label: 'Düşük', activeColor: 'bg-blue-600', inactiveColor: 'bg-gray-50', textColor: 'text-gray-700' },
                  { value: 'Medium', label: 'Normal', activeColor: 'bg-yellow-600', inactiveColor: 'bg-gray-50', textColor: 'text-gray-700' },
                  { value: 'High', label: 'Yüksek', activeColor: 'bg-orange-600', inactiveColor: 'bg-gray-50', textColor: 'text-gray-700' },
                  { value: 'Critical', label: 'Acil', activeColor: 'bg-red-600', inactiveColor: 'bg-gray-50', textColor: 'text-gray-700' },
                ].map((priority) => (
                  <button
                    key={priority.value}
                    type="button"
                    onClick={() =>
                      setFormData({
                        ...formData,
                        priority: priority.value as any,
                      })
                    }
                    className={`
                      px-4 py-3 rounded-lg font-medium text-sm transition-all border
                      ${
                        formData.priority === priority.value
                          ? `${priority.activeColor} text-white border-transparent ring-2 ring-offset-1 shadow-sm`
                          : `${priority.inactiveColor} ${priority.textColor} border-gray-200 hover:bg-gray-100`
                      }
                    `}
                  >
                    {priority.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Reporter Name (Optional) */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-3">
                Adınız (Opsiyonel)
              </label>
              <input
                type="text"
                value={formData.reportedBy}
                onChange={(e) =>
                  setFormData({ ...formData, reportedBy: e.target.value })
                }
                placeholder="Örn: Ahmet Yılmaz"
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-base transition-colors"
              />
              <p className="text-xs text-gray-500 mt-2">
                Boş bırakırsanız "Anonim" olarak kaydedilir
              </p>
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <button
                id="btn-submit-fault"
                type="submit"
                disabled={submitting || formData.description.length < 10}
                className="w-full px-6 py-4 bg-brand-600 text-white font-bold text-lg rounded-lg hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-sm"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Kaydediliyor...
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-5 w-5" />
                    Arıza Kaydı Oluştur
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

