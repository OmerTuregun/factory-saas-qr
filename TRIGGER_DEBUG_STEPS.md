# 🔍 Trigger Debug Adımları

## 📊 Log Analizi Sonucu

Log dosyasına baktığımda:
- ✅ SQL script başarıyla çalıştırılmış
- ✅ Trigger'lar oluşturulmuş görünüyor
- ❌ **RAISE NOTICE mesajları log'larda görünmüyor**

**ÖNEMLİ:** Supabase'de `RAISE NOTICE` mesajları genellikle Postgres Logs'a düşmez. Bu normal bir durumdur.

## 🔧 Trigger'ların Çalışıp Çalışmadığını Test Etme

### Adım 1: Trigger'ların Var Olduğunu Kontrol Et

Supabase Dashboard > SQL Editor'da şu sorguyu çalıştırın:

```sql
SELECT 
    trigger_name, 
    event_manipulation, 
    event_object_table
FROM information_schema.triggers
WHERE event_object_table = 'maintenance_logs';
```

**Beklenen Sonuç:**
- `trigger_notify_new_fault` (INSERT için)
- `trigger_notify_fault_resolved` (UPDATE için)

### Adım 2: Test Senaryosu

1. **Operatör** olarak giriş yapın
2. Yeni bir arıza oluşturun
3. **Supabase Dashboard > Table Editor > notifications** tablosunu kontrol edin
4. Yeni bildirimler oluşmuş mu bakın

### Adım 3: Bildirimleri Kontrol Et

```sql
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
LIMIT 10;
```

**Kontrol Edilecekler:**
- ✅ `is_read = false` olmalı
- ✅ `type = 'new_fault'` veya `'fault_resolved'` olmalı
- ✅ `related_fault_id` dolu olmalı

### Adım 4: Arıza Çözme Testi

1. **Admin** olarak giriş yapın
2. Bir arızayı çözün
3. **notifications** tablosunu tekrar kontrol edin
4. Şunlar oluşmalı:
   - ✅ Operatör için `fault_resolved` bildirimi (`is_read: false`)
   - ✅ Technician için `fault_resolved` bildirimi (`is_read: false`)
   - ❌ Admin için bildirim **OLMAMALI** (kendisi çözdü)

## 🚨 Sorun Tespiti

### Senaryo 1: Trigger'lar Yok

**Çözüm:**
```sql
-- Trigger'ları yeniden oluştur
DROP TRIGGER IF EXISTS trigger_notify_new_fault ON public.maintenance_logs;
DROP TRIGGER IF EXISTS trigger_notify_fault_resolved ON public.maintenance_logs;

CREATE TRIGGER trigger_notify_new_fault
    AFTER INSERT ON public.maintenance_logs
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_new_fault();

CREATE TRIGGER trigger_notify_fault_resolved
    AFTER UPDATE OF status ON public.maintenance_logs
    FOR EACH ROW
    WHEN (NEW.status = 'resolved' AND OLD.status != 'resolved')
    EXECUTE FUNCTION public.notify_fault_resolved();
```

### Senaryo 2: Bildirimler Oluşmuyor

**Kontrol Edilecekler:**
1. ✅ `profiles` tablosunda kullanıcılar var mı?
   ```sql
   SELECT id, role, factory_id FROM public.profiles;
   ```
2. ✅ `machines` tablosunda `factory_id` dolu mu?
   ```sql
   SELECT id, name, factory_id FROM public.machines LIMIT 5;
   ```
3. ✅ `maintenance_logs` tablosunda `created_by` dolu mu?
   ```sql
   SELECT id, created_by, status FROM public.maintenance_logs 
   ORDER BY created_at DESC LIMIT 5;
   ```

### Senaryo 3: Bildirimler `is_read: true` Olarak Oluşturuluyor

**Kontrol:**
```sql
SELECT column_default 
FROM information_schema.columns 
WHERE table_name = 'notifications' 
  AND column_name = 'is_read';
```

**Beklenen:** `false` veya `NULL` (default değer)

**Eğer farklıysa:**
```sql
ALTER TABLE public.notifications 
ALTER COLUMN is_read SET DEFAULT false;
```

## 📝 Test Checklist

- [ ] Trigger'lar var mı? (`test_triggers.sql` çalıştır)
- [ ] Yeni arıza oluşturulduğunda bildirimler oluşuyor mu?
- [ ] Arıza çözüldüğünde bildirimler oluşuyor mu?
- [ ] Bildirimler `is_read: false` olarak oluşuyor mu?
- [ ] Operatör'e bildirim gidiyor mu?
- [ ] Admin'e bildirim gidiyor mu? (çözen hariç)
- [ ] Technician'e bildirim gidiyor mu? (çözen hariç)

## 🔗 İlgili Dosyalar

- `test_triggers.sql` - Trigger test sorguları
- `supabase_notification_system_with_logs.sql` - Ana SQL script

