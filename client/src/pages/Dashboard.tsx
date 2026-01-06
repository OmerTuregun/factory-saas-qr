import { useEffect, useState } from 'react';
import { PackageSearch, Activity, AlertCircle, TrendingUp } from 'lucide-react';
import StatCard from '../components/common/StatCard';
import MachineTable from '../components/dashboard/MachineTable';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import machineService from '../services/machineService';
import type { Machine } from '../types';
import type { DashboardStats } from '../types';

export default function Dashboard() {
  const [machines, setMachines] = useState<Machine[]>([]);
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
      const data = await machineService.getAllByTenant(1);
      setMachines(data);

      // Calculate stats
      const calculatedStats: DashboardStats = {
        totalMachines: data.length,
        activeMachines: data.filter((m) => m.status === 'Active').length,
        underMaintenance: data.filter((m) => m.status === 'UnderMaintenance').length,
        criticalIssues: data.filter((m) => m.maintenanceLogCount > 0).length,
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

