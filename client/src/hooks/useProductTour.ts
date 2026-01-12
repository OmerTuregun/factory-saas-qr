import { useEffect, useRef } from 'react';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { supabase } from '../lib/supabase';

export type TourKey = 'fault-report' | 'qr-scan' | 'track' | 'notifications';

interface TourStep {
  element: string;
  popover: {
    title: string;
    description: string;
    side?: 'top' | 'right' | 'bottom' | 'left';
    align?: 'start' | 'center' | 'end';
    progressText?: string; // Manuel progress text override
    doneBtnText?: string; // Son adım için buton metni
    nextBtnText?: string; // Ara adımlar için buton metni
  };
}

// Dashboard sayfasındaki adımlar
const TOURS_DASHBOARD: Record<TourKey, TourStep[]> = {
  'fault-report': [
    {
      element: '#btn-report-fault',
      popover: {
        title: 'Arıza Bildirme',
        description: 'Yeni bir arıza kaydı oluşturmak için buraya tıklayın. QR kodunu okuttuktan sonra arıza bildirme sayfasına yönlendirileceksiniz.',
        side: 'bottom',
        align: 'center',
      },
    },
  ],
  'qr-scan': [
    {
      element: '#btn-qr-scan',
      popover: {
        title: 'QR Kod Tarama',
        description: 'Hızlı arıza bildirimi için önce QR Tara butonuna tıklayın.',
        side: 'bottom',
        align: 'center',
        progressText: 'Adım 1 / 5',
        doneBtnText: 'İlerle', // Tek adım olduğu için driver.js "Done" butonu koyar, biz bunu "İlerle" yapıyoruz
      },
    },
  ],
  'track': [
    {
      element: '#nav-maintenance',
      popover: {
        title: 'Bakım Geçmişi',
        description: 'Bakım sayfasına gitmek için tıklayın.',
        side: 'right',
        align: 'center',
        progressText: 'Adım 1 / 3', // Manuel progress text
      },
    },
  ],
  'notifications': [
    {
      element: '#nav-notifications',
      popover: {
        title: 'Bildirimler',
        description: 'Bildirimlerinizi buradan takip edebilirsiniz. Tıklayarak bildirimler sayfasına gidelim.',
        side: 'right',
        align: 'center',
        progressText: 'Adım 1 / 3',
        doneBtnText: 'İlerle',
      },
    },
  ],
};

// QR Scanner sayfasındaki adımlar
const TOURS_QR_SCANNER: Record<TourKey, TourStep[]> = {
  'qr-scan': [
    {
      element: '#qr-scanner-viewport',
      popover: {
        title: 'QR Kod Okutma',
        description: 'Bu alana makine üzerindeki QR kodu okutarak formu otomatik açabilirsiniz. Tur için otomatik devam ediyoruz...',
        side: 'top',
        align: 'center',
        progressText: 'Adım 2 / 5',
        doneBtnText: 'İlerle', // Tek adım olduğu için driver.js "Done" butonu koyar, biz bunu "İlerle" yapıyoruz
      },
    },
  ],
  'fault-report': [  ],
  'track': [],
  'notifications': [
    {
      element: '#notification-filters',
      popover: {
        title: 'Filtreler',
        description: 'Okundu/Okunmadı filtrelerini buradan yönetebilirsiniz.',
        side: 'bottom',
        align: 'center',
        progressText: 'Adım 2 / 3',
        nextBtnText: 'İlerle',
      },
    },
    {
      element: '#notification-list',
      popover: {
        title: 'Bildirim Listesi',
        description: 'Oluşturulan arızaları burada bildirim olarak alırsınız. Bir mesaja tıkladığınızda, yani detayına eriştiğinizde okundu olarak işaretlenir.',
        side: 'top',
        align: 'center',
        progressText: 'Adım 3 / 3',
        doneBtnText: 'Bitir',
      },
    },
  ],
};

// ReportFault sayfasındaki adımlar
const TOURS_REPORT_FAULT: Record<TourKey, TourStep[]> = {
  'fault-report': [
    {
      element: '#input-fault-description',
      popover: {
        title: 'Arıza Açıklaması',
        description: 'Arızayı kısaca tanımlayın. Detaylı açıklama yapmanız sorunun çözülmesini hızlandırır.',
        side: 'top',
        align: 'start',
      },
    },
    {
      element: '#btn-save-fault',
      popover: {
        title: 'Kaydet',
        description: 'Son olarak kaydet butonuna tıklayarak arıza kaydını oluşturun.',
        side: 'top',
        align: 'center',
      },
    },
  ],
  'track': [],
  'notifications': [],
  'qr-scan': [
    {
      element: '#input-fault-description',
      popover: {
        title: 'Arıza Açıklaması',
        description: 'Sorunu kısaca buraya yazın (Örn: Motor aşırı ısınıyor).',
        side: 'top',
        align: 'start',
        progressText: 'Adım 3 / 5',
        nextBtnText: 'İlerle',
      },
    },
    {
      element: '#select-priority',
      popover: {
        title: 'Öncelik Seviyesi',
        description: 'Arızanın aciliyet durumunu buradan belirleyin.',
        side: 'top',
        align: 'center',
        progressText: 'Adım 4 / 5',
        nextBtnText: 'İlerle',
      },
    },
    {
      element: '#btn-submit-fault',
      popover: {
        title: 'Kaydet',
        description: 'Son olarak bu butona basarak arıza kaydını tamamlayın. Tur tamamlandığında Dashboard\'a yönlendirileceksiniz.',
        side: 'top',
        align: 'center',
        progressText: 'Adım 5 / 5',
        doneBtnText: 'Bitir',
      },
    },
  ],
};

// Maintenance sayfasındaki adımlar (sidebar linki hariç, sadece sayfa içi adımlar)
const TOURS_MAINTENANCE: Record<TourKey, TourStep[]> = {
  'track': [
    {
      element: '#maintenance-table',
      popover: {
        title: 'Bakım Kayıtları Tablosu',
        description: 'Tüm kayıtlarınız burada listelenir.',
        side: 'top',
        align: 'center',
        progressText: 'Adım 2 / 3', // Manuel progress text
      },
    },
    {
      element: '#maintenance-filters',
      popover: {
        title: 'Filtreleme Seçenekleri',
        description: 'Buradan tarih ve duruma göre filtreleme yapabilirsiniz.',
        side: 'bottom',
        align: 'center',
        progressText: 'Adım 3 / 3', // Manuel progress text
      },
    },
  ],
  'fault-report': [],
  'qr-scan': [],
  'notifications': [
    {
      element: '#notification-filters',
      popover: {
        title: 'Filtreler',
        description: 'Okundu/Okunmadı filtrelerini buradan yönetebilirsiniz.',
        side: 'bottom',
        align: 'center',
        progressText: 'Adım 2 / 3',
        nextBtnText: 'İlerle',
      },
    },
    {
      element: '#notification-list',
      popover: {
        title: 'Bildirim Listesi',
        description: 'Oluşturulan arızaları burada bildirim olarak alırsınız. Bir mesaja tıkladığınızda, yani detayına eriştiğinizde okundu olarak işaretlenir.',
        side: 'top',
        align: 'center',
        progressText: 'Adım 3 / 3',
        doneBtnText: 'Bitir',
      },
    },
  ],
};

// Tüm turlar (fallback)
const TOURS: Record<TourKey, TourStep[]> = {
  'fault-report': [
    {
      element: '#btn-report-fault',
      popover: {
        title: 'Arıza Bildirme',
        description: 'Yeni bir arıza kaydı oluşturmak için buraya tıklayın. QR kodunu okuttuktan sonra arıza bildirme sayfasına yönlendirileceksiniz.',
        side: 'bottom',
        align: 'center',
      },
    },
    {
      element: '#input-fault-description',
      popover: {
        title: 'Arıza Açıklaması',
        description: 'Arızayı kısaca tanımlayın. Detaylı açıklama yapmanız sorunun çözülmesini hızlandırır.',
        side: 'top',
        align: 'start',
      },
    },
    {
      element: '#btn-save-fault',
      popover: {
        title: 'Kaydet',
        description: 'Son olarak kaydet butonuna tıklayarak arıza kaydını oluşturun.',
        side: 'top',
        align: 'center',
      },
    },
  ],
  'qr-scan': [
    {
      element: '#btn-qr-scan',
      popover: {
        title: 'QR Kod Tarama',
        description: 'Makine başındayken bu butona basarak kamerayı açın ve makine üzerindeki QR kodu okutun.',
        side: 'bottom',
        align: 'center',
      },
    },
  ],
  'track': [
    {
      element: '#nav-maintenance',
      popover: {
        title: 'Bakım Geçmişi',
        description: 'Bakım sayfasına gitmek için tıklayın.',
        side: 'right',
        align: 'center',
      },
    },
    {
      element: '#maintenance-table',
      popover: {
        title: 'Bakım Kayıtları Tablosu',
        description: 'Tüm kayıtlarınız burada listelenir.',
        side: 'top',
        align: 'center',
      },
    },
    {
      element: '#maintenance-filters',
      popover: {
        title: 'Filtreleme Seçenekleri',
        description: 'Buradan tarih ve duruma göre filtreleme yapabilirsiniz.',
        side: 'bottom',
        align: 'center',
      },
    },
  ],
  'notifications': [],
};

export function useProductTour() {
  const driverObjRef = useRef<ReturnType<typeof driver> | null>(null);

  useEffect(() => {
    // Driver.js'i konfigüre et
    driverObjRef.current = driver({
      animate: true,
      allowClose: true,
      overlayColor: '#000000',
      overlayOpacity: 0.5,
      showProgress: true,
      showButtons: ['next', 'previous', 'close'],
      nextBtnText: 'İleri',
      prevBtnText: 'Geri',
      doneBtnText: 'Bitir',
      progressText: 'Adım {{current}} / {{total}}',
      onDestroyStarted: () => {
        // Tur iptal edildiğinde
        driverObjRef.current?.destroy();
      },
    });

    console.log('✅ [TOUR] Driver instance created');

    return () => {
      // Cleanup
      if (driverObjRef.current) {
        driverObjRef.current.destroy();
        driverObjRef.current = null;
      }
    };
  }, []);

  const startTour = async (tourKey: TourKey) => {
    if (!driverObjRef.current) {
      console.error('Driver.js is not initialized');
      return;
    }

    // Elementlerin render edilmesini bekle
    setTimeout(async () => {
      // Sayfa bazlı tur seçimi
      const currentPath = window.location.pathname;
      let steps: TourStep[] = [];

      console.log(`🎯 [TOUR] Starting tour "${tourKey}" on path: ${currentPath}`);

      if (currentPath === '/report-fault' || currentPath.startsWith('/report-fault/')) {
        // ReportFault sayfasındaysak, o sayfaya özel adımları kullan
        steps = TOURS_REPORT_FAULT[tourKey] || [];
        console.log(`📋 [TOUR] Using ReportFault steps:`, steps);
      } else if (currentPath === '/scan') {
        // QR Scanner sayfasındaysak, scanner adımlarını kullan
        steps = TOURS_QR_SCANNER[tourKey] || [];
        console.log(`📋 [TOUR] Using QR Scanner steps:`, steps);
      } else if (currentPath === '/maintenance') {
        // Maintenance sayfasındaysak, maintenance adımlarını kullan (sidebar linki hariç)
        steps = TOURS_MAINTENANCE[tourKey] || [];
        console.log(`📋 [TOUR] Using Maintenance steps:`, steps);
      } else if (currentPath === '/notifications') {
        // Notifications sayfasındaysak, notifications adımlarını kullan
        steps = TOURS_MAINTENANCE[tourKey] || [];
        console.log(`📋 [TOUR] Using Notifications steps:`, steps);
      } else {
        // Dashboard veya diğer sayfalarda, Dashboard adımlarını kullan
        steps = TOURS_DASHBOARD[tourKey] || TOURS[tourKey] || [];
        console.log(`📋 [TOUR] Using Dashboard steps:`, steps);
      }

      if (!steps || steps.length === 0) {
        console.error(`❌ [TOUR] Tour "${tourKey}" not found for current page`);
        return;
      }

      // Sadece DOM'da mevcut olan elementleri filtrele (string selector olarak tut)
      const availableSteps = steps.filter((step) => {
        const element = document.querySelector(step.element);
        if (!element) {
          console.warn(`⚠️ [TOUR] Element not found: ${step.element}`);
          return false;
        }
        console.log(`✅ [TOUR] Element found: ${step.element}`, element);
        return true;
      });

      console.log(`📊 [TOUR] Available steps: ${availableSteps.length} / ${steps.length}`);

      if (availableSteps.length === 0) {
        console.warn(`⚠️ [TOUR] No available steps for tour "${tourKey}". Elements may not be rendered yet.`);
        return;
      }

      // Tur adımlarını driver.js formatına çevir (string selector olarak)
      // Driver.js'in beklediği format: { element: string, popover: { title, description, ... } }
      const driverSteps = availableSteps.map((step) => {
        // Element'i tekrar kontrol et
        const element = document.querySelector(step.element);
        if (!element) {
          console.warn(`⚠️ [TOUR] Element disappeared: ${step.element}`);
          return null;
        }

        return {
          element: step.element, // String selector olarak geçir
          popover: {
            title: step.popover.title,
            description: step.popover.description,
            side: step.popover.side || 'bottom',
            align: step.popover.align || 'center',
            ...(step.popover.progressText && { progressText: step.popover.progressText }), // Manuel progress text varsa ekle
            ...(step.popover.doneBtnText && { doneBtnText: step.popover.doneBtnText }), // Son adım buton metni
            ...(step.popover.nextBtnText && { nextBtnText: step.popover.nextBtnText }), // Ara adım buton metni
          },
        };
      }).filter((step): step is NonNullable<typeof step> => step !== null);

      console.log(`🚀 [TOUR] Starting driver with ${driverSteps.length} steps:`, driverSteps);
      console.log(`🔍 [TOUR] First step details:`, {
        element: driverSteps[0]?.element,
        elementType: typeof driverSteps[0]?.element,
        popover: driverSteps[0]?.popover,
      });

      // Son kontrol: driverSteps boş olmamalı
      if (driverSteps.length === 0) {
        console.error(`❌ [TOUR] No valid steps to drive. Available steps: ${availableSteps.length}`);
        return;
      }

      // Her adımın geçerli olduğundan emin ol
      const validSteps = driverSteps.filter((step) => {
        const isValid = step.element && step.popover && step.popover.title && step.popover.description;
        if (!isValid) {
          console.warn(`⚠️ [TOUR] Invalid step:`, step);
        }
        return isValid;
      });

      if (validSteps.length === 0) {
        console.error(`❌ [TOUR] No valid steps after validation`);
        return;
      }

      console.log(`✅ [TOUR] Valid steps: ${validSteps.length}`);
      console.log(`📝 [TOUR] Steps JSON:`, JSON.stringify(validSteps, null, 2));

      // Driver instance'ının hazır olduğundan emin ol
      if (!driverObjRef.current) {
        console.error(`❌ [TOUR] Driver instance is null`);
        return;
      }

      // Son kontrol: Elementlerin gerçekten DOM'da olduğundan emin ol
      const finalSteps = validSteps.filter((step) => {
        const element = typeof step.element === 'string' 
          ? document.querySelector(step.element)
          : step.element;
        if (!element) {
          console.warn(`⚠️ [TOUR] Element not found in DOM: ${step.element}`);
          return false;
        }
        // Element görünür mü kontrol et
        const rect = element.getBoundingClientRect();
        const isVisible = rect.width > 0 && rect.height > 0;
        if (!isVisible) {
          console.warn(`⚠️ [TOUR] Element is not visible: ${step.element}`, rect);
        }
        return isVisible;
      });

      if (finalSteps.length === 0) {
        console.error(`❌ [TOUR] No visible steps found`);
        return;
      }

      console.log(`✅ [TOUR] Final visible steps: ${finalSteps.length}`);

      // Multi-page persistence: Eğer "track" turu ise ve Dashboard'da isek, 
      // kullanıcı sidebar linkine tıkladığında localStorage'a kaydet
      if (tourKey === 'track' && currentPath === '/') {
        // Sidebar linkine click listener ekle
        const maintenanceLink = document.querySelector('#nav-maintenance');
        if (maintenanceLink) {
          const handleLinkClick = () => {
            localStorage.setItem('active_tour', JSON.stringify({
              tourKey: 'track',
              timestamp: Date.now(),
            }));
            console.log('💾 [TOUR] Saved track tour state to localStorage');
          };
          
          maintenanceLink.addEventListener('click', handleLinkClick, { once: true });
          
          // Tur bittiğinde listener'ı temizle
          setTimeout(() => {
            maintenanceLink.removeEventListener('click', handleLinkClick);
          }, 10000); // 10 saniye sonra temizle
        }
      }

      // Multi-page persistence: Eğer "notifications" turu ise ve Dashboard'da isek,
      // Bildirimler sidebar linkine tıklandığında localStorage'a kaydet
      // Bu listener'ı tur başlamadan ÖNCE ekle ki kullanıcı direkt linke tıklayabilir
      if (tourKey === 'notifications' && currentPath === '/') {
        const notificationsLink = document.querySelector('#nav-notifications');
        if (notificationsLink) {
          const handleNotificationsLinkClick = () => {
            // Tur başladıysa ve hala aktifse kaydet
            const savedTour = localStorage.getItem('active_tour');
            if (!savedTour || JSON.parse(savedTour).tourKey === 'notifications') {
              localStorage.setItem('active_tour', JSON.stringify({
                tourKey: 'notifications',
                stepIndex: 1, // İlk adımı tamamladık
                timestamp: Date.now(),
              }));
              console.log('💾 [TOUR] Saved notifications tour state to localStorage (link click)');
            }
          };
          
          // Listener'ı ekle (once: false, çünkü tur başlamadan önce de çalışabilir)
          notificationsLink.addEventListener('click', handleNotificationsLinkClick);
          
          // 30 saniye sonra listener'ı temizle
          setTimeout(() => {
            notificationsLink.removeEventListener('click', handleNotificationsLinkClick);
          }, 30000);
        }
      }

      // Multi-page persistence: Eğer "notifications" turu ise ve Dashboard'da isek,
      // Bildirimler sidebar linkine tıklandığında localStorage'a kaydet
      // Bu listener'ı tur başlamadan ÖNCE ekle ki kullanıcı direkt linke tıklayabilir
      if (tourKey === 'notifications' && currentPath === '/') {
        const notificationsLink = document.querySelector('#nav-notifications');
        if (notificationsLink) {
          const handleNotificationsLinkClick = () => {
            // Tur başladıysa ve hala aktifse kaydet
            const savedTour = localStorage.getItem('active_tour');
            if (!savedTour || JSON.parse(savedTour).tourKey === 'notifications') {
              localStorage.setItem('active_tour', JSON.stringify({
                tourKey: 'notifications',
                stepIndex: 1, // İlk adımı tamamladık
                timestamp: Date.now(),
              }));
              console.log('💾 [TOUR] Saved notifications tour state to localStorage (link click)');
            }
          };
          
          // Listener'ı ekle (once: false, çünkü tur başlamadan önce de çalışabilir)
          notificationsLink.addEventListener('click', handleNotificationsLinkClick);
          
          // 30 saniye sonra listener'ı temizle
          setTimeout(() => {
            notificationsLink.removeEventListener('click', handleNotificationsLinkClick);
          }, 30000);
        }
      }

      // Multi-page persistence: Eğer "qr-scan" turu ise ve Dashboard'da isek,
      // QR Tara butonuna tıklandığında localStorage'a kaydet
      // Bu listener'ı tur başlamadan ÖNCE ekle ki kullanıcı direkt butona tıklayabilir
      if (tourKey === 'qr-scan' && currentPath === '/') {
        const qrScanButton = document.querySelector('#btn-qr-scan');
        if (qrScanButton) {
          const handleQrButtonClick = () => {
            // Tur başladıysa ve hala aktifse kaydet
            const savedTour = localStorage.getItem('active_tour');
            if (!savedTour || JSON.parse(savedTour).tourKey === 'qr-scan') {
              localStorage.setItem('active_tour', JSON.stringify({
                tourKey: 'qr-scan',
                stepIndex: 1, // İlk adımı tamamladık
                timestamp: Date.now(),
              }));
              console.log('💾 [TOUR] Saved qr-scan tour state to localStorage (button click)');
            }
          };
          
          // Listener'ı ekle (once: false, çünkü tur başlamadan önce de çalışabilir)
          qrScanButton.addEventListener('click', handleQrButtonClick);
          
          // 30 saniye sonra listener'ı temizle
          setTimeout(() => {
            qrScanButton.removeEventListener('click', handleQrButtonClick);
          }, 30000);
        }
      }

      // Multi-page persistence: Eğer "qr-scan" turu ise ve QR Scanner sayfasındaysak,
      // kullanıcı Manuel Giriş butonuna tıkladığında localStorage'a kaydet
      if (tourKey === 'qr-scan' && currentPath === '/scan') {
        const manualButton = document.querySelector('#btn-manual-entry');
        if (manualButton) {
          const handleManualButtonClick = () => {
            localStorage.setItem('active_tour', JSON.stringify({
              tourKey: 'qr-scan',
              stepIndex: 3, // 3. adımı tamamladık
              timestamp: Date.now(),
            }));
            console.log('💾 [TOUR] Saved qr-scan tour state (manual click) to localStorage');
          };
          
          manualButton.addEventListener('click', handleManualButtonClick, { once: true });
          
          setTimeout(() => {
            manualButton.removeEventListener('click', handleManualButtonClick);
          }, 10000);
        }
      }

      // Turu başlat
      try {
        // Önce mevcut turu temizle (eğer varsa)
        if (driverObjRef.current) {
          try {
            driverObjRef.current.destroy();
          } catch {
            // Ignore destroy errors
          }
        }

        // Son bir kontrol: Elementlerin hala DOM'da olduğundan emin ol
        const verifiedSteps = finalSteps.filter((step) => {
          const element = document.querySelector(step.element as string);
          if (!element) {
            console.warn(`⚠️ [TOUR] Element not found in final check: ${step.element}`);
            return false;
          }
          return true;
        });

        if (verifiedSteps.length === 0) {
          console.error(`❌ [TOUR] No verified steps found after final check`);
          return;
        }

        console.log(`✅ [TOUR] Verified steps: ${verifiedSteps.length}`);

        // Son kontrol: Her adımın element'i DOM'da mı?
        const finalVerifiedSteps = verifiedSteps.map((step) => {
          const element = document.querySelector(step.element as string);
          if (!element) {
            console.warn(`⚠️ [TOUR] Element not found right before setSteps(): ${step.element}`);
            return null;
          }
          return step;
        }).filter((step): step is typeof verifiedSteps[0] => step !== null);

        if (finalVerifiedSteps.length === 0) {
          console.error(`❌ [TOUR] No steps left after final DOM check`);
          return;
        }

        console.log(`✅ [TOUR] Final verified steps before setSteps(): ${finalVerifiedSteps.length}`);

        // Driver instance'ını yeniden oluştur
        // NOT: Driver.js'in drive() metodu adımları parametre olarak alır
        // Ancak bazı durumlarda steps'i constructor'a geçmek gerekebilir
        const newDriver = driver({
          animate: true,
          allowClose: true,
          overlayColor: '#000000',
          overlayOpacity: 0.5,
          showProgress: true,
          showButtons: ['next', 'previous', 'close'],
          nextBtnText: 'İleri',
          prevBtnText: 'Geri',
          doneBtnText: 'Bitir',
          progressText: 'Adım {{current}} / {{total}}',
          onHighlightStarted: () => {
            // Eğer adımın popover'ında özel progressText varsa, onu kullan
            const driverInstance = driverObjRef.current;
            if (driverInstance) {
              const activeIndex = driverInstance.getActiveIndex();
              if (activeIndex !== undefined && activeIndex >= 0 && activeIndex < finalVerifiedSteps.length) {
                const currentStep = finalVerifiedSteps[activeIndex];
                if (currentStep?.popover?.progressText) {
                  // Progress text'i manuel olarak güncelle (DOM render'ı için kısa bir gecikme)
                  setTimeout(() => {
                  const progressElement = document.querySelector('.driver-popover-progress-text');
                  if (progressElement && currentStep.popover.progressText) {
                    progressElement.textContent = currentStep.popover.progressText;
                  }
                  }, 10);
                }
              }
            }
          },
          onNextClick: () => {
            // Mevcut adım indeksini driver'dan al (step.index güvenilir değil)
            const driverInstance = driverObjRef.current;
            if (!driverInstance) {
              console.warn('⚠️ [TOUR] Driver instance not found in onNextClick');
              return true;
            }
            
            const activeIndex = driverInstance.getActiveIndex();
            console.log('🔘 [TOUR] onNextClick called:', { 
              activeIndex: activeIndex,
              currentPath: window.location.pathname
            });
            
            // Notifications turu için özel aksiyonlar
            if (tourKey === 'notifications') {
              const currentPath = window.location.pathname;
              
              // Adım 1: Dashboard'daki Bildirimler sidebar linkine tıkla
              if (currentPath === '/' && activeIndex === 0) {
                const currentStep = finalVerifiedSteps[0];
                if (currentStep?.element === '#nav-notifications') {
                  const notificationsLink = document.querySelector('#nav-notifications') as HTMLElement;
                  if (notificationsLink) {
                    console.log('🔘 [TOUR] Clicking notifications link from Dashboard');
                    // localStorage'a kaydet
                    localStorage.setItem('active_tour', JSON.stringify({
                      tourKey: 'notifications',
                      stepIndex: 1,
                      timestamp: Date.now(),
                    }));
                    // Linke tıkla (driver.js'in normal akışını durdur)
                    setTimeout(() => {
                      driverInstance.destroy(); // Turu durdur
                      notificationsLink.click(); // Linke tıkla
                    }, 50);
                    return false; // Driver.js'in normal akışını durdur
                  }
                }
              }
            }
            
            // QR-scan turu için özel aksiyonlar
            if (tourKey === 'qr-scan') {
              const currentPath = window.location.pathname;
              
              // Adım 1: Dashboard'daki QR Tara butonuna tıkla
              if (currentPath === '/' && activeIndex === 0) {
                const currentStep = finalVerifiedSteps[0];
                if (currentStep?.element === '#btn-qr-scan') {
                  const qrButton = document.querySelector('#btn-qr-scan') as HTMLElement;
                  if (qrButton) {
                    console.log('🔘 [TOUR] Clicking QR button from Dashboard');
                    // localStorage'a kaydet
                    localStorage.setItem('active_tour', JSON.stringify({
                      tourKey: 'qr-scan',
                      stepIndex: 1,
                      timestamp: Date.now(),
                    }));
                    // Butona tıkla (driver.js'in normal akışını durdur)
                    setTimeout(() => {
                      driverInstance.destroy(); // Turu durdur
                      qrButton.click(); // Butona tıkla
                    }, 50);
                    return false; // Driver.js'in normal akışını durdur
                  }
                }
              }
              // Adım 2: QR Scanner sayfasındaki kamera viewport - direkt arıza formuna geçiş
              else if (currentPath === '/scan' && activeIndex === 0) {
                const currentStep = finalVerifiedSteps[0];
                if (currentStep?.element === '#qr-scanner-viewport') {
                  console.log('🔘 [TOUR] On QR Scanner viewport step - skipping manual entry, going directly to fault form');
                  
                  // Turu durdur
                  driverInstance.destroy();
                  
                  // Direkt olarak bir makine bul ve arıza formuna yönlendir
                  // Async işlemi başlat ama return false ile driver'ı durdur
                  supabase.auth.getSession().then(async ({ data: { session } }) => {
                    if (!session?.user) {
                      console.error('❌ [TOUR] No user session found');
                      return;
                    }

                    try {
                      // Kullanıcı profilini al
                      const { data: profile } = await supabase
                        .from('profiles')
                        .select('factory_id')
                        .eq('id', session.user.id)
                        .single();

                      if (!profile?.factory_id) {
                        console.error('❌ [TOUR] No factory_id found for user');
                        return;
                      }

                      // İlk makineyi bul
                      const { data: machines, error } = await supabase
                        .from('machines')
                        .select('id')
                        .eq('factory_id', profile.factory_id)
                        .limit(1)
                        .single();

                      if (error || !machines) {
                        console.error('❌ [TOUR] Error fetching machine:', error);
                        return;
                      }

                      console.log('✅ [TOUR] Found test machine for tour:', machines);

                      // localStorage'a kaydet (ReportFault sayfasında resume için)
                      localStorage.setItem('active_tour', JSON.stringify({
                        tourKey: 'qr-scan',
                        stepIndex: 2, // QR scan tamamlandı, form sayfasına geçiyoruz
                        timestamp: Date.now(),
                      }));

                      // Direkt olarak arıza formuna yönlendir (manuel QR girişi adımını atla)
                      console.log('🔘 [TOUR] Navigating directly to fault form:', `/report-fault/${machines.id}`);
                      window.location.href = `/report-fault/${machines.id}`;
                    } catch (error) {
                      console.error('❌ [TOUR] Error navigating to fault form:', error);
                    }
                  }).catch((error) => {
                    console.error('❌ [TOUR] Error getting session:', error);
                  });
                  
                  return false; // Driver.js'in normal akışını durdur
                }
              }
            }
            
            // Son adım kontrolü: Eğer son adımdaysak Dashboard'a yönlendir
            const totalSteps = finalVerifiedSteps.length;
            const currentPath = window.location.pathname;
            
            if (tourKey === 'qr-scan') {
              // ReportFault sayfasındaysak ve son adımdaysak
              if (currentPath.startsWith('/report-fault/') && activeIndex !== undefined && activeIndex >= totalSteps - 1) {
                console.log('🔘 [TOUR] Last step reached on ReportFault page, redirecting to Dashboard');
                console.log('🔘 [TOUR] Active index:', activeIndex, 'Total steps:', totalSteps);
                
                // localStorage'ı temizle
                localStorage.removeItem('active_tour');
                
                // Turu durdur
                driverInstance.destroy();
                
                // Dashboard'a yönlendir
                setTimeout(() => {
                  console.log('🔘 [TOUR] Redirecting to Dashboard now');
                  window.location.href = '/';
                }, 300);
                
                return false; // Driver.js'in normal akışını durdur
              }
            } else if (tourKey === 'notifications') {
              // Notifications sayfasındaysak ve son adımdaysak
              if (currentPath === '/notifications' && activeIndex !== undefined && activeIndex >= totalSteps - 1) {
                console.log('🔘 [TOUR] Last step reached on Notifications page, redirecting to Dashboard');
                console.log('🔘 [TOUR] Active index:', activeIndex, 'Total steps:', totalSteps);
                
                // localStorage'ı temizle
                localStorage.removeItem('active_tour');
                
                // Turu durdur
                driverInstance.destroy();
                
                // Dashboard'a yönlendir
                setTimeout(() => {
                  console.log('🔘 [TOUR] Redirecting to Dashboard now');
                  window.location.href = '/';
                }, 300);
                
                return false; // Driver.js'in normal akışını durdur
              }
            }
            
            // Normal akış: Bir sonraki adıma geç
            console.log('🔘 [TOUR] Continuing normal flow - moving to next step');
            // Custom logic yoksa, driver'ın otomatik ilerlemesini kullan
            // Ancak eğer otomatik ilerleme çalışmıyorsa manuel olarak ilerlet
            setTimeout(() => {
              const currentIndex = driverInstance.getActiveIndex();
              if (currentIndex === activeIndex) {
                // Eğer hala aynı adımdaysak, manuel olarak ilerlet
                console.log('🔘 [TOUR] Auto-advance failed, manually moving to next step');
                driverInstance.moveNext();
              }
            }, 100);
            return true; // Driver.js'in normal akışını devam ettir
          },
          onPrevClick: () => {
            // Mevcut adım indeksini driver'dan al
            const driverInstance = driverObjRef.current;
            if (!driverInstance) {
              console.warn('⚠️ [TOUR] Driver instance not found in onPrevClick');
              return true;
            }
            
            const activeIndex = driverInstance.getActiveIndex();
            console.log('🔘 [TOUR] onPrevClick called:', { 
              activeIndex: activeIndex,
              currentPath: window.location.pathname
            });
            
            // Önceki adıma geç
            driverInstance.movePrevious();
            return true;
          },
          onDestroyStarted: () => {
            console.log('🔘 [TOUR] Tour destroyed - checking if should redirect to Dashboard');
            // Tur bitince Dashboard'a yönlendir (qr-scan ve notifications turları için)
            const savedTour = localStorage.getItem('active_tour');
            if (savedTour) {
              try {
                const tourData = JSON.parse(savedTour);
                if (tourData.tourKey === 'qr-scan' || tourData.tourKey === 'notifications') {
                  // Tur bitmiş, localStorage'ı temizle
                  localStorage.removeItem('active_tour');
                  
                  // Dashboard'a yönlendir (hangi sayfada olursak olalım)
                  console.log('🔘 [TOUR] Redirecting to Dashboard after tour completion');
                  setTimeout(() => {
                    window.location.href = '/';
                  }, 300);
                }
              } catch (e) {
                console.error('❌ [TOUR] Error parsing tour data:', e);
              }
            }
            const driverInstance = driverObjRef.current;
            if (driverInstance) {
              driverInstance.destroy();
            }
          },
          onCloseClick: () => {
            console.log('🔘 [TOUR] Tour closed by user - checking if should redirect to Dashboard');
            // Tur kapatıldığında Dashboard'a yönlendir (qr-scan ve notifications turları için)
            const savedTour = localStorage.getItem('active_tour');
            if (savedTour) {
              try {
                const tourData = JSON.parse(savedTour);
                if (tourData.tourKey === 'qr-scan' || tourData.tourKey === 'notifications') {
                  // Tur bitmiş, localStorage'ı temizle
                  localStorage.removeItem('active_tour');
                  
                  // Dashboard'a yönlendir (hangi sayfada olursak olalım)
                  console.log('🔘 [TOUR] Redirecting to Dashboard after tour close');
                  setTimeout(() => {
                    window.location.href = '/';
                  }, 300);
                }
              } catch (e) {
                console.error('❌ [TOUR] Error parsing tour data:', e);
              }
            }
          },
        });

        driverObjRef.current = newDriver;
        console.log(`🔄 [TOUR] Driver instance recreated`);

        // Kısa bir gecikme ekle (driver instance'ının tam olarak hazır olması için)
        await new Promise(resolve => setTimeout(resolve, 50));

        // Driver.js v1.0+ sürümünde drive() metodu steps dizisini parametre olarak kabul etmez
        // Önce setSteps() ile adımları yüklemeliyiz, sonra drive() parametresiz çağrılmalı
        console.log(`🚀 [TOUR] Setting steps and starting tour with ${finalVerifiedSteps.length} steps`);
        console.log(`📋 [TOUR] Steps to drive:`, JSON.stringify(finalVerifiedSteps, null, 2));

        // Driver.js v1.0+ için: Önce setSteps() ile adımları yükle
        newDriver.setSteps(finalVerifiedSteps);
        console.log(`✅ [TOUR] Steps set successfully`);
        
        // Sonra drive() metodunu parametresiz çağır
        newDriver.drive();
        console.log(`🎉 [TOUR] Tour started successfully`);
      } catch (error: any) {
        console.error(`❌ [TOUR] Error starting tour:`, error);
        console.error(`❌ [TOUR] Error details:`, {
          message: error?.message,
          stack: error?.stack,
          name: error?.name,
        });
      }
    }, 100); // 100ms bekle - elementlerin render edilmesi için
  };

  // Resume tour from localStorage (for multi-page persistence)
  const resumeTour = async () => {
    try {
      const savedTour = localStorage.getItem('active_tour');
      if (!savedTour) {
        console.log('🔄 [TOUR] No saved tour found in localStorage');
        return;
      }

      const tourData = JSON.parse(savedTour);
      const { tourKey, timestamp } = tourData;

      console.log('🔄 [TOUR] Found saved tour in localStorage:', tourData);

      // 5 dakikadan eski kayıtları temizle
      if (Date.now() - timestamp > 5 * 60 * 1000) {
        console.log('🔄 [TOUR] Saved tour is too old, removing from localStorage');
        localStorage.removeItem('active_tour');
        return;
      }

      const currentPath = window.location.pathname;
      console.log('🔄 [TOUR] Current path:', currentPath, 'Tour key:', tourKey);

      // "track" turu için resume
      if (tourKey === 'track' && currentPath === '/maintenance') {
        console.log('🔄 [TOUR] Resuming track tour from localStorage:', tourData);
        
        // localStorage'ı temizle
        localStorage.removeItem('active_tour');
        
        // DOM'un yüklenmesini bekle
        await new Promise(resolve => setTimeout(resolve, 400));
        
        // Turu başlat (maintenance sayfasındaki adımlarla)
        startTour('track');
      }
      // "qr-scan" turu için resume
      else if (tourKey === 'qr-scan') {
        if (currentPath === '/scan') {
          console.log('🔄 [TOUR] Resuming qr-scan tour on QR Scanner page:', tourData);
          
          // localStorage'ı temizle
          localStorage.removeItem('active_tour');
          
          // DOM'un yüklenmesini bekle (kamera yüklensin)
          await new Promise(resolve => setTimeout(resolve, 800));
          
          // Turu başlat (QR Scanner sayfasındaki adımlarla)
          startTour('qr-scan');
        } else if (currentPath.startsWith('/report-fault/')) {
          console.log('🔄 [TOUR] Resuming qr-scan tour on ReportFault page:', tourData);
          
          // localStorage'ı temizle
          localStorage.removeItem('active_tour');
          
          // DOM'un yüklenmesini bekle (makine yüklensin)
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Turu başlat (ReportFault sayfasındaki adımlarla)
          startTour('qr-scan');
        } else {
          console.log('🔄 [TOUR] qr-scan tour found but current path does not match:', currentPath);
        }
      }
      // "notifications" turu için resume
      else if (tourKey === 'notifications') {
        if (currentPath === '/notifications') {
          console.log('🔄 [TOUR] Resuming notifications tour on Notifications page:', tourData);
          
          // localStorage'ı temizle
          localStorage.removeItem('active_tour');
          
          // DOM'un yüklenmesini bekle
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Turu başlat (Notifications sayfasındaki adımlarla)
          startTour('notifications');
        } else {
          console.log('🔄 [TOUR] notifications tour found but current path does not match:', currentPath);
        }
      } else {
        console.log('🔄 [TOUR] Tour key does not match or path not supported:', { tourKey, currentPath });
      }
    } catch (error) {
      console.error('❌ [TOUR] Error resuming tour:', error);
      localStorage.removeItem('active_tour');
    }
  };

  return { startTour, resumeTour };
}
