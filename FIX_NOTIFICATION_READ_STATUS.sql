-- ============================================================
-- BİLDİRİM OKUNDU DURUMU DÜZELTMESİ
-- ============================================================
-- Bu script, bildirimlerin "Okundu" durumunun sadece kullanıcı
-- bildirime tıkladığında değişmesini garanti eder.
-- Arıza durumu (resolved) ile bildirim durumu (read) birbirinden
-- tamamen bağımsızdır.
-- ============================================================

-- 1. NOTIFICATIONS TABLOSU KONTROLÜ
-- Tüm bildirimler is_read: false olarak oluşturulmalı
-- Bu zaten trigger'larda yapılıyor, ama emin olmak için kontrol edelim

-- Mevcut trigger fonksiyonlarını kontrol et ve güncelle
-- (Eğer is_read eksikse veya true olarak ayarlanmışsa düzelt)

-- ============================================================
-- 2. TRIGGER FUNCTION: YENİ ARIZA BİLDİRİMİ
-- ============================================================
-- ÖNEMLİ: Tüm bildirimler is_read: false olarak oluşturulmalı

CREATE OR REPLACE FUNCTION public.notify_new_fault()
RETURNS TRIGGER AS $$
DECLARE
    factory_id_val UUID;
    machine_name_val TEXT;
    admin_technician_user_ids UUID[];
    fault_title_val TEXT;
    user_count INTEGER;
    inserted_count INTEGER;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '🔔 [TRIGGER] notify_new_fault() TRIGGERED';
    RAISE NOTICE '📋 Maintenance Log ID: %', NEW.id;
    RAISE NOTICE '📋 Machine ID: %', NEW.machine_id;
    RAISE NOTICE '📋 Created By: %', NEW.created_by;
    RAISE NOTICE '========================================';
    
    SELECT m.factory_id, m.name INTO factory_id_val, machine_name_val
    FROM public.machines m
    WHERE m.id = NEW.machine_id;

    IF machine_name_val IS NULL THEN
        RAISE NOTICE '❌ [TRIGGER] Machine not found for machine_id: %', NEW.machine_id;
        RETURN NEW;
    END IF;

    IF NEW.created_by IS NULL THEN
        NEW.created_by := auth.uid();
        RAISE NOTICE '📝 [TRIGGER] Set created_by to: %', NEW.created_by;
    END IF;

    fault_title_val := COALESCE(NEW.title, LEFT(NEW.description, 50));

    SELECT ARRAY_AGG(p.id), COUNT(*)
    INTO admin_technician_user_ids, user_count
    FROM public.profiles p
    WHERE p.factory_id = factory_id_val
      AND p.role IN ('admin', 'technician')
      AND (NEW.created_by IS NULL OR p.id != NEW.created_by);

    RAISE NOTICE '👥 [TRIGGER] Found % admin/technician users (excluding creator)', user_count;

    IF admin_technician_user_ids IS NOT NULL AND array_length(admin_technician_user_ids, 1) > 0 THEN
        -- ÖNEMLİ: is_read: false olarak oluştur
        INSERT INTO public.notifications (user_id, factory_id, type, title, message, link, related_fault_id, is_read)
        SELECT
            user_id,
            factory_id_val,
            'new_fault',
            'Yeni Arıza Bildirimi',
            machine_name_val || ' makinesinde yeni bir arıza bildirildi: ' || fault_title_val,
            '/machines/' || NEW.machine_id::TEXT || '?log=' || NEW.id::TEXT,
            NEW.id,
            false  -- ÖNEMLİ: Her zaman okunmamış olarak oluştur
        FROM unnest(admin_technician_user_ids) AS user_id;
        
        GET DIAGNOSTICS inserted_count = ROW_COUNT;
        RAISE NOTICE '✅ [TRIGGER] Created % notifications (all with is_read: false)', inserted_count;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 3. TRIGGER FUNCTION: ARIZA ÇÖZÜLDÜ BİLDİRİMİ
-- ============================================================
-- ÖNEMLİ: Tüm bildirimler is_read: false olarak oluşturulmalı
-- Arıza çözülmüş olsa bile, bildirimler okunmamış olarak gelir

CREATE OR REPLACE FUNCTION public.notify_fault_resolved()
RETURNS TRIGGER AS $$
DECLARE
    factory_id_val UUID;
    fault_title_val TEXT;
    created_by_user UUID;
    resolved_by_user UUID;
    admin_user_ids UUID[];
    technician_user_ids UUID[];
    machine_name_val TEXT;
    admin_count INTEGER;
    technician_count INTEGER;
    inserted_count INTEGER;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '🔔 [TRIGGER] notify_fault_resolved() TRIGGERED';
    RAISE NOTICE '📋 Maintenance Log ID: %', NEW.id;
    RAISE NOTICE '📋 OLD Status: %', OLD.status;
    RAISE NOTICE '📋 NEW Status: %', NEW.status;
    RAISE NOTICE '========================================';
    
    IF NEW.status != 'resolved' OR OLD.status = 'resolved' THEN
        RAISE NOTICE '⏭️ [TRIGGER] Skipping: status is not changing to resolved';
        RETURN NEW;
    END IF;

    IF NEW.resolved_at IS NULL THEN
        NEW.resolved_at := now();
    END IF;

    IF NEW.resolved_by IS NULL THEN
        NEW.resolved_by := auth.uid();
    END IF;

    resolved_by_user := NEW.resolved_by;
    created_by_user := NEW.created_by;

    SELECT m.factory_id, m.name INTO factory_id_val, machine_name_val
    FROM public.machines m
    WHERE m.id = NEW.machine_id;

    IF machine_name_val IS NULL THEN
        RAISE NOTICE '❌ [TRIGGER] Machine not found';
        RETURN NEW;
    END IF;

    fault_title_val := COALESCE(NEW.title, LEFT(NEW.description, 50));

    -- 1. Operatöre bildirim gönder (eğer çözen kişi kendisi değilse)
    IF created_by_user IS NOT NULL 
       AND created_by_user != resolved_by_user THEN
        RAISE NOTICE '📤 [TRIGGER] Creating notification for creator (operator): %', created_by_user;
        
        INSERT INTO public.notifications (user_id, factory_id, type, title, message, link, related_fault_id, is_read)
        VALUES (
            created_by_user,
            factory_id_val,
            'fault_resolved',
            'Arıza Çözüldü',
            machine_name_val || ' makinesindeki "' || fault_title_val || '" arızası çözüldü.',
            '/machines/' || NEW.machine_id::TEXT || '?log=' || NEW.id::TEXT,
            NEW.id,
            false  -- ÖNEMLİ: Operatör bildirimi okunmamış olarak gelir
        );
        
        GET DIAGNOSTICS inserted_count = ROW_COUNT;
        RAISE NOTICE '✅ [TRIGGER] Created notification for creator (is_read: false)';
    END IF;

    -- 2. Admin'lere bildirim gönder
    SELECT ARRAY_AGG(p.id), COUNT(*)
    INTO admin_user_ids, admin_count
    FROM public.profiles p
    WHERE p.factory_id = factory_id_val
      AND p.role = 'admin'
      AND p.id != resolved_by_user;

    IF admin_user_ids IS NOT NULL AND array_length(admin_user_ids, 1) > 0 THEN
        INSERT INTO public.notifications (user_id, factory_id, type, title, message, link, related_fault_id, is_read)
        SELECT
            user_id,
            factory_id_val,
            'fault_resolved',
            'Arıza Çözüldü',
            machine_name_val || ' makinesindeki "' || fault_title_val || '" arızası çözüldü.',
            '/machines/' || NEW.machine_id::TEXT || '?log=' || NEW.id::TEXT,
            NEW.id,
            false  -- ÖNEMLİ: Admin bildirimleri okunmamış olarak gelir
        FROM unnest(admin_user_ids) AS user_id;
        
        GET DIAGNOSTICS inserted_count = ROW_COUNT;
        RAISE NOTICE '✅ [TRIGGER] Created % notifications for admin users (all with is_read: false)', inserted_count;
    END IF;

    -- 3. Technician'lere bildirim gönder
    SELECT ARRAY_AGG(p.id), COUNT(*)
    INTO technician_user_ids, technician_count
    FROM public.profiles p
    WHERE p.factory_id = factory_id_val
      AND p.role = 'technician'
      AND p.id != resolved_by_user;

    IF technician_user_ids IS NOT NULL AND array_length(technician_user_ids, 1) > 0 THEN
        INSERT INTO public.notifications (user_id, factory_id, type, title, message, link, related_fault_id, is_read)
        SELECT
            user_id,
            factory_id_val,
            'fault_resolved',
            'Arıza Çözüldü',
            machine_name_val || ' makinesindeki "' || fault_title_val || '" arızası çözüldü.',
            '/machines/' || NEW.machine_id::TEXT || '?log=' || NEW.id::TEXT,
            NEW.id,
            false  -- ÖNEMLİ: Technician bildirimleri okunmamış olarak gelir
        FROM unnest(technician_user_ids) AS user_id;
        
        GET DIAGNOSTICS inserted_count = ROW_COUNT;
        RAISE NOTICE '✅ [TRIGGER] Created % notifications for technician users (all with is_read: false)', inserted_count;
    END IF;

    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ [TRIGGER] notify_fault_resolved() COMPLETED';
    RAISE NOTICE '========================================';

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 4. TRIGGER'LARI YENİDEN OLUŞTUR
-- ============================================================

DROP TRIGGER IF EXISTS trigger_notify_new_fault ON public.maintenance_logs;
CREATE TRIGGER trigger_notify_new_fault 
AFTER INSERT ON public.maintenance_logs 
FOR EACH ROW 
EXECUTE FUNCTION public.notify_new_fault();

DROP TRIGGER IF EXISTS trigger_notify_fault_resolved ON public.maintenance_logs;
CREATE TRIGGER trigger_notify_fault_resolved 
AFTER UPDATE OF status ON public.maintenance_logs 
FOR EACH ROW 
WHEN (NEW.status = 'resolved' AND OLD.status != 'resolved') 
EXECUTE FUNCTION public.notify_fault_resolved();

-- ============================================================
-- ÖNEMLİ NOTLAR:
-- ============================================================
-- 1. Tüm bildirimler is_read: false olarak oluşturulur
-- 2. Bir bildirim sadece kullanıcı bildirime tıkladığında okundu olur
-- 3. Arıza durumu (resolved) ile bildirim durumu (read) bağımsızdır
-- 4. Bir kullanıcı arızayı çözdüğünde, sadece o kullanıcının
--    kendi bildirimi (eğer varsa) frontend'de okundu yapılır
-- 5. Diğer kullanıcıların bildirimleri okunmamış kalır
-- ============================================================

