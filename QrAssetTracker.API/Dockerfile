# 1. Aşama: Build (Derleme)
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Proje dosyasını kopyala ve paketleri yükle (Cache mantığı için önce bu)
COPY ["QrAssetTracker.API.csproj", "./"]
RUN dotnet restore "QrAssetTracker.API.csproj"

# Kalan tüm dosyaları kopyala
COPY . .
# Release modunda derle ve publish klasörüne çıkar
RUN dotnet publish "QrAssetTracker.API.csproj" -c Release -o /app/publish

# 2. Aşama: Runtime (Çalıştırma)
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app
EXPOSE 8080
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "QrAssetTracker.API.dll"]