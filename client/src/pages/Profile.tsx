import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  User, 
  Mail, 
  Building2, 
  Lock, 
  Save, 
  Eye, 
  EyeOff,
  Sun,
  Moon,
  Bell,
  CheckCircle,
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

export default function Profile() {
  const { user, updateProfile, updatePassword } = useAuth();
  const [loading, setLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);

  // Profile form state
  const [profileForm, setProfileForm] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
  });

  // Password form state
  const [passwordForm, setPasswordForm] = useState({
    newPassword: '',
    confirmPassword: '',
  });

  // App preferences state - Load theme from localStorage
  const [preferences, setPreferences] = useState({
    theme: (localStorage.getItem('theme') || 'light') as 'light' | 'dark',
    emailNotifications: localStorage.getItem('emailNotifications') === 'true',
  });

  // Apply theme on mount and when it changes
  useEffect(() => {
    applyTheme(preferences.theme);
  }, [preferences.theme]);

  // Apply theme to document
  const applyTheme = (theme: 'light' | 'dark') => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  };

  // Get initials for avatar
  const getInitials = () => {
    const first = user?.firstName?.charAt(0) || '';
    const last = user?.lastName?.charAt(0) || '';
    return (first + last).toUpperCase() || 'U';
  };

  // Handle profile update
  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!profileForm.firstName.trim() || !profileForm.lastName.trim()) {
      toast.error('Ad ve Soyad alanları boş bırakılamaz');
      return;
    }

    try {
      setLoading(true);
      await updateProfile(profileForm.firstName, profileForm.lastName);
      toast.success('Profil bilgileriniz güncellendi!');
    } catch (error: any) {
      console.error('Profile update error:', error);
      toast.error(error.message || 'Profil güncellenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  // Handle password update
  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!passwordForm.newPassword || !passwordForm.confirmPassword) {
      toast.error('Lütfen tüm şifre alanlarını doldurun');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      toast.error('Şifre en az 6 karakter olmalıdır');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('Şifreler eşleşmiyor');
      return;
    }

    try {
      setPasswordLoading(true);
      await updatePassword(passwordForm.newPassword);
      toast.success('Şifreniz başarıyla güncellendi!');
      setPasswordForm({ newPassword: '', confirmPassword: '' });
    } catch (error: any) {
      console.error('Password update error:', error);
      toast.error(error.message || 'Şifre güncellenirken hata oluştu');
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Toaster position="top-right" />

      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Profil ve Ayarlar</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Kişisel bilgilerinizi ve uygulama tercihlerinizi yönetin
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - User Summary Card */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 sticky top-6">
            {/* Avatar */}
            <div className="flex flex-col items-center text-center mb-6">
              <div className="bg-gradient-to-br from-brand-600 to-brand-700 rounded-full w-24 h-24 flex items-center justify-center mb-4 shadow-lg">
                <span className="text-3xl font-bold text-white">
                  {getInitials()}
                </span>
              </div>
              
              {/* User Info */}
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                {user?.firstName} {user?.lastName}
              </h2>
              
              {/* Role Badge */}
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-400 mb-3">
                {user?.role === 'operator' ? 'Operatör' : 'Yönetici'}
              </span>
              
              {/* Email */}
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-4">
                <Mail className="h-4 w-4" />
                <span>{user?.email}</span>
              </div>
              
              {/* Factory Badge */}
              <div className="w-full pt-4 border-t border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-2">
                  <Building2 className="h-4 w-4" />
                  <span className="font-medium">Bağlı Fabrika</span>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {user?.factoryName || 'Fabrika'}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Kod: <span className="font-mono">{user?.factoryCode || 'N/A'}</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Settings Forms */}
        <div className="lg:col-span-2 space-y-6">
          {/* Profile Information */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-brand-100 dark:bg-brand-900/30 rounded-lg p-2">
                <User className="h-5 w-5 text-brand-600 dark:text-brand-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Profil Bilgileri</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Adınızı ve soyadınızı güncelleyin</p>
              </div>
            </div>

            <form onSubmit={handleProfileUpdate} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Ad
                  </label>
                  <input
                    type="text"
                    value={profileForm.firstName}
                    onChange={(e) =>
                      setProfileForm({ ...profileForm, firstName: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
                    placeholder="Adınız"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Soyad
                  </label>
                  <input
                    type="text"
                    value={profileForm.lastName}
                    onChange={(e) =>
                      setProfileForm({ ...profileForm, lastName: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
                    placeholder="Soyadınız"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  E-posta <span className="text-gray-400 dark:text-gray-500">(Değiştirilemez)</span>
                </label>
                <input
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                />
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full sm:w-auto px-6 py-2 bg-brand-600 text-white font-medium rounded-lg hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                      Kaydediliyor...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Değişiklikleri Kaydet
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Security - Password Update */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-orange-100 dark:bg-orange-900/30 rounded-lg p-2">
                <Lock className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Güvenlik</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Şifrenizi değiştirin</p>
              </div>
            </div>

            <form onSubmit={handlePasswordUpdate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Yeni Şifre
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={passwordForm.newPassword}
                    onChange={(e) =>
                      setPasswordForm({ ...passwordForm, newPassword: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors pr-10"
                    placeholder="En az 6 karakter"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Yeni Şifre (Tekrar)
                </label>
                <div className="relative">
                  <input
                    type={showPasswordConfirm ? 'text' : 'password'}
                    value={passwordForm.confirmPassword}
                    onChange={(e) =>
                      setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors pr-10"
                    placeholder="Şifreyi tekrar girin"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    {showPasswordConfirm ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={passwordLoading}
                  className="w-full sm:w-auto px-6 py-2 bg-orange-600 text-white font-medium rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  {passwordLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                      Güncelleniyor...
                    </>
                  ) : (
                    <>
                      <Lock className="h-4 w-4" />
                      Şifreyi Güncelle
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* App Preferences */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-purple-100 dark:bg-purple-900/30 rounded-lg p-2">
                <Sun className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Uygulama Tercihleri</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Görünüm ve bildirim ayarları</p>
              </div>
            </div>

            <div className="space-y-6">
              {/* Theme Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Tema
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: 'light', label: 'Aydınlık', icon: Sun },
                    { value: 'dark', label: 'Karanlık', icon: Moon },
                  ].map((theme) => (
                    <button
                      key={theme.value}
                      type="button"
                      onClick={() => {
                        setPreferences({ ...preferences, theme: theme.value as 'light' | 'dark' });
                        toast.success(`${theme.label} tema aktif`);
                      }}
                      className={`
                        relative p-4 rounded-lg border-2 transition-all
                        ${
                          preferences.theme === theme.value
                            ? 'border-brand-600 bg-brand-50 dark:bg-brand-900/20'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                        }
                      `}
                    >
                      <theme.icon
                        className={`h-6 w-6 mx-auto mb-2 ${
                          preferences.theme === theme.value ? 'text-brand-600' : 'text-gray-400 dark:text-gray-500'
                        }`}
                      />
                      <span
                        className={`text-sm font-medium ${
                          preferences.theme === theme.value ? 'text-brand-700 dark:text-brand-400' : 'text-gray-600 dark:text-gray-400'
                        }`}
                      >
                        {theme.label}
                      </span>
                      {preferences.theme === theme.value && (
                        <CheckCircle className="absolute top-2 right-2 h-5 w-5 text-brand-600" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Email Notifications */}
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center gap-3">
                  <Bell className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">E-posta Bildirimleri</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Arıza güncellemeleri için bildirim al</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const newValue = !preferences.emailNotifications;
                    setPreferences({ ...preferences, emailNotifications: newValue });
                    localStorage.setItem('emailNotifications', String(newValue));
                    toast.success(newValue ? 'Bildirimler açıldı' : 'Bildirimler kapatıldı');
                  }}
                  className={`
                    relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                    ${preferences.emailNotifications ? 'bg-brand-600' : 'bg-gray-300 dark:bg-gray-600'}
                  `}
                >
                  <span
                    className={`
                      inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                      ${preferences.emailNotifications ? 'translate-x-6' : 'translate-x-1'}
                    `}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

