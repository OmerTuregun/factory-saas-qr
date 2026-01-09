-- ============================================
-- AUDIT LOGS SYSTEM
-- ============================================
-- Bu dosya, sistemdeki kritik değişiklikleri takip etmek için
-- audit_logs tablosunu ve güvenlik ayarlarını oluşturur.
-- ============================================

-- 1. AUDIT_LOGS TABLOSU
-- ============================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL, -- 'CREATE', 'UPDATE', 'DELETE', 'LOGIN', vb.
  entity TEXT NOT NULL, -- 'machines', 'maintenance_logs', 'profiles', vb.
  entity_id UUID, -- İşlem yapılan kaydın ID'si (nullable çünkü bazı işlemler entity_id olmayabilir)
  details JSONB, -- Değişiklik detayları: { old_value: ..., new_value: ..., ... }
  ip_address TEXT, -- Opsiyonel, varsa IP adresi
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index'ler (Performans için)
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_id ON audit_logs(entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- 2. ROW LEVEL SECURITY (RLS) AYARLARI
-- ============================================

-- RLS'yi etkinleştir
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- POLICY 1: INSERT - Authenticated users (Herkes log oluşturabilir)
-- Not: Loglama başarısız olsa bile ana işlemi durdurmamak için
-- bu policy her authenticated user'a izin verir.
CREATE POLICY "Allow authenticated users to insert audit logs"
  ON audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- POLICY 2: SELECT - Sadece admin rolü (Başkalarının loglarını sadece admin görür)
-- Kullanıcı kendi loglarını görebilir, admin herkesin loglarını görebilir
CREATE POLICY "Allow users to view their own logs or admins to view all logs"
  ON audit_logs
  FOR SELECT
  TO authenticated
  USING (
    -- Kullanıcı kendi loglarını görebilir
    user_id = auth.uid()
    OR
    -- Admin herkesin loglarını görebilir
    EXISTS (
      SELECT 1
      FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- UPDATE ve DELETE işlemlerine izin vermiyoruz (Audit logs değiştirilemez/silinemez)
-- Bu, veri bütünlüğü için kritiktir.

-- 3. YARDIMCI FONKSİYONLAR (Opsiyonel)
-- ============================================

-- Audit log oluşturma için helper function (opsiyonel, kullanılmayabilir)
-- Frontend'de auditService.ts kullanılacak, bu sadece referans için
CREATE OR REPLACE FUNCTION create_audit_log(
  p_user_id UUID,
  p_action TEXT,
  p_entity TEXT,
  p_entity_id UUID DEFAULT NULL,
  p_details JSONB DEFAULT NULL,
  p_ip_address TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO audit_logs (
    user_id,
    action,
    entity,
    entity_id,
    details,
    ip_address
  )
  VALUES (
    p_user_id,
    p_action,
    p_entity,
    p_entity_id,
    p_details,
    p_ip_address
  )
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;

-- ============================================
-- KULLANIM ÖRNEKLERİ
-- ============================================
-- 
-- 1. Makine oluşturulduğunda:
-- INSERT INTO audit_logs (user_id, action, entity, entity_id, details)
-- VALUES (auth.uid(), 'CREATE', 'machines', 'machine-uuid', '{"name": "CNC Torna #1"}'::jsonb);
--
-- 2. Makine güncellendiğinde:
-- INSERT INTO audit_logs (user_id, action, entity, entity_id, details)
-- VALUES (
--   auth.uid(),
--   'UPDATE',
--   'machines',
--   'machine-uuid',
--   '{"old_value": {"name": "Eski Ad"}, "new_value": {"name": "Yeni Ad"}}'::jsonb
-- );
--
-- 3. Makine silindiğinde:
-- INSERT INTO audit_logs (user_id, action, entity, entity_id, details)
-- VALUES (
--   auth.uid(),
--   'DELETE',
--   'machines',
--   'machine-uuid',
--   '{"deleted_machine": {"name": "CNC Torna #1", "type": "CNC"}}'::jsonb
-- );
--
-- 4. Arıza çözüldüğünde:
-- INSERT INTO audit_logs (user_id, action, entity, entity_id, details)
-- VALUES (
--   auth.uid(),
--   'UPDATE',
--   'maintenance_logs',
--   'log-uuid',
--   '{"status": "resolved", "resolved_by": "user-uuid"}'::jsonb
-- );
--
-- ============================================
