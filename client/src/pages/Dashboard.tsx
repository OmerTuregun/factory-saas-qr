import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  PackageSearch, 
  Activity, 
  AlertCircle, 
  TrendingUp, 
  ScanLine,
  ClipboardList,
  ArrowRight,
  Wrench,
  User as UserIcon,
} from 'lucide-react';
import StatCard from '../components/common/StatCard';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import machineService from '../services/machineService';
import maintenanceService from '../services/maintenanceService';
import type { Machine } from '../types';
import type { DashboardStats } from '../types';
import type { MaintenanceLog } from '../types';

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    totalMachines: 0,
    activeMachines: 0,
    underMaintenance: 0,
    criticalIssues: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch machines for tenant ID 1 (demo tenant)
      const machineData = await machineService.getAllByTenant(1);

      // Fetch maintenance logs for stats
      const logsData = await maintenanceService.getAllByTenant(1);

      // Calculate stats
      const calculatedStats: DashboardStats = {
        totalMachines: machineData.length,
        activeMachines: machineData.filter((m) => m.status === 'Active').length,
        underMaintenance: machineData.filter((m) => m.status === 'UnderMaintenance').length,
        criticalIssues: logsData.filter((l) => l.priority === 'Critical' && l.status !== 'Resolved').length,
      };
      setStats(calculatedStats);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Veriler yüklenirken bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={fetchData} />;
  }

  // Get current time for greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Günaydın';
    if (hour < 18) return 'İyi günler';
    return 'İyi akşamlar';
  };

  return (
    <div className="space-y-6">
      {/* Welcome Card */}
      <div className="bg-gradient-to-r from-brand-600 to-brand-700 rounded-xl shadow-sm p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-brand-100 text-sm mb-1">{getGreeting()},</p>
            <h1 className="text-2xl font-bold mb-1">Admin User</h1>
            <p className="text-brand-100 text-sm">Sistem Yöneticisi • Demo Fabrika A.Ş.</p>
          </div>
          <div className="hidden sm:block">
            <div className="bg-white/20 rounded-full p-4">
              <UserIcon className="h-12 w-12" />
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Toplam Makine"
          value={stats.totalMachines}
          icon={PackageSearch}
          color="blue"
        />
        <StatCard
          title="Aktif Makineler"
          value={stats.activeMachines}
          icon={Activity}
          color="green"
        />
        <StatCard
          title="Bakımda"
          value={stats.underMaintenance}
          icon={AlertCircle}
          color="orange"
        />
        <StatCard
          title="Acil Arızalar"
          value={stats.criticalIssues}
          icon={TrendingUp}
          color="red"
        />
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Hızlı İşlemler</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* QR Scan Action */}
          <button
            onClick={() => navigate('/scan')}
            className="group relative overflow-hidden bg-gradient-to-br from-brand-600 to-brand-700 rounded-xl p-6 text-left hover:shadow-lg transition-all"
          >
            <div className="absolute top-0 right-0 opacity-10">
              <ScanLine className="h-32 w-32 transform rotate-12" />
            </div>
            <div className="relative">
              <div className="bg-white/20 rounded-lg p-3 w-fit mb-3">
                <ScanLine className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-lg font-bold text-white mb-1">QR Kod Tara</h3>
              <p className="text-sm text-brand-100">
                Makine QR kodunu okut ve arıza bildir
              </p>
            </div>
            <ArrowRight className="absolute bottom-4 right-4 h-5 w-5 text-white/60 group-hover:translate-x-1 transition-transform" />
          </button>

          {/* Maintenance Logs Action */}
          <button
            onClick={() => navigate('/maintenance')}
            className="group relative overflow-hidden bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-6 text-left hover:shadow-lg transition-all"
          >
            <div className="absolute top-0 right-0 opacity-10">
              <Wrench className="h-32 w-32 transform rotate-12" />
            </div>
            <div className="relative">
              <div className="bg-white/20 rounded-lg p-3 w-fit mb-3">
                <Wrench className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-lg font-bold text-white mb-1">Arıza Kayıtları</h3>
              <p className="text-sm text-orange-100">
                Bakım geçmişini incele ve raporları gör
              </p>
            </div>
            <ArrowRight className="absolute bottom-4 right-4 h-5 w-5 text-white/60 group-hover:translate-x-1 transition-transform" />
          </button>

          {/* Machines Action */}
          <button
            onClick={() => navigate('/machines')}
            className="group relative overflow-hidden bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-left hover:shadow-lg transition-all"
          >
            <div className="absolute top-0 right-0 opacity-10">
              <PackageSearch className="h-32 w-32 transform rotate-12" />
            </div>
            <div className="relative">
              <div className="bg-white/20 rounded-lg p-3 w-fit mb-3">
                <PackageSearch className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-lg font-bold text-white mb-1">Makine Yönetimi</h3>
              <p className="text-sm text-purple-100">
                Makineleri listele, düzenle ve QR oluştur
              </p>
            </div>
            <ArrowRight className="absolute bottom-4 right-4 h-5 w-5 text-white/60 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>

      {/* System Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Son Aktivite</h3>
            <ClipboardList className="h-5 w-5 text-gray-400" />
          </div>
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="bg-green-100 rounded-full p-2">
                <Activity className="h-4 w-4 text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">Sistem Aktif</p>
                <p className="text-xs text-gray-500">
                  {stats.activeMachines} makine çalışıyor
                </p>
              </div>
            </div>
            {stats.criticalIssues > 0 && (
              <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg">
                <div className="bg-red-100 rounded-full p-2">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">Acil Arıza</p>
                  <p className="text-xs text-gray-500">
                    {stats.criticalIssues} adet acil müdahale bekliyor
                  </p>
                </div>
              </div>
            )}
            {stats.underMaintenance > 0 && (
              <div className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg">
                <div className="bg-orange-100 rounded-full p-2">
                  <Wrench className="h-4 w-4 text-orange-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">Bakımda</p>
                  <p className="text-xs text-gray-500">
                    {stats.underMaintenance} makine bakım altında
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Quick Tips */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Hızlı Yardım</h3>
          <div className="space-y-4 text-sm text-gray-600">
            <div className="flex items-start gap-3">
              <div className="bg-blue-50 rounded-full p-1 mt-0.5">
                <span className="text-blue-600 font-bold text-xs">1</span>
              </div>
              <p>
                <span className="font-medium text-gray-900">QR Tara:</span> Mobil cihazınızla makine QR kodunu okutun
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="bg-blue-50 rounded-full p-1 mt-0.5">
                <span className="text-blue-600 font-bold text-xs">2</span>
              </div>
              <p>
                <span className="font-medium text-gray-900">Arıza Bildir:</span> Sorunu açıklayın ve öncelik seçin
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="bg-blue-50 rounded-full p-1 mt-0.5">
                <span className="text-blue-600 font-bold text-xs">3</span>
              </div>
              <p>
                <span className="font-medium text-gray-900">Takip Et:</span> Bakım geçmişinden durumu kontrol edin
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

