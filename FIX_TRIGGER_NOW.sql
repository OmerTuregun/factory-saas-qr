-- ============================================================
-- TRIGGER'LARI YENİDEN OLUŞTUR VE TEST ET
-- ============================================================

-- 1. ÖNCE MEVCUT TRIGGER'LARI SİL
DROP TRIGGER IF EXISTS trigger_notify_new_fault ON public.maintenance_logs;
DROP TRIGGER IF EXISTS trigger_notify_fault_resolved ON public.maintenance_logs;

-- 2. FUNCTION'LARI KONTROL ET VE YENİDEN OLUŞTUR
-- (Eğer yoksa veya hatalıysa)

-- notify_new_fault function
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
            false
        FROM unnest(admin_technician_user_ids) AS user_id;
        
        GET DIAGNOSTICS inserted_count = ROW_COUNT;
        RAISE NOTICE '✅ [TRIGGER] Created % notifications for admin/technician users', inserted_count;
    ELSE
        RAISE NOTICE '⚠️ [TRIGGER] No admin/technician users found or array is empty';
    END IF;

    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ [TRIGGER] notify_new_fault() COMPLETED';
    RAISE NOTICE '========================================';

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- notify_fault_resolved function
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
        RETURN NEW;
    END IF;

    RAISE NOTICE '✅ [TRIGGER] Status changed to resolved for maintenance_log_id: %', NEW.id;

    -- resolved_at ve resolved_by sütunlarını güncelle
    IF NEW.resolved_at IS NULL THEN
        NEW.resolved_at := now();
    END IF;

    IF NEW.resolved_by IS NULL THEN
        NEW.resolved_by := auth.uid();
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

    -- 1. Arızayı oluşturan kişiye bildirim gönder
    IF created_by_user IS NOT NULL 
       AND created_by_user != resolved_by_user THEN
        INSERT INTO public.notifications (user_id, factory_id, type, title, message, link, related_fault_id, is_read)
        VALUES (
            created_by_user,
            factory_id_val,
            'fault_resolved',
            'Arıza Çözüldü',
            machine_name_val || ' makinesindeki "' || fault_title_val || '" arızası çözüldü.',
            '/machines/' || NEW.machine_id::TEXT || '?log=' || NEW.id::TEXT,
            NEW.id,
            false
        );
        RAISE NOTICE '✅ [TRIGGER] Created notification for creator: %', created_by_user;
    END IF;

    -- 2. Admin'lere bildirim gönder
    SELECT ARRAY_AGG(p.id), COUNT(*)
    INTO admin_user_ids, admin_count
    FROM public.profiles p
    WHERE p.factory_id = factory_id_val
      AND p.role = 'admin'
      AND p.id != resolved_by_user;

    RAISE NOTICE '👥 [TRIGGER] Found % admin users (excluding resolver)', admin_count;

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
            false
        FROM unnest(admin_user_ids) AS user_id;
        
        GET DIAGNOSTICS inserted_count = ROW_COUNT;
        RAISE NOTICE '✅ [TRIGGER] Created % notifications for admin users', inserted_count;
    END IF;

    -- 3. Technician'lere bildirim gönder
    SELECT ARRAY_AGG(p.id), COUNT(*)
    INTO technician_user_ids, technician_count
    FROM public.profiles p
    WHERE p.factory_id = factory_id_val
      AND p.role = 'technician'
      AND p.id != resolved_by_user;

    RAISE NOTICE '👥 [TRIGGER] Found % technician users (excluding resolver)', technician_count;

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
            false
        FROM unnest(technician_user_ids) AS user_id;
        
        GET DIAGNOSTICS inserted_count = ROW_COUNT;
        RAISE NOTICE '✅ [TRIGGER] Created % notifications for technician users', inserted_count;
    END IF;

    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ [TRIGGER] notify_fault_resolved() COMPLETED';
    RAISE NOTICE '========================================';

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. TRIGGER'LARI YENİDEN OLUŞTUR
CREATE TRIGGER trigger_notify_new_fault
    AFTER INSERT ON public.maintenance_logs
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_new_fault();

CREATE TRIGGER trigger_notify_fault_resolved
    AFTER UPDATE OF status ON public.maintenance_logs
    FOR EACH ROW
    WHEN (NEW.status = 'resolved' AND OLD.status != 'resolved')
    EXECUTE FUNCTION public.notify_fault_resolved();

-- 4. TRIGGER'LARIN OLUŞTUĞUNU KONTROL ET
SELECT 
    trigger_name, 
    event_manipulation, 
    event_object_table
FROM information_schema.triggers
WHERE event_object_table = 'maintenance_logs'
ORDER BY trigger_name;

-- 5. TEST: Yeni bir test arızası oluştur ve bildirimlerin gelip gelmediğini kontrol et
-- (Bu sorguyu çalıştırmadan önce gerçek bir machine_id kullanın)
/*
INSERT INTO public.maintenance_logs (
    machine_id, 
    title, 
    description, 
    priority, 
    status, 
    created_by
)
VALUES (
    '63caecff-6d43-454e-9bee-2241b2d29c0d',  -- Gerçek machine_id
    'Test Arıza - Trigger Test',
    'Bu bir trigger test arızasıdır',
    'high',
    'pending',
    '86385355-84de-48ea-a8e4-fecbdb296ab6'  -- Operatör user_id
);

-- Sonra bildirimlerin oluşup oluşmadığını kontrol et:
SELECT * FROM public.notifications 
WHERE related_fault_id = (
    SELECT id FROM public.maintenance_logs 
    WHERE title = 'Test Arıza - Trigger Test' 
    ORDER BY created_at DESC 
    LIMIT 1
);
*/

