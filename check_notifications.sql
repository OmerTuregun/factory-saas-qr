-- ============================================================
-- BİLDİRİM KONTROL SORGULARI
-- ============================================================

-- 1. Son oluşturulan maintenance log'u kontrol et
SELECT 
    id,
    machine_id,
    title,
    status,
    created_by,
    created_at
FROM public.maintenance_logs
ORDER BY created_at DESC
LIMIT 5;

-- 2. Bu maintenance log için bildirimler var mı?
-- (Son oluşturulan log'un ID'sini kullan)
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
WHERE related_fault_id = (
    SELECT id FROM public.maintenance_logs 
    ORDER BY created_at DESC 
    LIMIT 1
)
ORDER BY created_at DESC;

-- 3. Tüm bildirimleri kontrol et
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

-- 4. Trigger'ların var olup olmadığını kontrol et
SELECT 
    trigger_name, 
    event_manipulation, 
    event_object_table,
    action_timing
FROM information_schema.triggers
WHERE event_object_table = 'maintenance_logs'
ORDER BY trigger_name;

-- 5. Factory'deki admin ve technician kullanıcılarını kontrol et
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

-- 6. Son oluşturulan maintenance log'un makine bilgilerini kontrol et
SELECT 
    ml.id as log_id,
    ml.title,
    ml.created_by,
    ml.created_at,
    m.id as machine_id,
    m.name as machine_name,
    m.factory_id
FROM public.maintenance_logs ml
LEFT JOIN public.machines m ON m.id = ml.machine_id
ORDER BY ml.created_at DESC
LIMIT 5;

