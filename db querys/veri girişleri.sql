USE LumoraAcademyDB;
GO

-- 1. MÜHENDİSLİK BÖLÜMLERİNİ EKLEME
-- (Tablonuzda IDENTITY_INSERT zaten açık değilse doğrudan ekler)
INSERT INTO Departments (DepartmentName) VALUES 
(N'Bilgisayar Mühendisliği'),
(N'Yazılım Mühendisliği'),
(N'Elektrik-Elektronik Mühendisliği'),
(N'Endüstri Mühendisliği'),
(N'Makine Mühendisliği');
GO

-- 2. GÜNDE 5 ADET ZAMAN DİLİMİ (SLOT) EKLEME
-- Saat formatları TIME veri tipine uygun ve ardışık olarak ayarlanmıştır.
INSERT INTO TimeSlots (SlotName, StartTime, EndTime) VALUES 
(N'Sabah-1 (1. Oturum)', '08:30:00', '10:15:00'),
(N'Sabah-2 (2. Oturum)', '10:45:00', '12:30:00'),
(N'Öğle-1  (3. Oturum)', '13:30:00', '15:15:00'),
(N'Öğle-2  (4. Oturum)', '15:45:00', '17:30:00'),
(N'Akşam-1 (5. Oturum)', '18:00:00', '19:45:00');
GO




USE LumoraAcademyDB;
GO

-- 10 ADET MÜHENDİSLİK DERSİ VERİ GİRİŞİ
-- DepartmentID değerleri: 1: Bilgisayar, 2: Yazılım, 3: Elektrik-Elektronik, 4: Endüstri, 5: Makine Mühendisliği
INSERT INTO Courses (CourseCode, CourseName, DepartmentID, StudentCount, Semester, CourseType) VALUES 
(N'BLM 1001', N'Bilgisayar Mühendisliğine Giriş', 1, 65, 1, N'Zorunlu'),
(N'BLM 2102', N'Veri Yapıları ve Algoritmalar', 1, 55, 3, N'Zorunlu'),
(N'YZM 2042', N'Nesneye Yönelik Programlama', 2, 60, 3, N'Zorunlu'),
(N'YZM 3105', N'Web Tasarımı ve Geliştirme', 2, 45, 5, N'Seçmeli'),
(N'EEM 2011', N'Elektrik Devre Temelleri', 3, 70, 3, N'Zorunlu'),
(N'EEM 4102', N'Sinyaller ve Sistemler', 3, 40, 7, N'Zorunlu'),
(N'END 3001', N'Yöneylem Araştırması I', 4, 50, 5, N'Zorunlu'),
(N'END 3106', N'Tedarik Zinciri Yönetimi', 4, 35, 6, N'Seçmeli'),
(N'MAK 1002', N'Teknik Resim ve Bilgisayar Destekli Çizim', 5, 80, 2, N'Zorunlu'),
(N'MAK 3041', N'Akışkanlar Mekaniği', 5, 75, 5, N'Zorunlu');
GO







USE LumoraAcademyDB;
GO

-- 10 ADET AKADEMİSYEN / GÖZETMEN VERİ GİRİŞİ
-- DepartmentID değerleri: 1: Bilgisayar, 2: Yazılım, 3: Elektrik-Elektronik, 4: Endüstri, 5: Makine Mühendisliği
INSERT INTO Personnel (Title, FirstName, LastName, DepartmentID) VALUES 
(N'Prof. Dr.', N'Ahmet', N'Yılmaz', 1),
(N'Doç. Dr.', N'Elif', N'Kaya', 1),
(N'Arş. Gör.', N'Can', N'Demir', 1),
(N'Doç. Dr.', N'Murat', N'Aydın', 2),
(N'Arş. Gör.', N'Aslı', N'Yıldız', 2),
(N'Prof. Dr.', N'Mehmet', N'Öztürk', 3),
(N'Arş. Gör.', N'Deniz', N'Arslan', 3),
(N'Doç. Dr.', N'Zeynep', N'Şahin', 4),
(N'Arş. Gör.', N'Gökhan', N'Kurt', 4),
(N'Prof. Dr.', N'Mustafa', N'Özkan', 5);
GO

-- TESTLER İÇİN BİRKAÇ ÖRNEK MAZERET GİRİŞİ (Opsiyonel)
-- Eklediğimiz akademisyenlerin sınav döneminde bazı oturumlarda izinli olduğunu simüle eder.
-- SlotID değerleri: 1-5 arası (Yeni eklediğimiz 5 oturuma göre)
INSERT INTO PersonnelExcuses (PersonnelID, ExcuseDate, SlotID, ExcuseType) VALUES 
(3, '2026-06-01', 1, N'Mazeret'),             -- Can Demir, Sınav haftasının ilk günü 1. oturumda mazeretli
(5, '2026-06-01', 3, N'Danışmanlık Saati'),   -- Aslı Yıldız, 3. oturumda danışmanlık saati var
(7, '2026-06-02', 2, N'İzinli');              -- Deniz Arslan, Salı günü 2. oturumda izinli
GO


USE LumoraAcademyDB;
GO

-- 10 ADET FARKLI KAPASİTE VE KATLARDA DERSLİK VERİ GİRİŞİ
INSERT INTO Classrooms (RoomName, Capacity, RoomType, Floor, IsActive) VALUES 
(N'Amfi-1', 90, N'Büyük Amfi', 1, 1),
(N'Amfi-2', 80, N'Büyük Amfi', 1, 1),
(N'D-101', 50, N'Sınıf', 1, 1),
(N'D-102', 45, N'Sınıf', 1, 1),
(N'D-201', 40, N'Sınıf', 2, 1),
(N'D-202', 40, N'Sınıf', 2, 1),
(N'Lab-A', 35, N'Lab', 3, 1),
(N'Lab-B', 30, N'Lab', 3, 1),
(N'D-301', 50, N'Sınıf', 3, 1),
(N'D-302', 45, N'Sınıf', 3, 1);
GO