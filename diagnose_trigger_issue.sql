-- ============================================================
-- TRIGGER SORUNU TESPİT SORGULARI
-- ============================================================

-- 1. TRIGGER'LAR VAR MI?
SELECT 
    trigger_name, 
    event_manipulation, 
    event_object_table,
    action_timing,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'maintenance_logs'
ORDER BY trigger_name;

-- 2. FUNCTION'LAR VAR MI?
SELECT 
    routine_name,
    routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('notify_new_fault', 'notify_fault_resolved')
ORDER BY routine_name;

-- 3. SON OLUŞTURULAN MAINTENANCE LOG (DENEME DENEME)
SELECT 
    id,
    machine_id,
    title,
    status,
    created_by,
    created_at
FROM public.maintenance_logs
WHERE id = 'a96eae1d-643a-4ffa-a5aa-89749f2e1fb4';

-- 4. BU LOG İÇİN BİLDİRİMLER VAR MI?
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
WHERE related_fault_id = 'a96eae1d-643a-4ffa-a5aa-89749f2e1fb4'
ORDER BY created_at DESC;

-- 5. MAKİNE BİLGİLERİ
SELECT 
    m.id,
    m.name,
    m.factory_id
FROM public.machines m
WHERE m.id = '63caecff-6d43-454e-9bee-2241b2d29c0d';

-- 6. FACTORY'DEKİ ADMIN VE TECHNICIAN KULLANICILARI
SELECT 
    p.id,
    p.role,
    p.factory_id,
    u.email
FROM public.profiles p
LEFT JOIN auth.users u ON u.id = p.id
WHERE p.factory_id = '7e20f47b-a7a0-4abe-a068-33f7cc781863'
  AND p.role IN ('admin', 'technician')
ORDER BY p.role, u.email;

-- 7. TÜM BİLDİRİMLER (SON 20)
SELECT 
    id,
    user_id,
    type,
    title,
    is_read,
    created_at,
    related_fault_id
FROM public.notifications
ORDER BY created_at DESC
LIMIT 20;

-- 8. TRIGGER'LARI MANUEL TEST ETMEK İÇİN
-- (Bu sorguyu çalıştırmadan önce trigger'ların var olduğundan emin olun)
/*
-- Test: Manuel olarak trigger function'ı çağır
-- ÖNEMLİ: Bu sadece test için, gerçek kullanımda otomatik çalışır
DO $$
DECLARE
    test_log_id UUID := 'a96eae1d-643a-4ffa-a5aa-89749f2e1fb4';
    test_machine_id UUID := '63caecff-6d43-454e-9bee-2241b2d29c0d';
    test_created_by UUID := '86385355-84de-48ea-a8e4-fecbdb296ab6';
    test_record RECORD;
BEGIN
    -- Maintenance log kaydını al
    SELECT * INTO test_record
    FROM public.maintenance_logs
    WHERE id = test_log_id;
    
    -- Trigger function'ı manuel çağır
    PERFORM public.notify_new_fault() FROM (SELECT test_record.*) AS NEW;
    
    RAISE NOTICE 'Trigger function called manually';
END $$;
*/

