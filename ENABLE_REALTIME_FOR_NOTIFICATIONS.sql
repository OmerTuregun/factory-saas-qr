-- ============================================================
-- SUPABASE REALTIME ETKİNLEŞTİRME
-- ============================================================
-- Bu script, notifications tablosu için Realtime'i etkinleştirir
-- Supabase Dashboard > Database > Replication'da da yapılabilir
-- ============================================================

-- 1. notifications tablosu için Realtime'i etkinleştir
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- 2. Kontrol: Realtime etkin mi?
SELECT 
    schemaname,
    tablename,
    pubname
FROM pg_publication_tables
WHERE tablename = 'notifications';

-- 3. Eğer yukarıdaki sorgu sonuç döndürmezse, Realtime etkin değildir
-- Supabase Dashboard > Database > Replication > notifications tablosunu seçin

-- ============================================================
-- NOT: Supabase Dashboard'dan da yapılabilir:
-- 1. Supabase Dashboard'a gidin
-- 2. Database > Replication
-- 3. "notifications" tablosunu bulun
-- 4. Toggle'ı açın (Enable Realtime)
-- ============================================================

