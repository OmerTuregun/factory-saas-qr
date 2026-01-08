# 🔧 Trigger Sorunu Çözüm Adımları

## 📊 Durum Analizi

Log'lara göre:
- ✅ Operatör arıza oluşturdu: `a96eae1d-643a-4ffa-a5aa-89749f2e1fb4`
- ✅ `created_by` doğru set edildi: `86385355-84de-48ea-a8e4-fecbdb296ab6`
- ❌ **Admin'e bildirim gelmedi**

Bu, trigger'ın çalışmadığı veya bir hata olduğu anlamına geliyor.

## 🔍 Adım 1: Kontrol Sorguları

Supabase Dashboard > SQL Editor'da `check_notifications.sql` dosyasını çalıştırın.

Bu sorgu şunları kontrol eder:
1. Son oluşturulan maintenance log'u
2. Bu log için bildirimler var mı?
3. Tüm bildirimler
4. Trigger'lar var mı?
5. Factory'deki admin/technician kullanıcıları
6. Makine bilgileri

## 🔧 Adım 2: Olası Sorunlar ve Çözümler

### Sorun 1: Trigger'lar Yok

**Kontrol:**
```sql
SELECT trigger_name FROM information_schema.triggers
WHERE event_object_table = 'maintenance_logs';
```

**Çözüm:**
```sql
-- Trigger'ları yeniden oluştur
DROP TRIGGER IF EXISTS trigger_notify_new_fault ON public.maintenance_logs;
CREATE TRIGGER trigger_notify_new_fault
    AFTER INSERT ON public.maintenance_logs
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_new_fault();
```

### Sorun 2: Function'lar Yok veya Hatalı

**Kontrol:**
```sql
SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'notify_new_fault';
```

**Çözüm:** `supabase_notification_system_with_logs.sql` dosyasını tekrar çalıştırın.

### Sorun 3: Factory ID Eşleşmiyor

**Kontrol:**
```sql
-- Makine'nin factory_id'sini kontrol et
SELECT m.id, m.name, m.factory_id 
FROM public.machines m
WHERE m.id = '63caecff-6d43-454e-9bee-2241b2d29c0d';

-- Profiles'teki factory_id'leri kontrol et
SELECT p.id, p.role, p.factory_id 
FROM public.profiles p
WHERE p.role IN ('admin', 'technician');
```

**Sorun:** Eğer `m.factory_id` ile `p.factory_id` eşleşmiyorsa, bildirimler oluşmaz.

### Sorun 4: RLS (Row Level Security) Engelliyor

**Kontrol:**
```sql
-- RLS'in açık olup olmadığını kontrol et
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename = 'notifications';
```

**Çözüm:** Trigger function `SECURITY DEFINER` kullanıyor, bu RLS'i bypass eder. Ama kontrol edelim.

## 🚀 Hızlı Çözüm

Eğer trigger'lar çalışmıyorsa, şu adımları izleyin:

1. **Trigger'ları kontrol et:**
   ```sql
   SELECT trigger_name FROM information_schema.triggers
   WHERE event_object_table = 'maintenance_logs';
   ```

2. **Eğer yoksa, yeniden oluştur:**
   - `supabase_notification_system_with_logs.sql` dosyasını tekrar çalıştırın
   - Veya sadece trigger kısmını çalıştırın:
   ```sql
   DROP TRIGGER IF EXISTS trigger_notify_new_fault ON public.maintenance_logs;
   CREATE TRIGGER trigger_notify_new_fault
       AFTER INSERT ON public.maintenance_logs
       FOR EACH ROW
       EXECUTE FUNCTION public.notify_new_fault();
   ```

3. **Test et:**
   - Yeni bir arıza oluşturun
   - `check_notifications.sql` sorgusunu çalıştırın
   - Bildirimler oluşmuş mu kontrol edin

## 📝 Test Senaryosu

1. Operatör olarak giriş yapın
2. Yeni bir arıza oluşturun
3. `check_notifications.sql` sorgusunu çalıştırın
4. Sonuçları kontrol edin:
   - Maintenance log oluşmuş mu?
   - Bildirimler oluşmuş mu?
   - Hangi kullanıcılara bildirim gitmiş?

## 🔗 İlgili Dosyalar

- `check_notifications.sql` - Kontrol sorguları
- `supabase_notification_system_with_logs.sql` - Ana SQL script

