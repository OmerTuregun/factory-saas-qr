import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  User,
  PackageSearch,
  AlertCircle,
  Menu,
  X,
  LogOut,
  ScanLine,
  Wrench,
  Users,
  Shield,
  BarChart3,
  Bell,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationsContext';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const baseNavigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard, roles: ['admin', 'technician', 'operator'] },
  { name: 'Makineler', href: '/machines', icon: PackageSearch, roles: ['admin', 'technician', 'operator'] }, // Operator görür ama sadece detay görebilir
  { name: 'Bakım Geçmişi', href: '/maintenance', icon: Wrench, roles: ['admin', 'technician', 'operator'] },
  { name: 'Bildirimler', href: '/notifications', icon: Bell, roles: ['admin', 'technician', 'operator'], showBadge: true },
  { name: 'Raporlar', href: '/reports', icon: BarChart3, roles: ['admin', 'technician'] }, // Operator görmez
  { name: 'Profil ve Ayarlar', href: '/profile', icon: User, roles: ['admin', 'technician', 'operator'] },
];

// Admin-only navigation items
const adminNavigation = [
  { name: 'Ekip Yönetimi', href: '/team', icon: Users, roles: ['admin'] },
];

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { unreadCount } = useNotifications();

  // Build navigation based on user role
  const navigation = [
    ...baseNavigation.filter(item => item.roles.includes(user?.role || 'operator')),
    ...adminNavigation.filter(item => item.roles.includes(user?.role || 'operator')),
  ];

  const getInitials = (firstName?: string, lastName?: string) => {
    if (!firstName || !lastName) return 'U';
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const getRoleName = (role: string) => {
    const roleMap: Record<string, string> = {
      operator: 'Operatör',
      technician: 'Teknisyen',
      admin: 'Admin',
    };
    return roleMap[role] || role;
  };

  const getRoleColor = (role: string) => {
    const colorMap: Record<string, string> = {
      admin: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
      technician: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      operator: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    };
    return colorMap[role] || colorMap.operator;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-gray-900/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 bg-gray-900 dark:bg-gray-950 transform transition-transform duration-300 ease-in-out lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center gap-3 border-b border-gray-800 px-6">
            <div className="h-8 w-8 rounded-lg bg-brand-500 flex items-center justify-center">
              <PackageSearch className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">QR Asset</h1>
              <p className="text-xs text-gray-400">Tracker</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 px-3 py-4">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              const showBadge = item.showBadge && unreadCount > 0;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors relative',
                    isActive
                      ? 'bg-brand-600 text-white'
                      : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  <span className="flex-1">{item.name}</span>
                  {showBadge && (
                    <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-bold text-white bg-red-500 rounded-full">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* User section */}
          <div className="border-t border-gray-800 p-4">
            <div className="flex items-center gap-3 mb-3">
              {/* User Avatar */}
              <div className="h-9 w-9 rounded-full bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center shadow-md">
                <span className="text-sm font-bold text-white">
                  {getInitials(user?.firstName, user?.lastName)}
                </span>
              </div>
              
              {/* User Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs text-gray-400 truncate">
                  {user?.factoryName}
                </p>
              </div>
              
              {/* Logout Button */}
              <button
                onClick={logout}
                className="text-gray-400 hover:text-red-400 hover:bg-gray-800 p-1.5 rounded-lg transition-colors"
                title="Çıkış Yap"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
            
            {/* Role Badge */}
            <div className="flex items-center justify-center">
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold',
                  getRoleColor(user?.role || 'operator')
                )}
              >
                <Shield className="h-3 w-3" />
                {getRoleName(user?.role || 'operator')}
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
          <div className="flex h-16 items-center gap-4 px-4 sm:px-6 lg:px-8">
            {/* Mobile menu button */}
            <button
              type="button"
              className="lg:hidden text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-6 w-6" />
            </button>

            {/* Breadcrumb or page title could go here */}
            <div className="flex-1" />

            {/* Header actions */}
            <div className="flex items-center gap-3">
              {/* QR Scan Button */}
              <button
                onClick={() => navigate('/scan')}
                className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white font-medium rounded-lg hover:bg-brand-700 transition-colors shadow-sm"
              >
                <ScanLine className="h-5 w-5" />
                <span className="hidden sm:inline">QR Tara</span>
              </button>

              <span className="hidden lg:inline text-sm text-gray-500 dark:text-gray-400">
                {new Date().toLocaleDateString('tr-TR', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}

