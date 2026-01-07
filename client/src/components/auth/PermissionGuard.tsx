import { ReactNode } from 'react';
import { useAuth } from '../../contexts/AuthContext';

interface PermissionGuardProps {
  children: ReactNode;
  allowedRoles: string[];
  fallback?: ReactNode;
}

/**
 * PermissionGuard - Rol bazlı UI element kontrolü
 * 
 * Kullanıcının rolü allowedRoles listesinde yoksa, children render edilmez.
 * Bu sayede yetkisiz kullanıcılar belirli butonları/bileşenleri göremez.
 * 
 * @param children - Korunacak bileşen/element
 * @param allowedRoles - İzin verilen roller listesi (örn: ['admin', 'technician'])
 * @param fallback - (Opsiyonel) Yetki yoksa gösterilecek alternatif içerik
 */
export default function PermissionGuard({ 
  children, 
  allowedRoles,
  fallback = null 
}: PermissionGuardProps) {
  const { user } = useAuth();

  // Kullanıcı yoksa veya rolü izin verilen listede değilse
  if (!user || !allowedRoles.includes(user.role)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

