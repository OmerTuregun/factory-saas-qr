-- ============================================================
-- SUPABASE NOTIFICATION SYSTEM - UPDATE
-- ============================================================
-- Arıza çözüldüğünde admin ve teknikerin "new_fault" bildirimlerini güncelleme
-- ============================================================

-- ============================================================
-- UPDATE: Arıza çözüldüğünde admin ve teknikerin bildirimlerini güncelle
-- ============================================================

CREATE OR REPLACE FUNCTION public.notify_fault_resolved()
RETURNS TRIGGER AS $$
DECLARE
    factory_id_val UUID;
    fault_title_val TEXT;
    created_by_user UUID;
    resolved_by_user UUID;
    admin_users UUID[];
    technician_users UUID[];
    -- Admin ve teknikerin "new_fault" bildirimlerini bulmak için
    related_notification_ids UUID[];
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
      AND p.id != resolved_by_user;

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

    -- 3. YENİ: Admin ve teknikerin "new_fault" bildirimlerini bul ve güncelle
    -- Bu bildirimlerin link'inde aynı maintenance_log_id olmalı
    -- Link formatı: /machines/{machineId}?log={logId}
    SELECT ARRAY_AGG(n.id)
    INTO related_notification_ids
    FROM public.notifications n
    INNER JOIN public.profiles p ON n.user_id = p.id
    WHERE n.type = 'new_fault'
      AND n.factory_id = factory_id_val
      AND p.role IN ('admin', 'technician')
      AND n.link LIKE '/machines/' || NEW.machine_id::TEXT || '%'
      AND n.link LIKE '%log=' || NEW.id::TEXT || '%'
      AND n.is_read = false; -- Sadece okunmamış bildirimleri güncelle

    -- Eğer ilgili bildirimler varsa, onları "fault_resolved" tipine çevir
    -- Bu sayede bildirimler yeşil görünecek ama okundu olmayacak
    IF related_notification_ids IS NOT NULL THEN
        UPDATE public.notifications
        SET 
            type = 'fault_resolved',
            title = 'Arıza Çözüldü',
            message = fault_title_val || ' arızası çözüldü.'
        WHERE id = ANY(related_notification_ids);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- NOT: Bu güncelleme mevcut trigger'ı değiştirir
-- ============================================================

