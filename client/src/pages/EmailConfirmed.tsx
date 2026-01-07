import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { CheckCircle, XCircle, Loader } from 'lucide-react';

export default function EmailConfirmed() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('E-posta adresiniz doğrulanıyor...');

  useEffect(() => {
    const confirmEmail = async () => {
      try {
        // Get the token from URL
        const token_hash = searchParams.get('token_hash');
        const type = searchParams.get('type');

        if (!token_hash || type !== 'email') {
          setStatus('error');
          setMessage('Geçersiz doğrulama linki.');
          return;
        }

        // Verify the email using Supabase
        const { error } = await supabase.auth.verifyOtp({
          token_hash,
          type: 'email',
        });

        if (error) {
          console.error('Email verification error:', error);
          setStatus('error');
          setMessage('E-posta doğrulama başarısız. Lütfen tekrar deneyin.');
        } else {
          setStatus('success');
          setMessage('E-posta adresiniz başarıyla doğrulandı! Artık giriş yapabilirsiniz.');
        }
      } catch (error) {
        console.error('Confirmation error:', error);
        setStatus('error');
        setMessage('Bir hata oluştu. Lütfen tekrar deneyin.');
      }
    };

    confirmEmail();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
          {/* Logo/Brand */}
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-2xl flex items-center justify-center">
              <span className="text-white text-2xl font-bold">QR</span>
            </div>
          </div>

          {/* Status Icon */}
          <div className="mb-6">
            {status === 'loading' && (
              <div className="flex justify-center">
                <Loader className="w-16 h-16 text-blue-600 animate-spin" />
              </div>
            )}
            
            {status === 'success' && (
              <div className="flex justify-center">
                <CheckCircle className="w-16 h-16 text-green-500" />
              </div>
            )}
            
            {status === 'error' && (
              <div className="flex justify-center">
                <XCircle className="w-16 h-16 text-red-500" />
              </div>
            )}
          </div>

          {/* Message */}
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            {status === 'loading' && 'Doğrulanıyor...'}
            {status === 'success' && 'Başarılı!'}
            {status === 'error' && 'Hata!'}
          </h1>
          
          <p className="text-gray-600 mb-6">{message}</p>

          {/* Action Button */}
          {status === 'success' && (
            <div className="space-y-3">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-green-800">
                  ✓ Hesabınız aktif edildi
                </p>
                <p className="text-sm text-green-700 mt-1">
                  Giriş yapmak için açık olan login sayfasına dönebilirsiniz.
                </p>
              </div>
              
              <button
                onClick={() => navigate('/login')}
                className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Giriş Sayfasına Git
              </button>
            </div>
          )}

          {status === 'error' && (
            <button
              onClick={() => navigate('/login')}
              className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Giriş Sayfasına Dön
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
