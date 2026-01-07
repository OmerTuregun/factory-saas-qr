import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, LogIn, Loader2 } from 'lucide-react';
import AuthLayout from '../components/auth/AuthLayout';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const location = useLocation();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState<string>('');

  // Check for success message from registration
  useEffect(() => {
    const state = location.state as any;
    if (state?.message) {
      setSuccessMessage(state.message);
      // Prefill email if provided
      if (state?.email) {
        setFormData((prev) => ({ ...prev, email: state.email }));
      }
      // Clear the state
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

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

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setLoading(true);

    try {
      // Use AuthContext login function
      // This will authenticate user, fetch factory_id, and redirect
      await login(formData.email, formData.password, formData.rememberMe);

      // No need to navigate here - AuthContext will handle it
    } catch (error: any) {
      console.error('Login error:', error);
      setErrors({ general: error.message || 'Giriş başarısız. Lütfen bilgilerinizi kontrol edin.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
        {/* Header */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Hoş Geldiniz</h2>
          <p className="text-gray-600">Hesabınıza giriş yapın ve sisteme erişin</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Success Message from Registration */}
          {successMessage && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
              <div className="flex items-start gap-2">
                <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <div>
                  <p className="font-semibold mb-1">Kayıt Başarılı! 🎉</p>
                  <p>{successMessage}</p>
                </div>
              </div>
            </div>
          )}

          {/* General Error */}
          {errors.general && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {errors.general}
            </div>
          )}

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

          {/* Remember Me & Forgot Password */}
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer group">
              <input
                type="checkbox"
                name="rememberMe"
                checked={formData.rememberMe}
                onChange={handleChange}
                className="w-4 h-4 text-brand-600 border-gray-300 rounded focus:ring-2 focus:ring-brand-100 cursor-pointer"
              />
              <span className="text-sm text-gray-700 group-hover:text-gray-900 transition-colors">
                Beni Hatırla
              </span>
            </label>
            <Link
              to="/forgot-password"
              className="text-sm font-medium text-brand-600 hover:text-brand-700 transition-colors"
            >
              Şifremi Unuttum
            </Link>
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
                Giriş Yapılıyor...
              </>
            ) : (
              <>
                <LogIn className="h-5 w-5" />
                Giriş Yap
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

        {/* Register Link */}
        <div className="text-center">
          <p className="text-gray-600">
            Hesabınız yok mu?{' '}
            <Link
              to="/register"
              className="font-semibold text-brand-600 hover:text-brand-700 transition-colors"
            >
              Kayıt Olun
            </Link>
          </p>
        </div>
      </div>
    </AuthLayout>
  );
}

