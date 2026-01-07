import { useEffect, useState } from 'react';
import { Users, Mail, Shield, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import toast from 'react-hot-toast';

interface TeamMember {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  createdAt: string;
}

type UserRole = 'operator' | 'technician' | 'admin';

const roleColors = {
  admin: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
  technician: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  operator: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
};

const roleLabels = {
  admin: 'Admin',
  technician: 'Teknisyen',
  operator: 'Operatör',
};

export default function TeamManagement() {
  const { user, updateUserRole } = useAuth();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  useEffect(() => {
    fetchTeamMembers();
  }, [user?.factoryId]);

  const fetchTeamMembers = async () => {
    if (!user?.factoryId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const response = await fetch(
        `${supabaseUrl}/rest/v1/profiles?factory_id=eq.${user.factoryId}&select=id,first_name,last_name,email,role,created_at&order=created_at.desc`,
        {
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Ekip üyeleri yüklenemedi');
      }

      const data = await response.json();
      
      const members: TeamMember[] = data.map((member: any) => ({
        id: member.id,
        firstName: member.first_name || '',
        lastName: member.last_name || '',
        email: member.email || '',
        role: member.role || 'operator',
        createdAt: member.created_at,
      }));

      setTeamMembers(members);
    } catch (err: any) {
      console.error('Error fetching team members:', err);
      setError('Ekip üyeleri yüklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    // Kullanıcı kendi rolünü değiştiremez
    if (userId === user?.id) {
      toast.error('Kendi rolünüzü değiştiremezsiniz!');
      return;
    }

    try {
      setUpdatingUserId(userId);
      
      if (!updateUserRole) {
        throw new Error('Rol güncelleme fonksiyonu bulunamadı');
      }

      await updateUserRole(userId, newRole);

      // Local state'i güncelle
      setTeamMembers((prev) =>
        prev.map((member) =>
          member.id === userId ? { ...member, role: newRole } : member
        )
      );

      toast.success('Rol başarıyla güncellendi!');
    } catch (err: any) {
      console.error('Error updating role:', err);
      toast.error(err.message || 'Rol güncellenirken bir hata oluştu.');
    } finally {
      setUpdatingUserId(null);
    }
  };

  const getInitials = (firstName: string, lastName: string) => {
    const firstInitial = firstName?.charAt(0)?.toUpperCase() || '';
    const lastInitial = lastName?.charAt(0)?.toUpperCase() || '';
    return `${firstInitial}${lastInitial}` || '??';
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={fetchTeamMembers} />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Ekip Yönetimi
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Fabrika çalışanlarını yönetin ve rol atayın
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg">
          <Users className="h-5 w-5" />
          <span className="font-semibold">{teamMembers.length} Çalışan</span>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
        <div>
          <h3 className="font-semibold text-amber-900 dark:text-amber-200">
            Önemli Bilgi
          </h3>
          <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
            Bir kullanıcının rolünü değiştirdiğinizde, yetkileri anında güncellenir. 
            Kendi rolünüzü değiştiremezsiniz.
          </p>
        </div>
      </div>

      {/* Team Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gradient-to-r from-brand-600 to-brand-700 border-b border-brand-800">
                <th className="text-left py-3 px-4 text-xs font-semibold text-white uppercase tracking-wider">
                  Kullanıcı
                </th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-white uppercase tracking-wider">
                  E-posta
                </th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-white uppercase tracking-wider">
                  Rol
                </th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-white uppercase tracking-wider">
                  Eklenme Tarihi
                </th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-white uppercase tracking-wider">
                  İşlemler
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {teamMembers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12">
                    <Users className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-500 dark:text-gray-400">
                      Henüz ekip üyesi bulunmuyor
                    </p>
                  </td>
                </tr>
              ) : (
                teamMembers.map((member) => (
                  <tr
                    key={member.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    {/* User Info */}
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white font-semibold text-sm">
                          {getInitials(member.firstName, member.lastName)}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {member.firstName} {member.lastName}
                          </p>
                          {member.id === user?.id && (
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              (Siz)
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Email */}
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                        <Mail className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                        {member.email}
                      </div>
                    </td>

                    {/* Current Role Badge */}
                    <td className="py-4 px-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                          roleColors[member.role as UserRole] || roleColors.operator
                        }`}
                      >
                        <Shield className="h-3 w-3" />
                        {roleLabels[member.role as UserRole] || 'Operatör'}
                      </span>
                    </td>

                    {/* Created Date */}
                    <td className="py-4 px-4 text-sm text-gray-600 dark:text-gray-300">
                      {new Date(member.createdAt).toLocaleDateString('tr-TR', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>

                    {/* Role Change Dropdown */}
                    <td className="py-4 px-4">
                      <select
                        value={member.role}
                        onChange={(e) =>
                          handleRoleChange(member.id, e.target.value as UserRole)
                        }
                        disabled={member.id === user?.id || updatingUserId === member.id}
                        className={`px-3 py-2 text-sm border rounded-lg transition-colors ${
                          member.id === user?.id
                            ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                            : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 hover:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500 cursor-pointer'
                        }`}
                      >
                        <option value="operator">Operatör</option>
                        <option value="technician">Teknisyen</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Role Legend */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
          Rol Açıklamaları
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg">
              <Shield className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="font-medium text-gray-900 dark:text-white">Operatör</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                QR okutma ve arıza bildirimi yapabilir
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
              <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="font-medium text-gray-900 dark:text-white">Teknisyen</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Arızaları görüntüler ve çözebilir
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="p-2 bg-rose-50 dark:bg-rose-900/30 rounded-lg">
              <Shield className="h-5 w-5 text-rose-600 dark:text-rose-400" />
            </div>
            <div>
              <p className="font-medium text-gray-900 dark:text-white">Admin</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Tam yetki: Makine, ekip ve rol yönetimi
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

