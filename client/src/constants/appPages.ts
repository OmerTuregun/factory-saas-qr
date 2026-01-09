export interface AppPage {
  title: string;
  url: string;
  keywords: string[];
  requiredRole?: 'admin' | 'technician' | 'operator';
  icon?: string; // Icon name for display (optional)
}

/**
 * Uygulama sayfaları ve arama anahtar kelimeleri
 * Global Search'te kullanıcı bu anahtar kelimeleri yazdığında ilgili sayfaya yönlendirilir
 */
export const APP_PAGES: AppPage[] = [
  {
    title: 'Dashboard',
    url: '/',
    keywords: [
      'anasayfa',
      'özet',
      'home',
      'main',
      'giriş',
      'dashboard',
      'kontrol paneli',
      'genel bakış',
    ],
  },
  {
    title: 'Makineler',
    url: '/machines',
    keywords: [
      'makine listesi',
      'cihazlar',
      'ekipmanlar',
      'machines',
      'tüm makineler',
      'makine',
      'cihaz',
      'ekipman',
      'makine listesi',
      'makine yönetimi',
    ],
  },
  {
    title: 'Bakım Geçmişi / Arızalar',
    url: '/maintenance',
    keywords: [
      'arızalar',
      'bakımlar',
      'loglar',
      'geçmiş',
      'maintenance',
      'tüm bakımlar',
      'faults',
      'bakım',
      'arıza',
      'bakım geçmişi',
      'arıza geçmişi',
      'bakım kayıtları',
      'arıza kayıtları',
    ],
  },
  {
    title: 'Bildirimler',
    url: '/notifications',
    keywords: [
      'bildirim',
      'bildirimler',
      'notifications',
      'uyarılar',
      'alarmlar',
      'mesajlar',
    ],
  },
  {
    title: 'Raporlar',
    url: '/reports',
    keywords: [
      'analiz',
      'grafik',
      'excel',
      'pdf',
      'istatistik',
      'rapor',
      'raporlar',
      'reports',
      'analizler',
      'istatistikler',
    ],
    requiredRole: 'technician', // Technician ve admin görebilir (operator göremez)
  },
  {
    title: 'Profil & Ayarlar',
    url: '/profile',
    keywords: [
      'hesap',
      'ayarlar',
      'bildirim ayarları',
      'çıkış',
      'settings',
      'profil',
      'kullanıcı ayarları',
      'hesap ayarları',
      'profil ayarları',
    ],
  },
  {
    title: 'Ekip Yönetimi',
    url: '/team',
    keywords: [
      'ekip',
      'takım',
      'personel',
      'kullanıcılar',
      'team',
      'users',
      'ekip yönetimi',
      'takım yönetimi',
      'personel yönetimi',
      'kullanıcı yönetimi',
    ],
    requiredRole: 'admin', // Sadece admin görebilir
  },
  {
    title: 'QR Tarayıcı',
    url: '/scan',
    keywords: [
      'qr',
      'tarayıcı',
      'scanner',
      'qr kod',
      'qr tarama',
      'kamera',
      'scan',
    ],
  },
  {
    title: 'Denetim Günlükleri',
    url: '/audit-logs',
    keywords: [
      'log',
      'audit',
      'güvenlik',
      'kim ne yaptı',
      'denetim',
      'günlük',
      'audit log',
      'audit logs',
      'denetim günlüğü',
      'denetim günlükleri',
    ],
    requiredRole: 'admin', // Sadece admin görebilir
  },
];

/**
 * Kullanıcı rolüne göre erişilebilir sayfaları filtrele
 */
export function getAccessiblePages(userRole?: string): AppPage[] {
  if (!userRole) return [];

  return APP_PAGES.filter((page) => {
    // requiredRole yoksa herkes erişebilir
    if (!page.requiredRole) return true;

    // requiredRole varsa, role göre kontrol et
    if (page.requiredRole === 'admin') {
      return userRole === 'admin';
    }
    if (page.requiredRole === 'technician') {
      return userRole === 'admin' || userRole === 'technician';
    }
    if (page.requiredRole === 'operator') {
      return true; // Operator herkes görebilir (zaten en düşük yetki)
    }

    return true;
  });
}

/**
 * Arama sorgusuna göre eşleşen sayfaları bul
 * @param query - Kullanıcının yazdığı arama metni
 * @param userRole - Kullanıcının rolü (admin, technician, operator)
 * @returns Eşleşen sayfalar (relevance'e göre sıralı)
 */
export function findMatchingPages(query: string, userRole?: string): AppPage[] {
  if (!query || query.trim().length < 2) return [];

  const normalizedQuery = query.trim().toLowerCase();
  const accessiblePages = getAccessiblePages(userRole);

  // Eşleşme skoruna göre sıralama
  const scoredPages = accessiblePages
    .map((page) => {
      let score = 0;

      // Title tam eşleşmesi (en yüksek öncelik)
      if (page.title.toLowerCase().includes(normalizedQuery)) {
        score += 100;
      }

      // Keywords ile eşleşme
      const matchingKeywords = page.keywords.filter((keyword) =>
        keyword.toLowerCase().includes(normalizedQuery) ||
        normalizedQuery.includes(keyword.toLowerCase())
      );

      if (matchingKeywords.length > 0) {
        // Tam eşleşme varsa daha yüksek skor
        const exactMatch = matchingKeywords.some(
          (kw) => kw.toLowerCase() === normalizedQuery
        );
        if (exactMatch) {
          score += 50;
        } else {
          score += matchingKeywords.length * 10;
        }
      }

      return { page, score };
    })
    .filter((item) => item.score > 0) // Sadece eşleşenleri al
    .sort((a, b) => b.score - a.score) // Yüksek skordan düşüğe sırala
    .map((item) => item.page);

  return scoredPages;
}
