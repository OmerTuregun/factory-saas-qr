-- ============================================================
-- SUPABASE NOTIFICATION SYSTEM - FINAL FIX
-- ============================================================
-- Sorun: profiles.id ile auth.users.id eşleşmesi
-- Çözüm: profiles.id zaten auth.users.id ile aynı UUID
-- ============================================================

-- ============================================================
-- 1. PROFILES TABLOSU YAPISINI KONTROL ET
-- ============================================================

-- profiles tablosunun yapısını göster
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'profiles'
ORDER BY ordinal_position;

-- ============================================================
-- 2. TRIGGER FUNCTION: YENİ ARIZA BİLDİRİMİ (DÜZELTİLMİŞ)
-- ============================================================

CREATE OR REPLACE FUNCTION public.notify_new_fault()
RETURNS TRIGGER AS $$
DECLARE
    factory_id_val UUID;
    machine_name_val TEXT;
    admin_technician_user_ids UUID[];
    fault_title_val TEXT;
    user_count INTEGER;
BEGIN
    -- DEBUG: Log başlangıç
    RAISE NOTICE '🔔 notify_new_fault triggered for maintenance_log_id: %', NEW.id;
    
    -- Makine bilgilerini al
    SELECT m.factory_id, m.name INTO factory_id_val, machine_name_val
    FROM public.machines m
    WHERE m.id = NEW.machine_id;

    -- Eğer makine bulunamazsa, işlemi durdur
    IF machine_name_val IS NULL THEN
        RAISE NOTICE '⚠️ Machine not found for machine_id: %', NEW.machine_id;
        RETURN NEW;
    END IF;

    RAISE NOTICE '✅ Machine found: % (factory_id: %)', machine_name_val, factory_id_val;

    -- created_by sütununu auth.uid() ile doldur (eğer boşsa)
    IF NEW.created_by IS NULL THEN
        NEW.created_by := auth.uid();
        RAISE NOTICE '📝 Set created_by to: %', NEW.created_by;
    END IF;

    RAISE NOTICE '👤 Created by user: %', NEW.created_by;

    -- Arıza başlığını al
    fault_title_val := COALESCE(NEW.title, LEFT(NEW.description, 50));
    RAISE NOTICE '📋 Fault title: %', fault_title_val;

    -- Fabrikadaki admin ve technician kullanıcılarını bul
    -- ÖNEMLİ: profiles.id zaten auth.users.id ile aynı UUID
    -- ÖNEMLİ: Arızayı oluşturan kişiyi (created_by) hariç tut
    SELECT ARRAY_AGG(p.id), COUNT(*)
    INTO admin_technician_user_ids, user_count
    FROM public.profiles p
    WHERE p.factory_id = factory_id_val
      AND p.role IN ('admin', 'technician')
      AND (NEW.created_by IS NULL OR p.id != NEW.created_by); -- Arızayı oluşturan kişiye bildirim ATMA

    RAISE NOTICE '👥 Found % admin/technician users (excluding creator)', user_count;

    -- Her admin ve technician için bildirim oluştur
    IF admin_technician_user_ids IS NOT NULL AND array_length(admin_technician_user_ids, 1) > 0 THEN
        INSERT INTO public.notifications (user_id, factory_id, type, title, message, link, related_fault_id)
        SELECT
            user_id,  -- profiles.id zaten auth.users.id ile aynı UUID
            factory_id_val,
            'new_fault',
            'Yeni Arıza Bildirimi',
            machine_name_val || ' makinesinde yeni bir arıza bildirildi: ' || fault_title_val,
            '/machines/' || NEW.machine_id::TEXT || '?log=' || NEW.id::TEXT,
            NEW.id
        FROM unnest(admin_technician_user_ids) AS user_id;
        
        RAISE NOTICE '✅ Created % notifications for admin/technician users', array_length(admin_technician_user_ids, 1);
    ELSE
        RAISE NOTICE '⚠️ No admin/technician users found or array is empty';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 3. TRIGGER FUNCTION: ARIZA ÇÖZÜLDÜ BİLDİRİMİ (DÜZELTİLMİŞ)
-- ============================================================

CREATE OR REPLACE FUNCTION public.notify_fault_resolved()
RETURNS TRIGGER AS $$
DECLARE
    factory_id_val UUID;
    fault_title_val TEXT;
    created_by_user UUID;
    resolved_by_user UUID;
    admin_user_ids UUID[];
    machine_name_val TEXT;
    admin_count INTEGER;
BEGIN
    -- DEBUG: Log başlangıç
    RAISE NOTICE '🔔 notify_fault_resolved triggered. OLD.status: %, NEW.status: %', OLD.status, NEW.status;
    
    -- Sadece status 'resolved' olduğunda çalışsın
    IF NEW.status != 'resolved' OR OLD.status = 'resolved' THEN
        RAISE NOTICE '⏭️ Skipping: status is not changing to resolved';
        RETURN NEW;
    END IF;

    RAISE NOTICE '✅ Status changed to resolved for maintenance_log_id: %', NEW.id;

    -- resolved_at ve resolved_by sütunlarını güncelle
    IF NEW.resolved_at IS NULL THEN
        NEW.resolved_at := now();
    END IF;

    IF NEW.resolved_by IS NULL THEN
        NEW.resolved_by := auth.uid();
    END IF;

    resolved_by_user := NEW.resolved_by;
    created_by_user := NEW.created_by;

    RAISE NOTICE '👤 Resolved by: %, Created by: %', resolved_by_user, created_by_user;

    -- Makine ve fabrika bilgilerini al
    SELECT m.factory_id, m.name INTO factory_id_val, machine_name_val
    FROM public.machines m
    WHERE m.id = NEW.machine_id;

    IF machine_name_val IS NULL THEN
        RAISE NOTICE '⚠️ Machine not found for machine_id: %', NEW.machine_id;
        RETURN NEW;
    END IF;

    RAISE NOTICE '✅ Machine found: % (factory_id: %)', machine_name_val, factory_id_val;

    -- Arıza başlığını al
    fault_title_val := COALESCE(NEW.title, LEFT(NEW.description, 50));
    RAISE NOTICE '📋 Fault title: %', fault_title_val;

    -- 1. Arızayı oluşturan kişiye bildirim gönder (eğer çözen kişi kendisi değilse)
    -- Bu genelde Operatör olur
    IF created_by_user IS NOT NULL 
       AND created_by_user != resolved_by_user THEN
        INSERT INTO public.notifications (user_id, factory_id, type, title, message, link, related_fault_id)
        VALUES (
            created_by_user,
            factory_id_val,
            'fault_resolved',
            'Arıza Çözüldü',
            machine_name_val || ' makinesindeki "' || fault_title_val || '" arızası çözüldü.',
            '/machines/' || NEW.machine_id::TEXT || '?log=' || NEW.id::TEXT,
            NEW.id
        );
        RAISE NOTICE '✅ Created notification for creator (operator): %', created_by_user;
    ELSE
        RAISE NOTICE '⏭️ Skipping notification for creator (same user or null)';
    END IF;

    -- 2. Fabrikadaki admin'lere bildirim gönder (çözen kişi admin ise kendine atmasın)
    SELECT ARRAY_AGG(p.id), COUNT(*)
    INTO admin_user_ids, admin_count
    FROM public.profiles p
    WHERE p.factory_id = factory_id_val
      AND p.role = 'admin'
      AND p.id != resolved_by_user; -- Çözen kişi admin ise kendine bildirim gönderme

    RAISE NOTICE '👥 Found % admin users (excluding resolver)', admin_count;

    IF admin_user_ids IS NOT NULL AND array_length(admin_user_ids, 1) > 0 THEN
        INSERT INTO public.notifications (user_id, factory_id, type, title, message, link, related_fault_id)
        SELECT
            user_id,  -- profiles.id zaten auth.users.id ile aynı UUID
            factory_id_val,
            'fault_resolved',
            'Arıza Çözüldü',
            machine_name_val || ' makinesindeki "' || fault_title_val || '" arızası çözüldü.',
            '/machines/' || NEW.machine_id::TEXT || '?log=' || NEW.id::TEXT,
            NEW.id
        FROM unnest(admin_user_ids) AS user_id;
        
        RAISE NOTICE '✅ Created % notifications for admin users', array_length(admin_user_ids, 1);
    ELSE
        RAISE NOTICE '⚠️ No admin users found or array is empty';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 4. TRIGGER'LARI YENİDEN OLUŞTUR
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
-- 5. TEST QUERIES
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
-- ============================================================

