-- ============================================================
-- SUPABASE NOTIFICATION SYSTEM - COMPLETE REBUILD
-- ============================================================
-- Bildirim sistemi için tam yeniden yapılandırma
-- ============================================================

-- ============================================================
-- 1. NOTIFICATIONS TABLOSU GÜNCELLEMESİ
-- ============================================================

-- related_fault_id sütununu ekle (eğer yoksa)
ALTER TABLE public.notifications
ADD COLUMN IF NOT EXISTS related_fault_id UUID REFERENCES public.maintenance_logs(id) ON DELETE CASCADE;

-- Index ekle (performans için)
CREATE INDEX IF NOT EXISTS idx_notifications_related_fault_id ON public.notifications(related_fault_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id_is_read ON public.notifications(user_id, is_read);

-- ============================================================
-- 2. TRIGGER FUNCTION: YENİ ARIZA BİLDİRİMİ
-- ============================================================
-- Senaryo: maintenance_logs tablosuna INSERT yapıldığında
-- - İlgili fabrikadaki TÜM admin ve technician rollerine bildirim oluştur
-- - ÖNEMLİ: Arızayı oluşturan kişiye bildirim ATMA

CREATE OR REPLACE FUNCTION public.notify_new_fault()
RETURNS TRIGGER AS $$
DECLARE
    factory_id_val UUID;
    machine_name_val TEXT;
    admin_technician_users UUID[];
    fault_title_val TEXT;
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

    -- Arıza başlığını al
    fault_title_val := COALESCE(NEW.title, LEFT(NEW.description, 50));

    -- Fabrikadaki admin ve technician kullanıcılarını bul
    -- ÖNEMLİ: Arızayı oluşturan kişiyi (created_by) hariç tut
    SELECT ARRAY_AGG(p.id)
    INTO admin_technician_users
    FROM public.profiles p
    WHERE p.factory_id = factory_id_val
      AND p.role IN ('admin', 'technician')
      AND (NEW.created_by IS NULL OR p.id != NEW.created_by); -- Arızayı oluşturan kişiye bildirim ATMA

    -- Her admin ve technician için bildirim oluştur
    IF admin_technician_users IS NOT NULL AND array_length(admin_technician_users, 1) > 0 THEN
        INSERT INTO public.notifications (user_id, factory_id, type, title, message, link, related_fault_id)
        SELECT
            user_id,  -- profiles.id zaten auth.users.id ile aynı UUID
            factory_id_val,
            'new_fault',
            'Yeni Arıza Bildirimi',
            machine_name_val || ' makinesinde yeni bir arıza bildirildi: ' || fault_title_val,
            '/machines/' || NEW.machine_id::TEXT || '?log=' || NEW.id::TEXT,
            NEW.id
        FROM unnest(admin_technician_users) AS user_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 3. TRIGGER FUNCTION: ARIZA ÇÖZÜLDÜ BİLDİRİMİ
-- ============================================================
-- Senaryo: maintenance_logs tablosunda status = 'resolved' olduğunda
-- - Arızayı ilk açan (created_by) kullanıcıya bildirim at
-- - Tüm Adminlere bildirim at
-- - ÖNEMLİ: Çözen kişi kendisine bildirim ATMASIN

CREATE OR REPLACE FUNCTION public.notify_fault_resolved()
RETURNS TRIGGER AS $$
DECLARE
    factory_id_val UUID;
    fault_title_val TEXT;
    created_by_user UUID;
    resolved_by_user UUID;
    admin_users UUID[];
    machine_name_val TEXT;
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
    SELECT m.factory_id, m.name INTO factory_id_val, machine_name_val
    FROM public.machines m
    WHERE m.id = NEW.machine_id;

    -- Arıza başlığını al
    fault_title_val := COALESCE(NEW.title, LEFT(NEW.description, 50));

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
    END IF;

    -- 2. Fabrikadaki admin'lere bildirim gönder (çözen kişi admin ise kendine atmasın)
    SELECT ARRAY_AGG(p.id)
    INTO admin_users
    FROM public.profiles p
    WHERE p.factory_id = factory_id_val
      AND p.role = 'admin'
      AND p.id != resolved_by_user; -- Çözen kişi admin ise kendine bildirim gönderme

    IF admin_users IS NOT NULL AND array_length(admin_users, 1) > 0 THEN
        INSERT INTO public.notifications (user_id, factory_id, type, title, message, link, related_fault_id)
        SELECT
            user_id,  -- profiles.id zaten auth.users.id ile aynı UUID
            factory_id_val,
            'fault_resolved',
            'Arıza Çözüldü',
            machine_name_val || ' makinesindeki "' || fault_title_val || '" arızası çözüldü.',
            '/machines/' || NEW.machine_id::TEXT || '?log=' || NEW.id::TEXT,
            NEW.id
        FROM unnest(admin_users) AS user_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 4. TRIGGER'LARI OLUŞTUR/GÜNCELLE
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
-- 5. RLS POLICIES (Eğer yoksa)
-- ============================================================

-- RLS'i etkinleştir
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Kullanıcılar sadece kendi bildirimlerini görebilir
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications"
    ON public.notifications FOR SELECT
    USING (auth.uid() = user_id);

-- Kullanıcılar sadece kendi bildirimlerini güncelleyebilir (okundu yapmak için)
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications"
    ON public.notifications FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- NOT: Bu SQL script'i Supabase Dashboard > SQL Editor'da çalıştırın
-- ============================================================

