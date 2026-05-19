#  Sınav Takvimi Sistemi (Exam Scheduling System)

Bu proje, öğrencilerin ve akademisyenlerin sınav tarihlerini, dersliklerini ve programlarını kolayca takip edebilmeleri için geliştirilmiş web tabanlı bir **Sınav Takvimi Yönetim Sistemi**dir. 

---

##  Proje Özellikleri

*   **Dinamik Takvim Görünümü:** Sınav tarihlerini haftalık veya aylık olarak görebilme.
*   **Rol Tabanlı Yetkilendirme:** 
    *   *Yöneticiler/Akademisyenler:* Sınav ekleyebilir, silebilir veya güncelleyebilir.
    *   *Öğrenciler:* Kendilerine ait sınav takvimini görüntüleyebilir.
*   **Çakışma Kontrolü:** Aynı saatte aynı sınıfa veya öğretmene birden fazla sınav atanmasını önleyen akıllı kontrol sistemi.
*   **Gerçek Zamanlı Güncellemeler:** Sınav programındaki değişikliklerin anında yansıması.

---

##  Kullanılan Teknolojiler

Bu proje modern web teknolojileri ve esnek bir veri tabanı mimarisi kullanılarak geliştirilmiştir:

*   **Frontend:** React / Next.js
*   **Backend & Veri Tabanı:**  Local üzerinden SSMS tabanlı sistem
*   **Tasarım/UI:** Tailwind CSS / Material UI
*   **Versiyon Kontrolü:** Git & GitHub

---

##  Kurulum ve Çalıştırma

Projeyi yerel bilgisayarınızda çalıştırmak için aşağıdaki adımları takip edebilirsiniz:

### 1. Projeyi Klonlayın
```bash
git clone https://github.com/highlvmami/Lumora-Academy
cd Lumora-Academy
```


### 2. Bağımlılıkları Yükleyin
```Bash
npm install
```


### 3. Çevre Değişkenlerini Ayarlayın (.env)
Kök dizinde .env.local dosyası oluşturun ve gerekli API anahtarlarını ekleyin (Örn: Firebase bağlantı bilgileri):

DB_SERVER=127.0.0.1
DB_DATABASE=LumoraAcademyDB
DB_USER=sa
DB_PASSWORD=123456



### 4. Projeyi Lokal ortamda Başlatın
Bash
npm run dev
# veya
yarn dev
Tarayıcınızda http://localhost:3000 adresine giderek projeyi görüntüleyebilirsiniz.


