import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Command } from 'cmdk';
import { Search, X, PackageSearch, Wrench, User, Loader2, Link as LinkIcon } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';
import searchService from '../../services/searchService';
import type { Machine, MaintenanceLog, Profile } from '../../types';
import FaultResolutionModal from '../maintenance/FaultResolutionModal';
import maintenanceService from '../../services/maintenanceService';
import type { MaintenanceLog as MaintenanceLogType } from '../../types';
import { findMatchingPages, type AppPage } from '../../constants/appPages';

interface GlobalSearchProps {
  className?: string;
  onOpenChange?: (open: boolean) => void;
}

export default function GlobalSearch({ className, onOpenChange }: GlobalSearchProps) {
  const [open, setOpen] = useState(false);

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    onOpenChange?.(newOpen);
  };
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<{
    machines: Machine[];
    maintenanceLogs: MaintenanceLog[];
    profiles: Profile[];
  }>({
    machines: [],
    maintenanceLogs: [],
    profiles: [],
  });
  const [loading, setLoading] = useState(false);
  const [selectedMaintenanceLog, setSelectedMaintenanceLog] = useState<MaintenanceLogType | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const navigate = useNavigate();
  const { user } = useAuth();

  // Navigasyonel arama: Sayfa eşleşmelerini bul (client-side, anında)
  const matchingPages = useMemo(() => {
    if (!searchQuery || searchQuery.trim().length < 2) return [];
    return findMatchingPages(searchQuery, user?.role);
  }, [searchQuery, user?.role]);

  // Debounce search (veritabanı sorgusu)
  useEffect(() => {
    if (!open || !user?.factoryId) return;

    const timeoutId = setTimeout(async () => {
      if (searchQuery.trim().length < 2) {
        setResults({ machines: [], maintenanceLogs: [], profiles: [] });
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const searchResults = await searchService.search(searchQuery, user.factoryId);
        setResults(searchResults);
      } catch (error) {
        console.error('Search error:', error);
        setResults({ machines: [], maintenanceLogs: [], profiles: [] });
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, open, user?.factoryId]);

  // Keyboard shortcut (Ctrl+K / Cmd+K)
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleOpenChange(!open);
      }
      if (e.key === 'Escape') {
        handleOpenChange(false);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [open]);

  const handleSelect = useCallback(
    async (type: 'machine' | 'maintenance' | 'profile', id: string, item?: any) => {
      handleOpenChange(false);
      setSearchQuery('');

      if (type === 'machine') {
        navigate(`/machines/${id}`);
      } else if (type === 'maintenance') {
        // Open FaultResolutionModal
        try {
          const log = await maintenanceService.getById(id);
          setSelectedMaintenanceLog(log);
          setIsModalOpen(true);
        } catch (error) {
          console.error('Error fetching maintenance log:', error);
        }
      } else if (type === 'profile') {
        // Navigate to profile or team management
        if (user?.role === 'admin') {
          navigate('/team');
        } else {
          navigate('/profile');
        }
      }
    },
    [navigate, user?.role]
  );

  // Sayfa seçildiğinde yönlendir
  const handlePageSelect = useCallback(
    (page: AppPage) => {
      handleOpenChange(false);
      setSearchQuery('');
      navigate(page.url);
    },
    [navigate]
  );

  const totalResults =
    matchingPages.length +
    results.machines.length +
    results.maintenanceLogs.length +
    results.profiles.length;

  return (
    <>
      {/* Desktop: Full search input */}
      <div className={cn('hidden md:block', className)}>
        <button
          onClick={() => handleOpenChange(true)}
          className={cn(
            'flex items-center gap-2 w-64 px-4 py-2 text-sm text-gray-500 dark:text-gray-400',
            'bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700',
            'hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors',
            'focus:outline-none focus:ring-2 focus:ring-brand-500'
          )}
        >
          <Search className="h-4 w-4" />
          <span className="flex-1 text-left">Ara... (Ctrl+K)</span>
        </button>
      </div>

      {/* Mobile: Search icon button */}
      <button
        onClick={() => handleOpenChange(true)}
        className={cn(
          'md:hidden flex items-center justify-center w-10 h-10',
          'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white',
          'rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors',
          className
        )}
      >
        <Search className="h-5 w-5" />
      </button>

      {/* Command Menu */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] px-4">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => handleOpenChange(false)}
          />

          {/* Command Dialog */}
          <Command
            className={cn(
              'relative z-50 w-full max-w-2xl',
              'bg-white dark:bg-gray-800 rounded-lg shadow-xl',
              'border border-gray-200 dark:border-gray-700',
              'overflow-hidden'
            )}
            shouldFilter={false}
          >
            {/* Search Input */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <Search className="h-5 w-5 text-gray-400" />
              <Command.Input
                value={searchQuery}
                onValueChange={setSearchQuery}
                placeholder="Ara... (Sayfalar, Makineler, Arızalar, Personel)"
                className={cn(
                  'flex-1 bg-transparent outline-none',
                  'text-gray-900 dark:text-white placeholder:text-gray-400'
                )}
                autoFocus
              />
              {loading && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
              <button
                onClick={() => handleOpenChange(false)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              >
                <X className="h-4 w-4 text-gray-400" />
              </button>
            </div>

            {/* Results */}
            <Command.List className="max-h-[400px] overflow-y-auto p-2">
              {searchQuery.trim().length < 2 ? (
                <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                  En az 2 karakter girin...
                </div>
              ) : loading ? (
                <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                  <p>Aranıyor...</p>
                </div>
              ) : totalResults === 0 ? (
                <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                  Sonuç bulunamadı.
                </div>
              ) : (
                <>
                  {/* Sayfalar (Navigasyonel Arama) - En Üstte */}
                  {matchingPages.length > 0 && (
                    <Command.Group heading="Sayfalar">
                      {matchingPages.map((page) => (
                        <Command.Item
                          key={page.url}
                          onSelect={() => handlePageSelect(page)}
                          className={cn(
                            'flex items-center gap-3 px-3 py-2 rounded-lg',
                            'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700',
                            'data-[selected]:bg-gray-100 dark:data-[selected]:bg-gray-700'
                          )}
                        >
                          <LinkIcon className="h-5 w-5 text-purple-500" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                              {page.title}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                              Sayfaya git
                            </p>
                          </div>
                        </Command.Item>
                      ))}
                    </Command.Group>
                  )}

                  {/* Machines */}
                  {results.machines.length > 0 && (
                    <Command.Group heading="Makineler">
                      {results.machines.map((machine) => (
                        <Command.Item
                          key={machine.id}
                          onSelect={() => handleSelect('machine', machine.id)}
                          className={cn(
                            'flex items-center gap-3 px-3 py-2 rounded-lg',
                            'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700',
                            'data-[selected]:bg-gray-100 dark:data-[selected]:bg-gray-700'
                          )}
                        >
                          <PackageSearch className="h-5 w-5 text-blue-500" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                              {machine.name}
                            </p>
                            {machine.location && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                {machine.location}
                              </p>
                            )}
                          </div>
                        </Command.Item>
                      ))}
                    </Command.Group>
                  )}

                  {/* Maintenance Logs */}
                  {results.maintenanceLogs.length > 0 && (
                    <Command.Group heading="Arızalar">
                      {results.maintenanceLogs.map((log) => (
                        <Command.Item
                          key={log.id}
                          onSelect={() => handleSelect('maintenance', log.id, log)}
                          className={cn(
                            'flex items-center gap-3 px-3 py-2 rounded-lg',
                            'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700',
                            'data-[selected]:bg-gray-100 dark:data-[selected]:bg-gray-700'
                          )}
                        >
                          <Wrench className="h-5 w-5 text-orange-500" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                              {log.title}
                            </p>
                            {log.machineName && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                {log.machineName}
                              </p>
                            )}
                          </div>
                        </Command.Item>
                      ))}
                    </Command.Group>
                  )}

                  {/* Profiles */}
                  {results.profiles.length > 0 && (
                    <Command.Group heading="Personel">
                      {results.profiles.map((profile) => (
                        <Command.Item
                          key={profile.id}
                          onSelect={() => handleSelect('profile', profile.id, profile)}
                          className={cn(
                            'flex items-center gap-3 px-3 py-2 rounded-lg',
                            'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700',
                            'data-[selected]:bg-gray-100 dark:data-[selected]:bg-gray-700'
                          )}
                        >
                          <User className="h-5 w-5 text-green-500" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                              {profile.firstName} {profile.lastName}
                            </p>
                            {profile.email && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                {profile.email}
                              </p>
                            )}
                          </div>
                        </Command.Item>
                      ))}
                    </Command.Group>
                  )}
                </>
              )}
            </Command.List>
          </Command>
        </div>
      )}

      {/* Fault Resolution Modal */}
      {selectedMaintenanceLog && (
        <FaultResolutionModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedMaintenanceLog(null);
          }}
          maintenanceLog={selectedMaintenanceLog}
          onResolved={() => {
            setIsModalOpen(false);
            setSelectedMaintenanceLog(null);
          }}
        />
      )}
    </>
  );
}
