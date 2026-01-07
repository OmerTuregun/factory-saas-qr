import pg from 'pg';
import dotenv from 'dotenv';

// .env dosyasını oku
dotenv.config();

// Veritabanı bağlantı ayarı (Connection String)
// NOT: Bu adresi Supabase Dashboard -> Settings -> Database -> Connection String (Nodejs) kısmından almalısın.
// Genelde şöyledir: "postgres://postgres.[project-ref]:[password]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres"
const connectionString = process.env.DATABASE_URL; 

if (!connectionString) {
  console.error("HATA: .env dosyasında DATABASE_URL bulunamadı!");
  console.error("Lütfen .env dosyasına Supabase bağlantı linkini ekle.");
  process.exit(1);
}

const client = new pg.Client({
  connectionString: connectionString,
});

const sqlQueries = `
-- 1. Tabloları temizle (Gerekirse) - DİKKAT: Verileri siler!
-- DROP TABLE IF EXISTS machines;
-- DROP TABLE IF EXISTS profiles;
-- DROP TABLE IF EXISTS factories;

-- 2. Fabrikalar tablosunu oluştur
CREATE TABLE IF NOT EXISTS public.factories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. İlişkileri Ekle (Önce sütun var mı kontrol etmemek için basit alter komutları)
-- Bu kısımlar tablo zaten varsa hata verebilir, o yüzden 'IF NOT EXISTS' mantığıyla yönetmek daha sağlıklı ama
-- ilk kurulum için şu anlık doğrudan çalıştırıyoruz.

DO $$ 
BEGIN 
    -- Profiles tablosuna factory_id ekle
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='factory_id') THEN
        ALTER TABLE public.profiles ADD COLUMN factory_id UUID REFERENCES public.factories(id);
    END IF;

    -- Machines tablosuna factory_id ekle
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='machines' AND column_name='factory_id') THEN
        ALTER TABLE public.machines ADD COLUMN factory_id UUID REFERENCES public.factories(id);
    END IF;
END $$;

-- 4. Örnek Veri Ekle (Varsa ekleme)
INSERT INTO public.factories (name, code)
VALUES 
    ('Tekno Çelik A.Ş.', 'CELIK-2024'),
    ('Mega Plastik Ltd.', 'PLASTIK-99')
ON CONFLICT (code) DO NOTHING;
`;

async function setup() {
  try {
    console.log("🔌 Veritabanına bağlanılıyor...");
    await client.connect();
    
    console.log("🚀 Tablolar oluşturuluyor...");
    await client.query(sqlQueries);
    
    console.log("✅ İŞLEM TAMAM! Fabrika tabloları kuruldu.");
  } catch (err) {
    console.error("❌ Bir hata oluştu:", err);
  } finally {
    await client.end();
  }
}

setup();