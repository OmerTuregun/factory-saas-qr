-- ============================================================
-- SUPABASE NOTIFICATION SYSTEM - WITH DETAILED LOGS
-- ============================================================
-- Tüm trigger'lara detaylı loglar eklenmiş versiyon
-- ============================================================

-- ============================================================
-- 1. TRIGGER FUNCTION: YENİ ARIZA BİLDİRİMİ (LOG'LU)
-- ============================================================

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
    -- DEBUG: Log başlangıç
    RAISE NOTICE '========================================';
    RAISE NOTICE '🔔 [TRIGGER] notify_new_fault() TRIGGERED';
    RAISE NOTICE '📋 Maintenance Log ID: %', NEW.id;
    RAISE NOTICE '📋 Machine ID: %', NEW.machine_id;
    RAISE NOTICE '📋 Created By: %', NEW.created_by;
    RAISE NOTICE '📋 Title: %', NEW.title;
    RAISE NOTICE '========================================';
    
    -- Makine bilgilerini al
    SELECT m.factory_id, m.name INTO factory_id_val, machine_name_val
    FROM public.machines m
    WHERE m.id = NEW.machine_id;

    -- Eğer makine bulunamazsa, işlemi durdur
    IF machine_name_val IS NULL THEN
        RAISE NOTICE '❌ [TRIGGER] Machine not found for machine_id: %', NEW.machine_id;
        RETURN NEW;
    END IF;

    RAISE NOTICE '✅ [TRIGGER] Machine found: %', machine_name_val;
    RAISE NOTICE '✅ [TRIGGER] Factory ID: %', factory_id_val;

    -- created_by sütununu auth.uid() ile doldur (eğer boşsa)
    IF NEW.created_by IS NULL THEN
        NEW.created_by := auth.uid();
        RAISE NOTICE '📝 [TRIGGER] Set created_by to: %', NEW.created_by;
    END IF;

    RAISE NOTICE '👤 [TRIGGER] Created by user: %', NEW.created_by;

    -- Arıza başlığını al
    fault_title_val := COALESCE(NEW.title, LEFT(NEW.description, 50));
    RAISE NOTICE '📋 [TRIGGER] Fault title: %', fault_title_val;

    -- Fabrikadaki admin ve technician kullanıcılarını bul
    SELECT ARRAY_AGG(p.id), COUNT(*)
    INTO admin_technician_user_ids, user_count
    FROM public.profiles p
    WHERE p.factory_id = factory_id_val
      AND p.role IN ('admin', 'technician')
      AND (NEW.created_by IS NULL OR p.id != NEW.created_by);

    RAISE NOTICE '👥 [TRIGGER] Found % admin/technician users (excluding creator)', user_count;
    
    IF admin_technician_user_ids IS NOT NULL THEN
        RAISE NOTICE '📋 [TRIGGER] User IDs to notify: %', admin_technician_user_ids;
    END IF;

    -- Her admin ve technician için bildirim oluştur
    IF admin_technician_user_ids IS NOT NULL AND array_length(admin_technician_user_ids, 1) > 0 THEN
        INSERT INTO public.notifications (user_id, factory_id, type, title, message, link, related_fault_id, is_read)
        SELECT
            user_id,
            factory_id_val,
            'new_fault',
            'Yeni Arıza Bildirimi',
            machine_name_val || ' makinesinde yeni bir arıza bildirildi: ' || fault_title_val,
            '/machines/' || NEW.machine_id::TEXT || '?log=' || NEW.id::TEXT,
            NEW.id,
            false  -- ÖNEMLİ: Okunmamış olarak oluştur
        FROM unnest(admin_technician_user_ids) AS user_id;
        
        GET DIAGNOSTICS inserted_count = ROW_COUNT;
        RAISE NOTICE '✅ [TRIGGER] Created % notifications for admin/technician users', inserted_count;
        
        -- Oluşturulan bildirimleri kontrol et
        RAISE NOTICE '📋 [TRIGGER] Verifying inserted notifications...';
        PERFORM COUNT(*) FROM public.notifications 
        WHERE related_fault_id = NEW.id 
          AND type = 'new_fault';
    ELSE
        RAISE NOTICE '⚠️ [TRIGGER] No admin/technician users found or array is empty';
        RAISE NOTICE '⚠️ [TRIGGER] This might be because:';
        RAISE NOTICE '   - No users with admin/technician role in factory %', factory_id_val;
        RAISE NOTICE '   - All admin/technician users are the creator';
    END IF;

    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ [TRIGGER] notify_new_fault() COMPLETED';
    RAISE NOTICE '========================================';

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 2. TRIGGER FUNCTION: ARIZA ÇÖZÜLDÜ BİLDİRİMİ (LOG'LU)
-- ============================================================

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
    -- DEBUG: Log başlangıç
    RAISE NOTICE '========================================';
    RAISE NOTICE '🔔 [TRIGGER] notify_fault_resolved() TRIGGERED';
    RAISE NOTICE '📋 Maintenance Log ID: %', NEW.id;
    RAISE NOTICE '📋 OLD Status: %', OLD.status;
    RAISE NOTICE '📋 NEW Status: %', NEW.status;
    RAISE NOTICE '========================================';
    
    -- Sadece status 'resolved' olduğunda çalışsın
    IF NEW.status != 'resolved' OR OLD.status = 'resolved' THEN
        RAISE NOTICE '⏭️ [TRIGGER] Skipping: status is not changing to resolved';
        RAISE NOTICE '   NEW.status = %, OLD.status = %', NEW.status, OLD.status;
        RETURN NEW;
    END IF;

    RAISE NOTICE '✅ [TRIGGER] Status changed to resolved for maintenance_log_id: %', NEW.id;

    -- resolved_at ve resolved_by sütunlarını güncelle
    IF NEW.resolved_at IS NULL THEN
        NEW.resolved_at := now();
        RAISE NOTICE '📝 [TRIGGER] Set resolved_at to: %', NEW.resolved_at;
    END IF;

    IF NEW.resolved_by IS NULL THEN
        NEW.resolved_by := auth.uid();
        RAISE NOTICE '📝 [TRIGGER] Set resolved_by to: %', NEW.resolved_by;
    END IF;

    resolved_by_user := NEW.resolved_by;
    created_by_user := NEW.created_by;

    RAISE NOTICE '👤 [TRIGGER] Resolved by user: %', resolved_by_user;
    RAISE NOTICE '👤 [TRIGGER] Created by user: %', created_by_user;

    -- Makine ve fabrika bilgilerini al
    SELECT m.factory_id, m.name INTO factory_id_val, machine_name_val
    FROM public.machines m
    WHERE m.id = NEW.machine_id;

    IF machine_name_val IS NULL THEN
        RAISE NOTICE '❌ [TRIGGER] Machine not found for machine_id: %', NEW.machine_id;
        RETURN NEW;
    END IF;

    RAISE NOTICE '✅ [TRIGGER] Machine found: %', machine_name_val;
    RAISE NOTICE '✅ [TRIGGER] Factory ID: %', factory_id_val;

    -- Arıza başlığını al
    fault_title_val := COALESCE(NEW.title, LEFT(NEW.description, 50));
    RAISE NOTICE '📋 [TRIGGER] Fault title: %', fault_title_val;

    -- 1. Arızayı oluşturan kişiye bildirim gönder (eğer çözen kişi kendisi değilse)
    -- Bu genelde Operatör olur
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
            false  -- ÖNEMLİ: Okunmamış olarak oluştur
        );
        
        GET DIAGNOSTICS inserted_count = ROW_COUNT;
        RAISE NOTICE '✅ [TRIGGER] Created notification for creator: % (inserted: %)', created_by_user, inserted_count;
    ELSE
        RAISE NOTICE '⏭️ [TRIGGER] Skipping notification for creator';
        RAISE NOTICE '   created_by_user: %, resolved_by_user: %', created_by_user, resolved_by_user;
    END IF;

    -- 2. Fabrikadaki admin'lere bildirim gönder (çözen kişi admin ise kendine atmasın)
    SELECT ARRAY_AGG(p.id), COUNT(*)
    INTO admin_user_ids, admin_count
    FROM public.profiles p
    WHERE p.factory_id = factory_id_val
      AND p.role = 'admin'
      AND p.id != resolved_by_user;

    RAISE NOTICE '👥 [TRIGGER] Found % admin users (excluding resolver)', admin_count;
    
    IF admin_user_ids IS NOT NULL THEN
        RAISE NOTICE '📋 [TRIGGER] Admin user IDs to notify: %', admin_user_ids;
    END IF;

    IF admin_user_ids IS NOT NULL AND array_length(admin_user_ids, 1) > 0 THEN
        RAISE NOTICE '📤 [TRIGGER] Creating notifications for admin users...';
        
        INSERT INTO public.notifications (user_id, factory_id, type, title, message, link, related_fault_id, is_read)
        SELECT
            user_id,
            factory_id_val,
            'fault_resolved',
            'Arıza Çözüldü',
            machine_name_val || ' makinesindeki "' || fault_title_val || '" arızası çözüldü.',
            '/machines/' || NEW.machine_id::TEXT || '?log=' || NEW.id::TEXT,
            NEW.id,
            false  -- ÖNEMLİ: Okunmamış olarak oluştur
        FROM unnest(admin_user_ids) AS user_id;
        
        GET DIAGNOSTICS inserted_count = ROW_COUNT;
        RAISE NOTICE '✅ [TRIGGER] Created % notifications for admin users', inserted_count;
    ELSE
        RAISE NOTICE '⚠️ [TRIGGER] No admin users found or array is empty';
    END IF;

    -- 3. Fabrikadaki technician'lere bildirim gönder (çözen kişi technician ise kendine atmasın)
    -- ÖNEMLİ: Eğer admin çözdüyse technician'lere de bildirim gitmeli
    SELECT ARRAY_AGG(p.id), COUNT(*)
    INTO technician_user_ids, technician_count
    FROM public.profiles p
    WHERE p.factory_id = factory_id_val
      AND p.role = 'technician'
      AND p.id != resolved_by_user;

    RAISE NOTICE '👥 [TRIGGER] Found % technician users (excluding resolver)', technician_count;
    
    IF technician_user_ids IS NOT NULL THEN
        RAISE NOTICE '📋 [TRIGGER] Technician user IDs to notify: %', technician_user_ids;
    END IF;

    IF technician_user_ids IS NOT NULL AND array_length(technician_user_ids, 1) > 0 THEN
        RAISE NOTICE '📤 [TRIGGER] Creating notifications for technician users...';
        
        INSERT INTO public.notifications (user_id, factory_id, type, title, message, link, related_fault_id, is_read)
        SELECT
            user_id,
            factory_id_val,
            'fault_resolved',
            'Arıza Çözüldü',
            machine_name_val || ' makinesindeki "' || fault_title_val || '" arızası çözüldü.',
            '/machines/' || NEW.machine_id::TEXT || '?log=' || NEW.id::TEXT,
            NEW.id,
            false  -- ÖNEMLİ: Okunmamış olarak oluştur
        FROM unnest(technician_user_ids) AS user_id;
        
        GET DIAGNOSTICS inserted_count = ROW_COUNT;
        RAISE NOTICE '✅ [TRIGGER] Created % notifications for technician users', inserted_count;
    ELSE
        RAISE NOTICE '⚠️ [TRIGGER] No technician users found or array is empty';
    END IF;

    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ [TRIGGER] notify_fault_resolved() COMPLETED';
    RAISE NOTICE '========================================';

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 3. TRIGGER'LARI YENİDEN OLUŞTUR
-- ============================================================

-- Yeni arıza trigger'ı
DROP TRIGGER IF EXISTS trigger_notify_new_fault ON public.maintenance_logs;
CREATE TRIGGER trigger_notify_new_fault
    AFTER INSERT ON public.maintenance_logs
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_new_fault();

-- Arıza çözüldü trigger'ı
DROP TRIGGER IF EXISTS trigger_notify_fault_resolved ON public.maintenance_logs;
CREATE TRIGGER trigger_notify_fault_resolved
    AFTER UPDATE OF status ON public.maintenance_logs
    FOR EACH ROW
    WHEN (NEW.status = 'resolved' AND OLD.status != 'resolved')
    EXECUTE FUNCTION public.notify_fault_resolved();

-- ============================================================
-- 4. TEST QUERIES
-- ============================================================

-- Mevcut trigger'ları kontrol et
SELECT 
    trigger_name, 
    event_manipulation, 
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'maintenance_logs'
ORDER BY trigger_name;

-- Son bildirimleri kontrol et
SELECT 
    id,
    user_id,
    type,
    title,
    message,
    is_read,
    created_at,
    related_fault_id
FROM public.notifications
ORDER BY created_at DESC
LIMIT 10;

-- ============================================================
-- NOT: Bu script'i çalıştırdıktan sonra:
-- 1. Supabase Dashboard > Logs > Postgres Logs'u kontrol edin
-- 2. Yeni bir arıza oluşturun ve log'larda RAISE NOTICE mesajlarını görün
-- 3. Bir arızayı çözün ve log'larda RAISE NOTICE mesajlarını görün
-- 4. Browser Console'da [MAINTENANCE SERVICE] ve [NOTIFICATION SERVICE] loglarını kontrol edin
-- ============================================================

