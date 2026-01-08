# 🔍 Bildirim Sistemi Debug Rehberi

## ✅ Yapılan Değişiklikler

### 1. **Frontend Logları Eklendi**

#### `client/src/services/maintenanceService.ts`
- ✅ `report()` fonksiyonuna detaylı loglar eklendi
- ✅ `resolve()` fonksiyonuna detaylı loglar eklendi
- ✅ `mapToMaintenanceLog()` fonksiyonu güncellendi (created_by, resolved_by, resolved_at eklendi)

**Log Formatı:**
```
🔧 [MAINTENANCE SERVICE] report() called
👤 [MAINTENANCE SERVICE] Current user: {id, email}
✅ [MAINTENANCE SERVICE] Added created_by: {userId}
📤 [MAINTENANCE SERVICE] Inserting maintenance log: {data}
✅ [MAINTENANCE SERVICE] Maintenance log created successfully: {logId}
```

#### `client/src/services/notificationService.ts`
- ✅ `getAll()` fonksiyonuna detaylı loglar eklendi
- ✅ `getUnreadCount()` fonksiyonuna detaylı loglar eklendi

**Log Formatı:**
```
🔔 [NOTIFICATION SERVICE] getAll() called
👤 [NOTIFICATION SERVICE] Fetching notifications for user: {userId}
✅ [NOTIFICATION SERVICE] Found {count} notifications
```

#### `client/src/contexts/NotificationsContext.tsx`
- ✅ `fetchNotifications()` fonksiyonuna detaylı loglar eklendi
- ✅ Realtime subscription logları güncellendi

**Log Formatı:**
```
🔔 [NOTIFICATIONS CONTEXT] fetchNotifications() called
⏳ [NOTIFICATIONS CONTEXT] Fetching notifications and count...
✅ [NOTIFICATIONS CONTEXT] Fetched data: {notificationsCount, unreadCount}
🔔 [NOTIFICATIONS CONTEXT] New notification received (Realtime INSERT)
```

### 2. **Backend (SQL) Logları Eklendi**

#### `supabase_notification_system_with_logs.sql`
- ✅ `notify_new_fault()` trigger function'ına detaylı `RAISE NOTICE` logları eklendi
- ✅ `notify_fault_resolved()` trigger function'ına detaylı `RAISE NOTICE` logları eklendi

**Log Formatı:**
```
========================================
🔔 [TRIGGER] notify_new_fault() TRIGGERED
📋 Maintenance Log ID: {id}
📋 Machine ID: {machineId}
👤 Created by user: {userId}
✅ Machine found: {machineName}
👥 Found {count} admin/technician users
✅ Created {count} notifications
========================================
```

## 📋 Yapılması Gerekenler

### 1. SQL Script'i Çalıştırın

**Supabase Dashboard > SQL Editor**'da şu dosyayı çalıştırın:
```
supabase_notification_system_with_logs.sql
```

Bu script:
- Trigger function'ları log'larla birlikte yeniden oluşturur
- Trigger'ları yeniden oluşturur

### 2. Test Senaryoları

#### Test 1: Yeni Arıza Oluşturma
1. **Browser Console'u açın** (F12)
2. **Operatör** olarak giriş yapın
3. Bir makinede **yeni arıza oluşturun**
4. **Console'da şu logları kontrol edin:**
   ```
   🔧 [MAINTENANCE SERVICE] report() called
   👤 [MAINTENANCE SERVICE] Current user: ...
   ✅ [MAINTENANCE SERVICE] Maintenance log created successfully: ...
   ```
5. **Supabase Dashboard > Logs > Postgres Logs**'u kontrol edin:
   ```
   🔔 [TRIGGER] notify_new_fault() TRIGGERED
   👥 Found X admin/technician users
   ✅ Created X notifications
   ```
6. **Admin veya Technician** olarak giriş yapın
7. **Bildirimler sayfasını** kontrol edin
8. **Console'da şu logları kontrol edin:**
   ```
   🔔 [NOTIFICATION SERVICE] getAll() called
   ✅ [NOTIFICATION SERVICE] Found X notifications
   ```

#### Test 2: Arıza Çözme
1. **Browser Console'u açın** (F12)
2. **Admin veya Technician** olarak giriş yapın
3. Bir arızayı **çözün** (Resolve Fault)
4. **Console'da şu logları kontrol edin:**
   ```
   🔧 [MAINTENANCE SERVICE] resolve() called
   👤 [MAINTENANCE SERVICE] Resolving user: ...
   ✅ [MAINTENANCE SERVICE] Maintenance log resolved successfully: ...
   ```
5. **Supabase Dashboard > Logs > Postgres Logs**'u kontrol edin:
   ```
   🔔 [TRIGGER] notify_fault_resolved() TRIGGERED
   👤 Resolved by user: ...
   👤 Created by user: ...
   ✅ Created notification for creator (operator): ...
   ✅ Created X notifications for admin users
   ```
6. **Operatör** olarak giriş yapın
7. **Bildirimler sayfasını** kontrol edin
8. **Console'da şu logları kontrol edin:**
   ```
   🔔 [NOTIFICATIONS CONTEXT] New notification received (Realtime INSERT)
   ```

## 🔍 Sorun Tespiti

### Senaryo 1: Yeni Arıza Oluşturuldu Ama Bildirim Gelmedi

**Kontrol Edilecekler:**
1. ✅ Browser Console'da `[MAINTENANCE SERVICE]` logları var mı?
   - Yoksa: Frontend kodunda sorun var
2. ✅ Supabase Logs'da `[TRIGGER] notify_new_fault()` logları var mı?
   - Yoksa: Trigger çalışmıyor
3. ✅ `👥 Found X admin/technician users` logunda X > 0 mı?
   - 0 ise: Factory'de admin/technician yok veya hepsi creator
4. ✅ `✅ Created X notifications` logunda X > 0 mı?
   - 0 ise: INSERT başarısız olmuş

### Senaryo 2: Arıza Çözüldü Ama Bildirim Gelmedi

**Kontrol Edilecekler:**
1. ✅ Browser Console'da `[MAINTENANCE SERVICE] resolve()` logları var mı?
   - Yoksa: Frontend kodunda sorun var
2. ✅ Supabase Logs'da `[TRIGGER] notify_fault_resolved()` logları var mı?
   - Yoksa: Trigger çalışmıyor
3. ✅ `👤 Created by user: ...` logunda değer var mı?
   - NULL ise: created_by set edilmemiş
4. ✅ `✅ Created notification for creator` logu var mı?
   - Yoksa: Operator'e bildirim gönderilmemiş

### Senaryo 3: Bildirim Oluşturuldu Ama Frontend'de Görünmüyor

**Kontrol Edilecekler:**
1. ✅ Browser Console'da `[NOTIFICATION SERVICE] getAll()` logları var mı?
   - Yoksa: Service çağrılmıyor
2. ✅ `✅ [NOTIFICATION SERVICE] Found X notifications` logunda X > 0 mı?
   - 0 ise: Veritabanında bildirim yok veya RLS engelliyor
3. ✅ `🔔 [NOTIFICATIONS CONTEXT] New notification received (Realtime INSERT)` logu var mı?
   - Yoksa: Realtime subscription çalışmıyor

## 📊 Log Örnekleri

### Başarılı Senaryo (Yeni Arıza)

**Browser Console:**
```
🔧 [MAINTENANCE SERVICE] report() called with data: {machineId: "...", title: "..."}
👤 [MAINTENANCE SERVICE] Current user: abc-123 user@example.com
✅ [MAINTENANCE SERVICE] Added created_by: abc-123
📤 [MAINTENANCE SERVICE] Inserting maintenance log: {machine_id: "...", created_by: "abc-123", ...}
✅ [MAINTENANCE SERVICE] Maintenance log created successfully: xyz-789
```

**Supabase Logs:**
```
🔔 [TRIGGER] notify_new_fault() TRIGGERED
📋 Maintenance Log ID: xyz-789
👤 Created by user: abc-123
✅ Machine found: CNC Torna Makinesi #1
👥 Found 2 admin/technician users
✅ Created 2 notifications
```

**Browser Console (Admin/Technician):**
```
🔔 [NOTIFICATION SERVICE] getAll() called
👤 [NOTIFICATION SERVICE] Fetching notifications for user: def-456
✅ [NOTIFICATION SERVICE] Found 1 notifications
🔔 [NOTIFICATIONS CONTEXT] New notification received (Realtime INSERT)
```

## 🚨 Hata Durumları

### Hata 1: "Trigger çalışmıyor"
- **Çözüm:** `supabase_notification_system_with_logs.sql` dosyasını tekrar çalıştırın

### Hata 2: "created_by NULL"
- **Çözüm:** `maintenanceService.report()` fonksiyonunda `user` kontrolü yapılıyor mu kontrol edin

### Hata 3: "No admin/technician users found"
- **Çözüm:** `profiles` tablosunda factory_id ve role kontrolü yapın:
  ```sql
  SELECT id, role, factory_id FROM public.profiles 
  WHERE factory_id = 'YOUR_FACTORY_ID' 
    AND role IN ('admin', 'technician');
  ```

### Hata 4: "Realtime subscription çalışmıyor"
- **Çözüm:** Browser Console'da `🔔 [NOTIFICATIONS CONTEXT] Setting up Realtime subscription` logunu kontrol edin

## 📝 Notlar

- Tüm loglar `console.log()` ile yazılıyor (production'da kaldırılabilir)
- SQL logları `RAISE NOTICE` ile yazılıyor (Supabase Dashboard > Logs'ta görünür)
- Log formatı: `[SERVICE NAME] Message` şeklinde
- Emoji'ler log'ları daha kolay bulmak için kullanılıyor

