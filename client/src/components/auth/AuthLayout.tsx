import { Zap } from 'lucide-react';
import { ReactNode } from 'react';

interface AuthLayoutProps {
  children: ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex">
      {/* Left Side - Brand Section */}
      <div className="hidden lg:flex lg:flex-1 relative overflow-hidden bg-gradient-to-br from-slate-900 via-brand-900 to-slate-800">
        {/* Decorative Elements */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6bTItMnYyaDJ2LTJoLTJ6bTItMnYyaDJ2LTJoLTJ6bTItMnYyaDJ2LTJoLTJ6bTItMnYyaDJ2LTJoLTJ6bTItMnYyaDJ2LTJoLTJ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-30"></div>
        
        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center items-start px-16 text-white">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-8">
            <div className="p-3 bg-brand-500 rounded-xl shadow-xl">
              <Zap className="h-8 w-8 text-white" strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-3xl font-bold">QR Fabrika</h1>
              <p className="text-sm text-slate-300">Asset & Maintenance Tracking</p>
            </div>
          </div>

          {/* Slogan */}
          <div className="space-y-4 max-w-md">
            <h2 className="text-4xl font-bold leading-tight">
              Fabrika Yönetimini <span className="text-brand-400">Dijitalleştirin</span>
            </h2>
            <p className="text-lg text-slate-300 leading-relaxed">
              QR kod tabanlı akıllı takip sistemi ile makinelerinizi yönetin, arızaları anında kaydedin ve üretim süreçlerinizi optimize edin.
            </p>
          </div>

          {/* Features */}
          <div className="mt-12 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-brand-400 rounded-full"></div>
              <p className="text-slate-300">QR Kod ile Hızlı Arıza Bildirimi</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-brand-400 rounded-full"></div>
              <p className="text-slate-300">Gerçek Zamanlı Makine Takibi</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-brand-400 rounded-full"></div>
              <p className="text-slate-300">Detaylı Raporlama ve Analiz</p>
            </div>
          </div>

          {/* Bottom Text */}
          <div className="absolute bottom-10 left-16 text-slate-400 text-sm">
            © 2025 QR Fabrika. Tüm hakları saklıdır.
          </div>
        </div>

        {/* Decorative Shape */}
        <div className="absolute -right-20 top-1/4 w-96 h-96 bg-brand-500 rounded-full opacity-10 blur-3xl"></div>
        <div className="absolute -right-10 bottom-1/4 w-72 h-72 bg-slate-600 rounded-full opacity-10 blur-3xl"></div>
      </div>

      {/* Right Side - Form Section */}
      <div className="flex-1 flex items-center justify-center p-8 bg-gray-50">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center justify-center gap-2 mb-8">
            <div className="p-2 bg-brand-500 rounded-lg">
              <Zap className="h-6 w-6 text-white" strokeWidth={2.5} />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">QR Fabrika</h1>
          </div>

          {children}
        </div>
      </div>
    </div>
  );
}

