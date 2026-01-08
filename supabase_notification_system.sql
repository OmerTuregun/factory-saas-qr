-- ============================================================
-- SUPABASE NOTIFICATION SYSTEM - BACKEND SETUP
-- ============================================================
-- Bu SQL komutunu Supabase Dashboard > SQL Editor'da çalıştırın
-- Bildirim sistemi için gerekli tablolar, trigger'lar ve RLS politikaları
-- ============================================================

-- ============================================================
-- 1. NOTIFICATIONS TABLOSU OLUŞTURMA
-- ============================================================

CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    factory_id UUID NOT NULL REFERENCES public.factories(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('new_fault', 'fault_resolved')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    link TEXT,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Index'ler
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_factory_id ON public.notifications(factory_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

-- ============================================================
-- 2. MAINTENANCE_LOGS TABLOSUNA YENİ SÜTUNLAR EKLEME
-- ============================================================

-- resolved_by sütunu ekle (kim çözdü?)
ALTER TABLE public.maintenance_logs
ADD COLUMN IF NOT EXISTS resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- resolved_at sütunu ekle (ne zaman çözüldü?)
ALTER TABLE public.maintenance_logs
ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP WITH TIME ZONE;

-- created_by sütunu ekle (kim oluşturdu? - Arızayı bildiren kişi için)
-- Bu sütun bildirim göndermek için gerekli
ALTER TABLE public.maintenance_logs
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Index'ler
CREATE INDEX IF NOT EXISTS idx_maintenance_logs_resolved_by ON public.maintenance_logs(resolved_by);
CREATE INDEX IF NOT EXISTS idx_maintenance_logs_created_by ON public.maintenance_logs(created_by);

-- ============================================================
-- 3. TRIGGER FONKSİYONLARI
-- ============================================================

-- ============================================================
-- SENARYO 1: YENİ ARIZA BİLDİRİMİ (INSERT TRIGGER)
-- ============================================================

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
    IF admin_technician_users IS NOT NULL THEN
        INSERT INTO public.notifications (user_id, factory_id, type, title, message, link)
        SELECT
            unnest(admin_technician_users),
            factory_id_val,
            'new_fault',
            'Yeni Arıza Bildirimi',
            machine_name_val || ' makinesinde yeni bir arıza bildirildi.',
            '/machines/' || NEW.machine_id::TEXT;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger'ı oluştur
DROP TRIGGER IF EXISTS trigger_notify_new_fault ON public.maintenance_logs;
CREATE TRIGGER trigger_notify_new_fault
    AFTER INSERT ON public.maintenance_logs
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_new_fault();

-- ============================================================
-- SENARYO 2: ARIZA ÇÖZÜLDÜ BİLDİRİMİ (UPDATE TRIGGER)
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
    IF created_by_user IS NOT NULL 
       AND created_by_user != resolved_by_user THEN
        INSERT INTO public.notifications (user_id, factory_id, type, title, message, link)
        VALUES (
            created_by_user,
            factory_id_val,
            'fault_resolved',
            'Arıza Çözüldü',
            fault_title_val || ' arızası çözüldü.',
            '/machines/' || NEW.machine_id::TEXT
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
            '/machines/' || NEW.machine_id::TEXT;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger'ı oluştur
DROP TRIGGER IF EXISTS trigger_notify_fault_resolved ON public.maintenance_logs;
CREATE TRIGGER trigger_notify_fault_resolved
    AFTER UPDATE ON public.maintenance_logs
    FOR EACH ROW
    WHEN (NEW.status = 'resolved' AND OLD.status != 'resolved')
    EXECUTE FUNCTION public.notify_fault_resolved();

-- ============================================================
-- 4. ROW LEVEL SECURITY (RLS) POLİTİKALARI
-- ============================================================

-- RLS'i etkinleştir
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Mevcut policy'leri temizle (varsa)
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;

-- Policy 1: Kullanıcılar SADECE kendi bildirimlerini görebilir (SELECT)
CREATE POLICY "Users can view own notifications"
ON public.notifications
FOR SELECT
USING (auth.uid() = user_id);

-- Policy 2: Kullanıcılar SADECE kendi bildirimlerini güncelleyebilir (UPDATE - okundu yapmak için)
CREATE POLICY "Users can update own notifications"
ON public.notifications
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 5. YARDIMCI FONKSİYONLAR (Opsiyonel - Frontend için)
-- ============================================================

-- Okunmamış bildirim sayısını döndüren fonksiyon
CREATE OR REPLACE FUNCTION public.get_unread_notification_count()
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)
        FROM public.notifications
        WHERE user_id = auth.uid()
          AND is_read = false
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- TEST QUERIES (Opsiyonel - Kontrol için)
-- ============================================================
-- 
-- 1. Bildirimleri görüntüle:
--    SELECT * FROM public.notifications WHERE user_id = auth.uid() ORDER BY created_at DESC;
--
-- 2. Okunmamış bildirim sayısı:
--    SELECT public.get_unread_notification_count();
--
-- 3. Bildirimi okundu olarak işaretle:
--    UPDATE public.notifications SET is_read = true WHERE id = 'NOTIFICATION_ID' AND user_id = auth.uid();
--
-- ============================================================

-- ============================================================
-- NOTLAR:
-- ============================================================
-- 1. Trigger fonksiyonları SECURITY DEFINER olarak çalışır,
--    bu yüzden auth.uid() ve diğer auth fonksiyonlarını kullanabilir.
--
-- 2. created_by sütunu INSERT sırasında otomatik olarak
--    auth.uid() ile doldurulur (eğer boşsa).
--
-- 3. resolved_by sütunu UPDATE sırasında otomatik olarak
--    auth.uid() ile doldurulur (eğer boşsa).
--
-- 4. RLS politikaları sayesinde kullanıcılar sadece kendi
--    bildirimlerini görebilir ve güncelleyebilir.
--
-- ============================================================

