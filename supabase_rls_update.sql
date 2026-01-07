-- ============================================================
-- SUPABASE RLS POLICY UPDATE: ROLE MANAGEMENT
-- ============================================================
-- Bu SQL komutunu Supabase Dashboard > SQL Editor'da çalıştırın
-- Admin kullanıcıların aynı factory_id'deki diğer kullanıcıların
-- rollerini güncellemesine izin verir.
-- ============================================================

-- Önce mevcut "Public Access Profiles" policy'sini kaldır
DROP POLICY IF EXISTS "Public Access Profiles" ON public.profiles;

-- Yeni, daha spesifik policy'ler oluştur

-- 1. Herkes kendi profilini okuyabilir
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = id);

-- 2. Herkes aynı factory'deki profilleri görüntüleyebilir
CREATE POLICY "Users can view same factory profiles"
ON public.profiles
FOR SELECT
USING (
  factory_id IN (
    SELECT factory_id FROM public.profiles WHERE id = auth.uid()
  )
);

-- 3. Herkes kendi profilini güncelleyebilir (role hariç)
CREATE POLICY "Users can update own profile (except role)"
ON public.profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id 
  AND role = (SELECT role FROM public.profiles WHERE id = auth.uid())
);

-- 4. Admin'ler aynı factory'deki kullanıcıların rollerini güncelleyebilir
CREATE POLICY "Admins can update roles in same factory"
ON public.profiles
FOR UPDATE
USING (
  -- Güncelleyen kişi admin olmalı
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role = 'admin'
    AND factory_id IN (
      SELECT factory_id FROM public.profiles WHERE id = public.profiles.id
    )
  )
  -- Kendi rolünü değiştiremez
  AND auth.uid() != public.profiles.id
)
WITH CHECK (
  -- Güncelleyen kişi admin olmalı
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role = 'admin'
    AND factory_id IN (
      SELECT factory_id FROM public.profiles WHERE id = public.profiles.id
    )
  )
  -- Kendi rolünü değiştiremez
  AND auth.uid() != public.profiles.id
);

-- 5. Yeni profil oluşturma (kayıt sırasında)
CREATE POLICY "Allow profile creation during signup"
ON public.profiles
FOR INSERT
WITH CHECK (auth.uid() = id);

-- ============================================================
-- TEST QUERY (Opsiyonel - Kontrol için)
-- ============================================================
-- Admin kullanıcı olarak giriş yapın ve şunu çalıştırın:
-- SELECT * FROM public.profiles WHERE factory_id = 'YOUR_FACTORY_ID';
-- ============================================================

