-- ============================================================
-- SUPABASE NOTIFICATION SYSTEM - FIXES
-- ============================================================
-- Bu SQL komutunu Supabase Dashboard > SQL Editor'da çalıştırın
-- Bildirim sistemi için düzeltmeler
-- ============================================================

-- ============================================================
-- FIX 1: Notification link'ine maintenance_log_id ekleme
-- ============================================================

-- Yeni arıza bildirimi trigger'ını güncelle
CREATE OR REPLACE FUNCTION public.notify_new_fault()
RETURNS TRIGGER AS $$
DECLARE
    machine_record RECORD;
    factory_id_val UUID;
    machine_name_val TEXT;
    admin_technician_users UUID[];
BEGIN
    -- Makine bilgilerini al
    SELECT m.factory_id, m.name INTO factory_id_val, machine_name_val
    FROM public.machines m
    WHERE m.id = NEW.machine_id;

    -- Eğer makine bulunamazsa, işlemi durdur
    IF machine_name_val IS NULL THEN
        RETURN NEW;
    END IF;

    -- created_by sütununu auth.uid() ile doldur (eğer boşsa)
    IF NEW.created_by IS NULL THEN
        NEW.created_by := auth.uid();
    END IF;

    -- Fabrikadaki admin ve technician kullanıcılarını bul
    SELECT ARRAY_AGG(p.id)
    INTO admin_technician_users
    FROM public.profiles p
    WHERE p.factory_id = factory_id_val
      AND p.role IN ('admin', 'technician');

    -- Her admin ve technician için bildirim oluştur
    -- Link'e maintenance_log_id ekle: /machines/{machineId}?log={logId}
    IF admin_technician_users IS NOT NULL THEN
        INSERT INTO public.notifications (user_id, factory_id, type, title, message, link)
        SELECT
            unnest(admin_technician_users),
            factory_id_val,
            'new_fault',
            'Yeni Arıza Bildirimi',
            machine_name_val || ' makinesinde yeni bir arıza bildirildi.',
            '/machines/' || NEW.machine_id::TEXT || '?log=' || NEW.id::TEXT;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- FIX 2: Arıza çözüldü bildirimi - Operator'e de gönder
-- ============================================================

CREATE OR REPLACE FUNCTION public.notify_fault_resolved()
RETURNS TRIGGER AS $$
DECLARE
    machine_record RECORD;
    factory_id_val UUID;
    fault_title_val TEXT;
    created_by_user UUID;
    resolved_by_user UUID;
    admin_users UUID[];
BEGIN
    -- Sadece status 'resolved' olduğunda çalışsın
    IF NEW.status != 'resolved' OR OLD.status = 'resolved' THEN
        RETURN NEW;
    END IF;

    -- resolved_at ve resolved_by sütunlarını güncelle
    IF NEW.resolved_at IS NULL THEN
        NEW.resolved_at := now();
    END IF;

    IF NEW.resolved_by IS NULL THEN
        NEW.resolved_by := auth.uid();
    END IF;

    resolved_by_user := NEW.resolved_by;
    created_by_user := NEW.created_by;

    -- Makine ve fabrika bilgilerini al
    SELECT m.factory_id INTO factory_id_val
    FROM public.machines m
    WHERE m.id = NEW.machine_id;

    -- Arıza başlığını al (title varsa, yoksa description'un ilk 50 karakteri)
    fault_title_val := COALESCE(NEW.title, LEFT(NEW.description, 50));

    -- 1. Arızayı oluşturan kişiye bildirim gönder (eğer çözen kişi kendisi değilse)
    -- Bu operator, technician veya admin olabilir
    IF created_by_user IS NOT NULL 
       AND created_by_user != resolved_by_user THEN
        INSERT INTO public.notifications (user_id, factory_id, type, title, message, link)
        VALUES (
            created_by_user,
            factory_id_val,
            'fault_resolved',
            'Arıza Çözüldü',
            fault_title_val || ' arızası çözüldü.',
            '/machines/' || NEW.machine_id::TEXT || '?log=' || NEW.id::TEXT
        );
    END IF;

    -- 2. Fabrikadaki admin'lere bildirim gönder (çözen kişi admin ise kendine atmasın)
    SELECT ARRAY_AGG(p.id)
    INTO admin_users
    FROM public.profiles p
    WHERE p.factory_id = factory_id_val
      AND p.role = 'admin'
      AND p.id != resolved_by_user; -- Çözen kişi admin ise kendine bildirim gönderme

    IF admin_users IS NOT NULL THEN
        INSERT INTO public.notifications (user_id, factory_id, type, title, message, link)
        SELECT
            unnest(admin_users),
            factory_id_val,
            'fault_resolved',
            'Arıza Çözüldü',
            fault_title_val || ' arızası çözüldü.',
            '/machines/' || NEW.machine_id::TEXT || '?log=' || NEW.id::TEXT;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- NOT: Trigger'lar zaten oluşturulmuş, sadece fonksiyonlar güncellendi
-- ============================================================

