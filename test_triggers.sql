-- ============================================================
-- TRIGGER TEST SCRIPT
-- ============================================================
-- Trigger'ların çalışıp çalışmadığını test etmek için
-- ============================================================

-- 1. Trigger'ların var olup olmadığını kontrol et
SELECT 
    trigger_name, 
    event_manipulation, 
    event_object_table,
    action_timing,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'maintenance_logs'
ORDER BY trigger_name;

-- 2. Function'ların var olup olmadığını kontrol et
SELECT 
    routine_name,
    routine_type,
    routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('notify_new_fault', 'notify_fault_resolved')
ORDER BY routine_name;

-- 3. Son oluşturulan bildirimleri kontrol et
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
LIMIT 20;

-- 4. Son maintenance log'ları kontrol et
SELECT 
    id,
    machine_id,
    title,
    status,
    created_by,
    resolved_by,
    resolved_at,
    created_at
FROM public.maintenance_logs
ORDER BY created_at DESC
LIMIT 10;

-- 5. Test: Manuel olarak trigger'ı tetiklemek için
-- (Bu sadece test için, gerçek kullanımda otomatik çalışır)
-- NOT: Bu sorguyu çalıştırmadan önce gerçek bir machine_id ve user_id kullanın

/*
-- Örnek: Yeni bir test arızası oluştur (trigger'ı tetikler)
INSERT INTO public.maintenance_logs (
    machine_id, 
    title, 
    description, 
    priority, 
    status, 
    created_by
)
VALUES (
    'YOUR_MACHINE_ID_HERE',  -- Gerçek bir machine_id kullanın
    'Test Arıza',
    'Bu bir test arızasıdır',
    'high',
    'pending',
    'YOUR_USER_ID_HERE'  -- Gerçek bir user_id kullanın
);

-- Sonra bildirimlerin oluşup oluşmadığını kontrol edin:
SELECT * FROM public.notifications 
WHERE related_fault_id = (
    SELECT id FROM public.maintenance_logs 
    WHERE title = 'Test Arıza' 
    ORDER BY created_at DESC 
    LIMIT 1
);
*/

