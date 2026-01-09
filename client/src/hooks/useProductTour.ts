import { useEffect, useRef } from 'react';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';

export type TourKey = 'fault-report' | 'qr-scan';

interface TourStep {
  element: string;
  popover: {
    title: string;
    description: string;
    side?: 'top' | 'right' | 'bottom' | 'left';
    align?: 'start' | 'center' | 'end';
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
          onDestroyStarted: () => {
            newDriver.destroy();
          },
          // NOT: steps'i constructor'a geçmeyi deniyoruz
          // Eğer bu çalışmazsa, drive() metodunu kullanacağız
        });

        driverObjRef.current = newDriver;
        console.log(`🔄 [TOUR] Driver instance recreated`);

        // Kısa bir gecikme ekle (driver instance'ının tam olarak hazır olması için)
        await new Promise(resolve => setTimeout(resolve, 50));

        // Driver.js v1.0+ sürümünde drive() metodu steps dizisini parametre olarak kabul etmez
        // Önce setSteps() ile adımları yüklemeliyiz, sonra drive() parametresiz çağrılmalı
        console.log(`🚀 [TOUR] Setting steps and starting tour with ${verifiedSteps.length} steps`);
        console.log(`📋 [TOUR] Steps to drive:`, JSON.stringify(verifiedSteps, null, 2));
        
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

  return { startTour };
}
