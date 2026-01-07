import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, UserPlus, User, Building2, Loader2 } from 'lucide-react';
import AuthLayout from '../components/auth/AuthLayout';
import { useAuth } from '../contexts/AuthContext';

export default function Register() {
  const { register } = useAuth();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    factoryCode: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'Ad gereklidir';
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Soyad gereklidir';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'E-posta adresi gereklidir';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Geçerli bir e-posta adresi giriniz';
    }

    if (!formData.password) {
      newErrors.password = 'Şifre gereklidir';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Şifre en az 6 karakter olmalıdır';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Şifre tekrarı gereklidir';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Şifreler eşleşmiyor';
    }

    if (!formData.factoryCode.trim()) {
      newErrors.factoryCode = 'Kurum kodu gereklidir';
    } else if (formData.factoryCode.length < 4) {
      newErrors.factoryCode = 'Kurum kodu en az 4 karakter olmalıdır';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setLoading(true);
    setErrors({}); // Clear previous errors

    try {
      console.log('🚀 Starting registration...');
      
      // Use AuthContext register function
      await register({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        password: formData.password,
        factoryCode: formData.factoryCode,
      });

      console.log('✅ Registration completed, navigation handled by AuthContext');
      
      // Note: loading state will be false automatically when component unmounts
      // due to navigation in AuthContext
    } catch (error: any) {
      console.error('❌ Registration error in component:', error);
      
      // Parse error message
      let errorMessage = 'Kayıt başarısız. Lütfen bilgilerinizi kontrol edin.';
      
      if (error?.message) {
        if (error.message.includes('fabrika') || error.message.includes('factory')) {
          errorMessage = error.message;
          setErrors({ factoryCode: error.message });
        } else if (error.message.includes('email') || error.message.includes('Email')) {
          errorMessage = 'E-posta adresi geçersiz veya zaten kullanılıyor.';
          setErrors({ email: errorMessage });
        } else if (error.message.includes('password') || error.message.includes('Password')) {
          errorMessage = 'Şifre çok zayıf. Daha güçlü bir şifre seçin.';
          setErrors({ password: errorMessage });
        } else {
          errorMessage = error.message;
        }
      }
      
      setErrors({ general: errorMessage });
    } finally {
      // Always stop loading, even if navigation happens
      setLoading(false);
      console.log('🛑 Registration process ended, loading stopped');
    }
  };

  return (
    <AuthLayout>
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
        {/* Header */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Hesap Oluşturun</h2>
          <p className="text-gray-600">Kurumunuza katılın ve sisteme erişim sağlayın</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* General Error */}
          {errors.general && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {errors.general}
            </div>
          )}

          {/* Name Fields - Side by Side */}
          <div className="grid grid-cols-2 gap-4">
            {/* First Name */}
            <div>
              <label htmlFor="firstName" className="block text-sm font-semibold text-gray-700 mb-2">
                Ad
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  id="firstName"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  placeholder="Ahmet"
                  className={`w-full pl-11 pr-4 py-3 bg-gray-50 border rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 transition-all ${
                    errors.firstName
                      ? 'border-red-300 focus:ring-red-100 focus:border-red-400'
                      : 'border-gray-300 focus:ring-brand-100 focus:border-brand-400 hover:border-brand-300'
                  }`}
                />
              </div>
              {errors.firstName && <p className="mt-1.5 text-sm text-red-600">{errors.firstName}</p>}
            </div>

            {/* Last Name */}
            <div>
              <label htmlFor="lastName" className="block text-sm font-semibold text-gray-700 mb-2">
                Soyad
              </label>
              <input
                type="text"
                id="lastName"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                placeholder="Yılmaz"
                className={`w-full px-4 py-3 bg-gray-50 border rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 transition-all ${
                  errors.lastName
                    ? 'border-red-300 focus:ring-red-100 focus:border-red-400'
                    : 'border-gray-300 focus:ring-brand-100 focus:border-brand-400 hover:border-brand-300'
                }`}
              />
              {errors.lastName && <p className="mt-1.5 text-sm text-red-600">{errors.lastName}</p>}
            </div>
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
              E-posta Adresi
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="ornek@firma.com"
                className={`w-full pl-11 pr-4 py-3 bg-gray-50 border rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 transition-all ${
                  errors.email
                    ? 'border-red-300 focus:ring-red-100 focus:border-red-400'
                    : 'border-gray-300 focus:ring-brand-100 focus:border-brand-400 hover:border-brand-300'
                }`}
              />
            </div>
            {errors.email && <p className="mt-1.5 text-sm text-red-600">{errors.email}</p>}
          </div>

          {/* Factory Code */}
          <div>
            <label htmlFor="factoryCode" className="block text-sm font-semibold text-gray-700 mb-2">
              Kurum Kodu
            </label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                id="factoryCode"
                name="factoryCode"
                value={formData.factoryCode}
                onChange={handleChange}
                placeholder="FAB-2025"
                className={`w-full pl-11 pr-4 py-3 bg-gray-50 border rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 transition-all uppercase ${
                  errors.factoryCode
                    ? 'border-red-300 focus:ring-red-100 focus:border-red-400'
                    : 'border-gray-300 focus:ring-brand-100 focus:border-brand-400 hover:border-brand-300'
                }`}
              />
            </div>
            {errors.factoryCode && <p className="mt-1.5 text-sm text-red-600">{errors.factoryCode}</p>}
            <p className="mt-1.5 text-xs text-gray-500">
              Kurumunuzdan aldığınız fabrika katılım kodunu giriniz
            </p>
            <p className="mt-1 text-xs text-brand-600 font-medium">
              Örnek geçerli kodlar: FAB-2025, FACTORY-01, ANKARA-FAB
            </p>
          </div>

          {/* Password */}
          <div>
            <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
              Şifre
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                className={`w-full pl-11 pr-11 py-3 bg-gray-50 border rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 transition-all ${
                  errors.password
                    ? 'border-red-300 focus:ring-red-100 focus:border-red-400'
                    : 'border-gray-300 focus:ring-brand-100 focus:border-brand-400 hover:border-brand-300'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            {errors.password && <p className="mt-1.5 text-sm text-red-600">{errors.password}</p>}
          </div>

          {/* Confirm Password */}
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-700 mb-2">
              Şifre Tekrar
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="••••••••"
                className={`w-full pl-11 pr-11 py-3 bg-gray-50 border rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 transition-all ${
                  errors.confirmPassword
                    ? 'border-red-300 focus:ring-red-100 focus:border-red-400'
                    : 'border-gray-300 focus:ring-brand-100 focus:border-brand-400 hover:border-brand-300'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="mt-1.5 text-sm text-red-600">{errors.confirmPassword}</p>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-brand-600 text-white py-3 rounded-lg font-semibold hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-brand-500/30"
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Kayıt Yapılıyor...
              </>
            ) : (
              <>
                <UserPlus className="h-5 w-5" />
                Kayıt Ol
              </>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-white text-gray-500">veya</span>
          </div>
        </div>

        {/* Login Link */}
        <div className="text-center">
          <p className="text-gray-600">
            Zaten hesabınız var mı?{' '}
            <Link
              to="/login"
              className="font-semibold text-brand-600 hover:text-brand-700 transition-colors"
            >
              Giriş Yapın
            </Link>
          </p>
        </div>
      </div>
    </AuthLayout>
  );
}

