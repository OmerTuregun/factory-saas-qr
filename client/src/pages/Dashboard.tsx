import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PackageSearch, Activity, AlertCircle, TrendingUp, ArrowRight, Calendar, User } from 'lucide-react';
import StatCard from '../components/common/StatCard';
import MachineTable from '../components/dashboard/MachineTable';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import machineService from '../services/machineService';
import maintenanceService from '../services/maintenanceService';
import type { Machine } from '../types';
import type { DashboardStats } from '../types';
import type { MaintenanceLog } from '../types';
import { getPriorityColor } from '../lib/utils';

export default function Dashboard() {
  const navigate = useNavigate();
  const [machines, setMachines] = useState<Machine[]>([]);
  const [recentLogs, setRecentLogs] = useState<MaintenanceLog[]>([]);
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
      setMachines(machineData);

      // Fetch recent maintenance logs
      const logsData = await maintenanceService.getAllByTenant(1);
      setRecentLogs(logsData.slice(0, 5)); // Only latest 5

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

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">
          Fabrika varlık takip sisteminize genel bakış
        </p>
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
          title="Arıza Bildirimi"
          value={stats.criticalIssues}
          icon={TrendingUp}
          color="red"
        />
      </div>

      {/* Recent Maintenance Logs Widget */}
      <div className="bg-white rounded-lg border border-gray-100 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Son Arızalar</h2>
              <p className="text-sm text-gray-500 mt-1">
                En son bildirilen arıza kayıtları
              </p>
            </div>
            <button
              onClick={() => navigate('/maintenance')}
              className="inline-flex items-center gap-2 px-4 py-2 text-brand-600 hover:text-brand-700 hover:bg-brand-50 text-sm font-medium rounded-lg transition-colors"
            >
              Tümünü Gör
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="p-6">
          {recentLogs.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Henüz arıza kaydı bulunmuyor.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start gap-4 p-4 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => navigate('/maintenance')}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-medium text-gray-900">{log.machineName}</span>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getPriorityColor(
                          log.priority
                        )}`}
                      >
                        {log.priority}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                      {log.description}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {log.reportedBy || 'Anonim'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(log.reportedAt).toLocaleDateString('tr-TR')}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Machines Table */}
      <div className="bg-white rounded-lg border border-gray-100 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Makineler</h2>
              <p className="text-sm text-gray-500 mt-1">
                Tüm makinelerinizin listesi
              </p>
            </div>
            <button className="inline-flex items-center px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 transition-colors">
              Yeni Makine Ekle
            </button>
          </div>
        </div>
        <div className="p-6">
          <MachineTable machines={machines} />
        </div>
      </div>
    </div>
  );
}

