# ============================================
# STAGE 1: Build Stage (Node.js ile build)
# ============================================
FROM node:20-alpine AS build

WORKDIR /app

# Package dosyalarını kopyala ve bağımlılıkları yükle
# (Bu sayede kaynak kod değişse bile cache kullanılabilir)
COPY package*.json ./
RUN npm ci --silent

# Kaynak kodları kopyala
COPY . .

# Production build (Vite çıktısı: dist klasörü)
RUN npm run build

# ============================================
# STAGE 2: Production Stage (Nginx ile serve)
# ============================================
FROM nginx:alpine

# Build edilen statik dosyaları Nginx'e kopyala
COPY --from=build /app/dist /usr/share/nginx/html

# SPA routing için özel nginx konfigürasyonunu kopyala
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Nginx varsayılan 80 portunu aç
EXPOSE 80

# Nginx'i başlat
CMD ["nginx", "-g", "daemon off;"]

