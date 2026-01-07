# 📝 PDF FONT YÜKLEME REHBERİ

## 🎯 AMAÇ
PDF raporlarında Türkçe karakterlerin (ı, ş, ğ, ü, ö, ç) düzgün görünmesi için özel font yükleme.

---

## 📥 ADIM 1: FONT DOSYASINI İNDİRİN

### Seçenek 1: DejaVu Sans (Önerilen)
1. **GitHub'dan İndirin:**
   - https://github.com/dejavu-fonts/dejavu-fonts/releases
   - `dejavu-sans-ttf-2.37.zip` dosyasını indirin
   - Zip'i açın
   - `ttf` klasörüne gidin
   - **`DejaVuSans.ttf`** dosyasını bulun

### Seçenek 2: Google Fonts - Noto Sans (Alternatif)
1. **Google Fonts'tan İndirin:**
   - https://fonts.google.com/noto/specimen/Noto+Sans
   - Sağ üstteki **"Download family"** butonuna tıklayın
   - Zip dosyasını indirin ve açın
   - `NotoSans-Regular.ttf` dosyasını bulun

---

## 🔄 ADIM 2: FONT DOSYASINI BASE64'E ÇEVİRİN

### Yöntem 1: Online Converter (Kolay)
1. **Base64 Converter'a gidin:**
   - https://base64.guru/converter/encode/file
   
2. **Font dosyasını yükleyin:**
   - "Choose File" butonuna tıklayın
   - İndirdiğiniz `.ttf` dosyasını seçin (örn: `DejaVuSans.ttf`)
   
3. **Base64'e çevirin:**
   - "Encode" butonuna tıklayın
   - **ÇOK UZUN** bir string oluşacak (100.000+ karakter)
   - Bu string'i **tamamen** kopyalayın

### Yöntem 2: Terminal/Command Line (Gelişmiş)
```bash
# Windows PowerShell:
[Convert]::ToBase64String([IO.File]::ReadAllBytes("C:\path\to\DejaVuSans.ttf")) | Out-File -Encoding utf8 font.txt

# Mac/Linux:
base64 -i DejaVuSans.ttf -o font.txt
```

---

## 📝 ADIM 3: BASE64 STRING'İ KODA EKLEYİN

1. **Dosyayı açın:**
   - `client/src/utils/pdfFontLoader.ts`

2. **Base64 string'i yapıştırın:**
   ```typescript
   const DEJAVU_SANS_BASE64 = 'BURAYA_BASE64_STRING_YAPIŞTIRIN'; 
   // ⬆️ Yukarıdaki satırdaki boş string yerine, kopyaladığınız base64 string'i yapıştırın
   ```

3. **Örnek:**
   ```typescript
   const DEJAVU_SANS_BASE64 = 'AAEAAAAOAIAAAwBgT1MvMj3hSQEAAADsAAAATmNtYXDQEhm3AAABPAAAAUpjdnQgBk...'; 
   // (Çok uzun olacak, sorun değil!)
   ```

---

## ✅ ADIM 4: TEST EDİN

1. **Sayfayı yenileyin** (`F5`)
2. **Raporlar sayfasına gidin** (`/reports`)
3. **"PDF Raporu" butonuna tıklayın**
4. **PDF'i açın ve kontrol edin:**
   - Türkçe karakterler düzgün görünüyor mu?
   - ı, ş, ğ, ü, ö, ç karakterleri doğru mu?

---

## 🚨 SORUN GİDERME

### Sorun: Base64 string çok uzun, kopyalayamıyorum
**Çözüm:** 
- Base64 string'i bir `.txt` dosyasına kaydedin
- Dosyayı okuyup koda yapıştırın
- Veya terminal komutunu kullanın (yukarıda)

### Sorun: Font yüklenmiyor
**Çözüm:**
- Base64 string'in başında/sonunda boşluk olmamalı
- String'in tamamını kopyaladığınızdan emin olun
- Console'da hata var mı kontrol edin

### Sorun: Hala Türkçe karakterler yanlış
**Çözüm:**
- Font dosyasının Türkçe karakterleri desteklediğinden emin olun
- DejaVu Sans veya Noto Sans kullanın (her ikisi de Türkçe'yi destekler)
- `times` font'u da Türkçe karakterleri destekler (fallback olarak kullanılıyor)

---

## 💡 İPUCU

**Şu anda `times` font'u kullanılıyor** ve bu font Türkçe karakterleri destekliyor. Eğer `times` font'u yeterliyse, özel font yüklemenize gerek yok!

Özel font yüklemek istiyorsanız, yukarıdaki adımları takip edin.

---

## 📚 FAYDALI LİNKLER

- **DejaVu Fonts:** https://dejavu-fonts.github.io/
- **Google Fonts - Noto Sans:** https://fonts.google.com/noto/specimen/Noto+Sans
- **Base64 Converter:** https://base64.guru/converter/encode/file
- **jsPDF Font Documentation:** https://github.com/parallax/jsPDF#use-of-utf-8--ttf

