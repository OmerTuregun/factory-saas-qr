import { useState, useMemo, useEffect } from 'react';
import { Plus, Search, Grid3x3, List, Filter } from 'lucide-react';
import machineService from '../services/machineService';
import type { Machine } from '../types';
import MachineCard from '../components/machines/MachineCard';
import MachineListItem from '../components/machines/MachineListItem';
import AddMachineModal from '../components/machines/AddMachineModal';
import EditMachineModal from '../components/machines/EditMachineModal';
import DeleteConfirmModal from '../components/machines/DeleteConfirmModal';
import QRCodeModal from '../components/machines/QRCodeModal';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import { cn } from '../lib/utils';

type ViewMode = 'grid' | 'list';

const machineTypes = ['Tümü', 'CNC', 'Pres', 'Kaynak', 'Paketleme', 'Diğer'];

export default function Machines() {
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('Tümü');
  const [typeFilter, setTypeFilter] = useState('Tümü');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch machines from API
  const fetchMachines = async () => {
    try {
      setLoading(true);
      setError(null);
      // Using tenantId = 1 for demo purposes
      const data = await machineService.getAllByTenant(1);
      setMachines(data);
    } catch (err: any) {
      console.error('Failed to fetch machines:', err);
      setError(err.response?.data?.message || 'Makineler yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  // Load machines on mount
  useEffect(() => {
    fetchMachines();
  }, []);

  // Filter machines
  const filteredMachines = useMemo(() => {
    return machines.filter((machine) => {
      const matchesSearch =
        machine.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        machine.qrCode.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === 'Tümü' || machine.status === statusFilter;

      const matchesType =
        typeFilter === 'Tümü' ||
        machine.name.toLowerCase().includes(typeFilter.toLowerCase());

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [machines, searchQuery, statusFilter, typeFilter]);

  const handleAddMachine = async (data: any) => {
    try {
      await machineService.create({
        tenantId: 1,
        name: data.name,
        description: data.description || '',
        location: data.location || '',
      });
      await fetchMachines();
      setIsAddModalOpen(false);
    } catch (err: any) {
      console.error('Failed to create machine:', err);
      alert('Makine eklenirken bir hata oluştu: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleEditMachine = async (id: number, data: any) => {
    try {
      await machineService.update(id, data);
      await fetchMachines();
      setIsEditModalOpen(false);
      setSelectedMachine(null);
    } catch (err: any) {
      console.error('Failed to update machine:', err);
      alert('Makine güncellenirken bir hata oluştu: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleDeleteMachine = async () => {
    if (!selectedMachine) return;
    try {
      await machineService.delete(selectedMachine.id);
      await fetchMachines();
      setIsDeleteModalOpen(false);
      setSelectedMachine(null);
    } catch (err: any) {
      console.error('Failed to delete machine:', err);
      alert('Makine silinirken bir hata oluştu: ' + (err.response?.data?.message || err.message));
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Makine Yönetimi</h1>
          <p className="text-gray-500 mt-1">
            Tüm makinelerinizi görüntüleyin ve yönetin
          </p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 text-white font-medium rounded-lg hover:bg-brand-700 transition-colors shadow-sm"
        >
          <Plus className="h-5 w-5" />
          Yeni Makine Ekle
        </button>
      </div>

      {/* Filters Bar - Blue Theme */}
      <div className="bg-gradient-to-r from-brand-600 to-brand-700 rounded-xl shadow-md p-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          {/* Search */}
          <div className="md:col-span-5">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-white/70" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Makine adı ile ara..."
                className="w-full pl-10 pr-4 py-2 bg-white/20 border border-white/30 rounded-lg text-white placeholder-white/70 focus:ring-2 focus:ring-white/50 focus:border-white/50 focus:bg-white/30 transition-colors"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div className="md:col-span-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 bg-white/20 border border-white/30 rounded-lg text-white focus:ring-2 focus:ring-white/50 focus:border-white/50 focus:bg-white/30 transition-colors"
            >
              <option value="Tümü" className="text-gray-900">Tüm Durumlar</option>
              <option value="Active" className="text-gray-900">Aktif</option>
              <option value="UnderMaintenance" className="text-gray-900">Bakımda</option>
              <option value="Broken" className="text-gray-900">Arızalı</option>
              <option value="Inactive" className="text-gray-900">Pasif</option>
            </select>
          </div>

          {/* Type Filter */}
          <div className="md:col-span-2">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full px-3 py-2 bg-white/20 border border-white/30 rounded-lg text-white focus:ring-2 focus:ring-white/50 focus:border-white/50 focus:bg-white/30 transition-colors"
            >
              {machineTypes.map((type) => (
                <option key={type} value={type} className="text-gray-900">
                  {type}
                </option>
              ))}
            </select>
          </div>

          {/* View Toggle */}
          <div className="md:col-span-2 flex items-center justify-end gap-2">
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                'p-2 rounded-lg transition-colors',
                viewMode === 'grid'
                  ? 'bg-white text-brand-600'
                  : 'text-white/80 hover:bg-white/20'
              )}
              title="Grid Görünümü"
            >
              <Grid3x3 className="h-5 w-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                'p-2 rounded-lg transition-colors',
                viewMode === 'list'
                  ? 'bg-white text-brand-600'
                  : 'text-white/80 hover:bg-white/20'
              )}
              title="Liste Görünümü"
            >
              <List className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Active Filters Display */}
        {(searchQuery || statusFilter !== 'Tümü' || typeFilter !== 'Tümü') && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/20">
            <Filter className="h-4 w-4 text-white/70" />
            <span className="text-sm text-white">
              {filteredMachines.length} makine bulundu
            </span>
            {searchQuery && (
              <span className="px-2 py-1 bg-white/20 text-white text-xs rounded-full">
                "{searchQuery}"
              </span>
            )}
            {statusFilter !== 'Tümü' && (
              <span className="px-2 py-1 bg-white/20 text-white text-xs rounded-full">
                {statusFilter}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12">
          <LoadingSpinner />
        </div>
      ) : error ? (
        <ErrorMessage message={error} />
      ) : machines.length === 0 ? (
        // No machines at all
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center">
          <div className="h-16 w-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Filter className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Henüz Makine Eklenmemiş
          </h3>
          <p className="text-gray-500 mb-6">
            Sisteme ilk makinenizi ekleyerek başlayın.
          </p>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 text-white font-medium rounded-lg hover:bg-brand-700 transition-colors"
          >
            <Plus className="h-5 w-5" />
            İlk Makineyi Ekle
          </button>
        </div>
      ) : filteredMachines.length === 0 ? (
        // Empty State
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center">
          <Filter className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Makine Bulunamadı
          </h3>
          <p className="text-gray-500 mb-6">
            Arama kriterlerinize uygun makine bulunamadı. Filtreleri değiştirmeyi deneyin.
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setStatusFilter('Tümü');
              setTypeFilter('Tümü');
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 text-white font-medium rounded-lg hover:bg-brand-700 transition-colors"
          >
            Filtreleri Temizle
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        // Grid View
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMachines.map((machine) => (
            <MachineCard 
              key={machine.id} 
              machine={machine}
              onQRClick={() => {
                setSelectedMachine(machine);
                setIsQRModalOpen(true);
              }}
              onEditClick={() => {
                setSelectedMachine(machine);
                setIsEditModalOpen(true);
              }}
              onDeleteClick={() => {
                setSelectedMachine(machine);
                setIsDeleteModalOpen(true);
              }}
            />
          ))}
        </div>
      ) : (
        // List View
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gradient-to-r from-brand-600 to-brand-700 border-b border-brand-800">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-white uppercase tracking-wider">
                    Makine
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-white uppercase tracking-wider">
                    Durum
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-white uppercase tracking-wider">
                    Konum
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-white uppercase tracking-wider">
                    Arızalar
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-white uppercase tracking-wider">
                    Tarih
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-white uppercase tracking-wider">
                    İşlemler
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredMachines.map((machine) => (
                  <MachineListItem 
                    key={machine.id} 
                    machine={machine}
                    onQRClick={() => {
                      setSelectedMachine(machine);
                      setIsQRModalOpen(true);
                    }}
                    onEditClick={() => {
                      setSelectedMachine(machine);
                      setIsEditModalOpen(true);
                    }}
                    onDeleteClick={() => {
                      setSelectedMachine(machine);
                      setIsDeleteModalOpen(true);
                    }}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Machine Modal */}
      <AddMachineModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSave={handleAddMachine}
      />

      {/* Edit Machine Modal */}
      <EditMachineModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedMachine(null);
        }}
        onSave={handleEditMachine}
        machine={selectedMachine}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelectedMachine(null);
        }}
        onConfirm={handleDeleteMachine}
        machineName={selectedMachine?.name || ''}
      />

      {/* QR Code Modal */}
      <QRCodeModal
        isOpen={isQRModalOpen}
        onClose={() => {
          setIsQRModalOpen(false);
          setSelectedMachine(null);
        }}
        machineName={selectedMachine?.name || ''}
        qrCode={selectedMachine?.qrCode || ''}
      />
    </div>
  );
}

