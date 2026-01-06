# 🏭 Factory Asset Management SaaS (QR-Based)

Modern, Dockerize edilmiş ve ölçeklenebilir bir Fabrika Varlık Yönetim Sistemi.
İşletmelerin makinelerini takip etmesini, QR kod ile durumlarını sorgulamasını ve bakım süreçlerini yönetmesini sağlar.

![Project Status](https://img.shields.io/badge/status-active-success.svg)
![License](https://img.shields.io/badge/license-MIT-blue.svg)

## 🚀 Özellikler

- **Varlık Takibi:** Makinelerin konumu, durumu ve teknik detaylarının takibi.
- **QR Kod Entegrasyonu:** Her makineye özel dinamik QR kod üretimi.
- **Canlı Dashboard:** Anlık durum takibi için modern, temiz arayüz (Clean UI).
- **Multi-Tenant:** Çoklu firma desteği (SaaS altyapısı).
- **Dockerized:** Tek komutla tüm altyapıyı ayağa kaldırma.

## 🛠️ Teknoloji Yığını (Tech Stack)

### Backend
- **.NET 8 Web API** (Onion Architecture)
- **PostgreSQL** (Veritabanı)
- **Entity Framework Core** (ORM)
- **Swagger** (API Dokümantasyonu)

### Frontend
- **React + Vite** (Performanslı Build)
- **TypeScript** (Tip güvenliği)
- **Tailwind CSS** (Modern Styling)
- **Nginx** (Production Sunucu & Reverse Proxy)

### DevOps & Altyapı
- **Docker & Docker Compose**
- **Multi-Stage Builds** (Optimize edilmiş imajlar)

## 📦 Kurulum (Installation)

Projeyi yerel ortamınızda çalıştırmak için:

1. **Repoyu klonlayın:**
   ```bash
   git clone https://github.com/OmerTuregun/factory-saas-qr.git
   
   cd factory-saas-qr