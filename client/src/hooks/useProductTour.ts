import { useEffect, useRef } from 'react';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';

export type TourKey = 'fault-report' | 'qr-scan' | 'track';

interface TourStep {
  element: string;
  popover: {
    title: string;
    description: string;
    side?: 'top' | 'right' | 'bottom' | 'left';
    align?: 'start' | 'center' | 'end';
    progressText?: string; // Manuel progress text override
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
        progressText: 'Adım 1 / 3', // Manuel progress text
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
  'qr-scan': [],
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
      closeBtnText: 'Kapat',
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
      } else if (currentPath === '/maintenance') {
        // Maintenance sayfasındaysak, maintenance adımlarını kullan (sidebar linki hariç)
        steps = TOURS_MAINTENANCE[tourKey] || [];
        console.log(`📋 [TOUR] Using Maintenance steps:`, steps);
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
            console.log('💾 [TOUR] Saved tour state to localStorage');
          };
          
          maintenanceLink.addEventListener('click', handleLinkClick, { once: true });
          
          // Tur bittiğinde listener'ı temizle
          setTimeout(() => {
            maintenanceLink.removeEventListener('click', handleLinkClick);
          }, 10000); // 10 saniye sonra temizle
        }
      }

      // Turu başlat
      try {
        // Önce mevcut turu temizle (eğer varsa)
        if (driverObjRef.current) {
          try {
            driverObjRef.current.destroy();
          } catch (e) {
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
          closeBtnText: 'Kapat',
          progressText: 'Adım {{current}} / {{total}}',
          onHighlightStarted: (element, step, options) => {
            // Eğer adımın popover'ında özel progressText varsa, onu kullan
            const currentStep = finalVerifiedSteps[step.index];
            if (currentStep?.popover?.progressText) {
              // Progress text'i manuel olarak güncelle (DOM render'ı için kısa bir gecikme)
              setTimeout(() => {
                const progressElement = document.querySelector('.driver-popover-progress-text');
                if (progressElement) {
                  progressElement.textContent = currentStep.popover.progressText;
                }
              }, 10);
            }
          },
          onDestroyStarted: () => {
            newDriver.destroy();
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
      if (!savedTour) return;

      const tourData = JSON.parse(savedTour);
      const { tourKey, timestamp } = tourData;

      // 5 dakikadan eski kayıtları temizle
      if (Date.now() - timestamp > 5 * 60 * 1000) {
        localStorage.removeItem('active_tour');
        return;
      }

      // Sadece "track" turu için resume yap
      if (tourKey === 'track' && window.location.pathname === '/maintenance') {
        console.log('🔄 [TOUR] Resuming tour from localStorage:', tourData);
        
        // localStorage'ı temizle
        localStorage.removeItem('active_tour');
        
        // DOM'un yüklenmesini bekle
        await new Promise(resolve => setTimeout(resolve, 400));
        
        // Turu başlat (maintenance sayfasındaki adımlarla)
        startTour('track');
      }
    } catch (error) {
      console.error('❌ [TOUR] Error resuming tour:', error);
      localStorage.removeItem('active_tour');
    }
  };

  return { startTour, resumeTour };
}
