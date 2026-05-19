-- 1. VERİTABANI OLUŞTURMA
CREATE DATABASE LumoraAcademyDB;
GO

USE LumoraAcademyDB;
GO

-- 2. BÖLÜM TANIMLARI TABLOSU
CREATE TABLE Departments (
    DepartmentID INT IDENTITY(1,1) PRIMARY KEY,
    DepartmentName NVARCHAR(100) NOT NULL UNIQUE
);

-- 3. DERSLER TABLOSU
CREATE TABLE Courses (
    CourseID INT IDENTITY(1,1) PRIMARY KEY,
    CourseCode NVARCHAR(20) NOT NULL UNIQUE,
    CourseName NVARCHAR(150) NOT NULL,
    DepartmentID INT NOT NULL,
    StudentCount INT NOT NULL CHECK (StudentCount > 0),
    Semester INT NOT NULL CHECK (Semester BETWEEN 1 AND 8),
    CourseType NVARCHAR(10) CHECK (CourseType IN ('Zorunlu', 'Seçmeli')),
    FOREIGN KEY (DepartmentID) REFERENCES Departments(DepartmentID)
);

-- 4. OTURUMLAR (SLOTLAR) TABLOSU
CREATE TABLE TimeSlots (
    SlotID INT IDENTITY(1,1) PRIMARY KEY,
    SlotName NVARCHAR(50) NOT NULL, -- Örn: 'Sabah-1', 'Öğle-2'
    StartTime TIME NOT NULL,
    EndTime TIME NOT NULL,
    CONSTRAINT CHK_TimeCheck CHECK (StartTime < EndTime)
);

-- 5. DERSLİKLER (SALONLAR) TABLOSU
CREATE TABLE Classrooms (
    ClassroomID INT IDENTITY(1,1) PRIMARY KEY,
    RoomName NVARCHAR(50) NOT NULL UNIQUE,
    Capacity INT NOT NULL CHECK (Capacity > 0),
    RoomType NVARCHAR(20) CHECK (RoomType IN ('Büyük Amfi', 'Sınıf', 'Lab')),
    Floor INT NOT NULL, -- Kat bilgisi (Aynı katta salon önerisi için)
    IsActive BIT DEFAULT 1
);

-- 6. PERSONEL (ÖĞRETİM ÜYELERİ) TABLOSU
CREATE TABLE Personnel (
    PersonnelID INT IDENTITY(1,1) PRIMARY KEY,
    Title NVARCHAR(30) NOT NULL, -- Prof. Dr., Doç. Dr., Arş. Gör.
    FirstName NVARCHAR(50) NOT NULL,
    LastName NVARCHAR(50) NOT NULL,
    DepartmentID INT NOT NULL,
    FOREIGN KEY (DepartmentID) REFERENCES Departments(DepartmentID)
);

-- 7. PERSONEL MAZERET / İZİN TABLOSU
CREATE TABLE PersonnelExcuses (
    ExcuseID INT IDENTITY(1,1) PRIMARY KEY,
    PersonnelID INT NOT NULL,
    ExcuseDate DATE NOT NULL,
    SlotID INT NOT NULL, -- Belirli bir oturumda da izinli olabilir
    ExcuseType NVARCHAR(50) NOT NULL, -- 'İzinli', 'Mazeret', 'Danışmanlık Saati'
    FOREIGN KEY (PersonnelID) REFERENCES Personnel(PersonnelID),
    FOREIGN KEY (SlotID) REFERENCES TimeSlots(SlotID),
    CONSTRAINT UQ_Personnel_Date_Slot UNIQUE (PersonnelID, ExcuseDate, SlotID) -- Aynı ana iki mazeret girilemez
);

-- 8. SINAVLAR ANA TABLOSU
CREATE TABLE Exams (
    ExamID INT IDENTITY(1,1) PRIMARY KEY,
    CourseID INT NOT NULL,
    ExamDate DATE NOT NULL,
    SlotID INT NOT NULL,
    FOREIGN KEY (CourseID) REFERENCES Courses(CourseID),
    FOREIGN KEY (SlotID) REFERENCES TimeSlots(SlotID),
    CONSTRAINT UQ_Course_Exam UNIQUE (CourseID) -- Bir dersin sadece bir sınavı olur planlamada
);

-- 9. SINAV SALONLARI (ARA TABLO - 3NF)
CREATE TABLE ExamClassrooms (
    ExamClassroomId INT IDENTITY(1,1) PRIMARY KEY,
    ExamID INT NOT NULL,
    ClassroomID INT NOT NULL,
    FOREIGN KEY (ExamID) REFERENCES Exams(ExamID) ON DELETE CASCADE,
    FOREIGN KEY (ClassroomID) REFERENCES Classrooms(ClassroomID),
    CONSTRAINT UQ_Room_Date_Slot UNIQUE (ClassroomID, ExamID) -- Bir salon bir sınavda bir kez eşleşir (Daha ötesi trigger ile korunacak)
);

-- 10. GÖZETMEN ATAMALARI TABLOSU (3NF)
CREATE TABLE InvigilatorAssignments (
    AssignmentID INT IDENTITY(1,1) PRIMARY KEY,
    ExamClassroomId INT NOT NULL, -- Hangi sınavın hangi salonu olduğu bilgisi
    PersonnelID INT NOT NULL,
    FOREIGN KEY (ExamClassroomId) REFERENCES ExamClassrooms(ExamClassroomId) ON DELETE CASCADE,
    FOREIGN KEY (PersonnelID) REFERENCES Personnel(PersonnelID),
    CONSTRAINT UQ_Personnel_Assignment UNIQUE (ExamClassroomId, PersonnelID)
);
GO



CREATE INDEX IX_Exams_Date_Slot ON Exams(ExamDate, SlotID);
CREATE INDEX IX_Courses_Department_Semester ON Courses(DepartmentID, Semester);
CREATE INDEX IX_Classrooms_Active ON Classrooms(IsActive) INCLUDE (Capacity, Floor);
GO








-- UDF 1: Bir sınav için atanan salonların toplam kapasitesini döner.
CREATE FUNCTION fn_GetTotalExamCapacity (@ExamID INT)
RETURNS INT
AS
BEGIN
    DECLARE @TotalCapacity INT;
    SELECT @TotalCapacity = ISNULL(SUM(c.Capacity), 0)
    FROM ExamClassrooms ec
    JOIN Classrooms c ON ec.ClassroomID = c.ClassroomID
    WHERE ec.ExamID = @ExamID;
    
    RETURN @TotalCapacity;
END;
GO





-- UDF 2: Bir gözetmenin sistemdeki toplam görev sayısını getirir (Adil Dağıtım kontrolü için).
CREATE FUNCTION fn_GetPersonnelTaskCount (@PersonnelID INT)
RETURNS INT
AS
BEGIN
    DECLARE @TaskCount INT;
    SELECT @TaskCount = COUNT(*)
    FROM InvigilatorAssignments
    WHERE PersonnelID = @PersonnelID;
    
    RETURN @TaskCount;
END;
GO





-- UDF 3: Belirli bir tarih ve slotta BOŞ olan salonları tablo olarak döner (Modül 2 için akıllı seçim altyapısı).
CREATE FUNCTION fn_GetAvailableClassrooms (@ExamDate DATE, @SlotID INT)
RETURNS TABLE
AS
RETURN (
    SELECT ClassroomID, RoomName, Capacity, RoomType, Floor 
    FROM Classrooms
    WHERE IsActive = 1 AND ClassroomID NOT IN (
        SELECT ec.ClassroomID 
        FROM ExamClassrooms ec
        JOIN Exams e ON ec.ExamID = e.ExamID
        WHERE e.ExamDate = @ExamDate AND e.SlotID = @SlotID
    )
);
GO









-- SP 1: Sınav Oluşturma Prosedürü (Dönem Çakışma Kontrolü İçerir)
CREATE PROCEDURE sp_CreateExam
    @CourseID INT,
    @ExamDate DATE,
    @SlotID INT
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @DeptID INT, @Sem INT;
    SELECT @DeptID = DepartmentID, @Sem = Semester FROM Courses WHERE CourseID = @CourseID;

    -- İş Kuralı A.1: Aynı bölüm ve aynı yarıyıldaki zorunlu dersler aynı slotta çakışamaz!
    IF EXISTS (
        SELECT 1 FROM Exams e 
        JOIN Courses c ON e.CourseID = c.CourseID
        WHERE c.DepartmentID = @DeptID 
          AND c.Semester = @Sem 
          AND c.CourseType = 'Zorunlu'
          AND e.ExamDate = @ExamDate 
          AND e.SlotID = @SlotID
    )
    BEGIN
        RAISERROR('Hata: Aynı bölüme ve aynı yarıyıla ait başka bir zorunlu ders bu slotta zaten var!', 16, 1);
        RETURN;
    END

    -- İş Kuralı A.2: Bir dönem/sınıf için aynı güne 2'den fazla sınav konulursa UYARI verilmeli (Kayıt yapılır ama bilgi dönülür)
    DECLARE @DailyExamCount INT;
    SELECT @DailyExamCount = COUNT(*) FROM Exams e
    JOIN Courses c ON e.CourseID = c.CourseID
    WHERE c.DepartmentID = @DeptID AND c.Semester = @Sem AND e.ExamDate = @ExamDate;

    INSERT INTO Exams (CourseID, ExamDate, SlotID) VALUES (@CourseID, @ExamDate, @SlotID);
    
    IF (@DailyExamCount >= 2)
    BEGIN
        SELECT 'Sınav başarıyla eklendi fakat DİKKAT: Bu dönem öğrencileri için günlük sınav limiti (2) aşıldı!' AS WarningMessage;
    END
    ELSE
    BEGIN
        SELECT 'Sınav başarıyla oluşturuldu.' AS SuccessMessage;
    END
END;
GO

-- SP 2: Havuz Destekli Gözetmen Listeleme (Modül 3 - Müsait Hocaları Getirir)
CREATE PROCEDURE sp_GetAvailableInvigilators
    @ExamID INT
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @ExamDate DATE, @SlotID INT, @CourseDeptID INT;
    SELECT @ExamDate = ExamDate, @SlotID = SlotID, @CourseDeptID = c.DepartmentID 
    FROM Exams e JOIN Courses c ON e.CourseID = c.CourseID WHERE e.ExamID = @ExamID;

    -- Müsait olan hocaları getir (Mazereti olmayan ve o saatte başka sınavı olmayanlar)
    SELECT 
        p.PersonnelID, p.Title, p.FirstName, p.LastName, d.DepartmentName,
        CASE WHEN p.DepartmentID = @CourseDeptID THEN 1 ELSE 0 END AS IsOwnDepartment,
        dbo.fn_GetPersonnelTaskCount(p.PersonnelID) AS CurrentTaskCount
    FROM Personnel p
    JOIN Departments d ON p.DepartmentID = d.DepartmentID
    WHERE p.PersonnelID NOT IN (
        -- Mazeretliler
        SELECT PersonnelID FROM PersonnelExcuses WHERE ExcuseDate = @ExamDate AND SlotID = @SlotID
    )
    AND p.PersonnelID NOT IN (
        -- O saatte zaten görevli olanlar
        SELECT ia.PersonnelID 
        FROM InvigilatorAssignments ia
        JOIN ExamClassrooms ec ON ia.ExamClassroomId = ec.ExamClassroomId
        JOIN Exams e ON ec.ExamID = e.ExamID
        WHERE e.ExamDate = @ExamDate AND e.SlotID = @SlotID
    )
    -- Öncelik kendi bölümünün hocalarında, sonra adil dağıtım için az görevi olanlarda
    ORDER BY IsOwnDepartment DESC, CurrentTaskCount ASC;
END;
GO

-- SP 3: Akıllı Salon Planlama ve Atama (Modül 2 Mantığı)
CREATE PROCEDURE sp_AutoAssignClassrooms
    @ExamID INT
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @StudentCount INT, @ExamDate DATE, @SlotID INT;
    SELECT @StudentCount = c.StudentCount, @ExamDate = e.ExamDate, @SlotID = e.SlotID 
    FROM Exams e JOIN Courses c ON e.CourseID = c.CourseID WHERE e.ExamID = @ExamID;

    DECLARE @RemainingCapacity INT = @StudentCount;
    
    -- Geçici tablo ile o tarihteki boş salonları alıyoruz
    SELECT * INTO #AvailableRooms FROM dbo.fn_GetAvailableClassrooms(@ExamDate, @SlotID) ORDER BY Capacity DESC;

    DECLARE @RoomID INT, @RoomCapacity INT;

    -- En büyük salonlardan başlayarak kapasiteyi eritiyoruz
    DECLARE room_cursor CURSOR FOR SELECT ClassroomID, Capacity FROM #AvailableRooms;
    OPEN room_cursor;
    FETCH NEXT FROM room_cursor INTO @RoomID, @RoomCapacity;

    WHILE @@FETCH_STATUS = 0 AND @RemainingCapacity > 0
    BEGIN
        INSERT INTO ExamClassrooms (ExamID, ClassroomID) VALUES (@ExamID, @RoomID);
        SET @RemainingCapacity = @RemainingCapacity - @RoomCapacity;
        
        FETCH NEXT FROM room_cursor INTO @RoomID, @RoomCapacity;
    END

    CLOSE room_cursor;
    DEALLOCATE room_cursor;
    DROP TABLE #AvailableRooms;

    -- Durum Kontrolü
    IF (@RemainingCapacity <= 0)
        SELECT 'Salonlar başarıyla optimize edilerek atandı.' AS StatusMessage;
    ELSE
        SELECT 'UYARI: Boş salonların kapasitesi tüm öğrencileri yerleştirmeye yetmedi! Ek salon açılmalı.' AS StatusMessage;
END;
GO















-- TRIGGER 1: Bir Görevlinin Arka Arkaya 3 Oturum Sınırını Koruma Kontrolü
CREATE TRIGGER trg_CheckConsecutiveSlots
ON InvigilatorAssignments
AFTER INSERT, UPDATE
AS
BEGIN
    DECLARE @PersonnelID INT, @ExamClassroomId INT, @ExamDate DATE, @CurrentSlotID INT;
    
    SELECT @PersonnelID = PersonnelID, @ExamClassroomId = ExamClassroomId FROM inserted;
    SELECT @ExamDate = e.ExamDate, @CurrentSlotID = e.SlotID 
    FROM ExamClassrooms ec JOIN Exams e ON ec.ExamID = e.ExamID WHERE ec.ExamClassroomId = @ExamClassroomId;

    -- Gözetmenin o günkü ardışık atama sayısını bulma (Basit kontrol mantığı)
    -- Eğer gözetmen o gün 3 oturum üst üste atandıysa ve şimdi 4. ardışık oturum ekleniyorsa engelle
    DECLARE @ConsecutiveCount INT;
    
    SELECT @ConsecutiveCount = COUNT(*)
    FROM InvigilatorAssignments ia
    JOIN ExamClassrooms ec ON ia.ExamClassroomId = ec.ExamClassroomId
    JOIN Exams e ON ec.ExamID = e.ExamID
    WHERE ia.PersonnelID = @PersonnelID 
      AND e.ExamDate = @ExamDate
      AND e.SlotID BETWEEN (@CurrentSlotID - 3) AND @CurrentSlotID; -- Son 3 slot kontrolü

    IF (@ConsecutiveCount > 3)
    BEGIN
        RAISERROR('İş Kuralı İhlali: Bir gözetmen arka arkaya en fazla 3 oturumda görev alabilir!', 16, 1);
        ROLLBACK TRANSACTION;
    END
END;
GO

-- TRIGGER 2: Çift Salon Atamasını Engelleme (Bir Salon Aynı Anda İki Sınava Verilemez)
CREATE TRIGGER trg_PreventRoomDoubleBooking
ON ExamClassrooms
INSTEAD OF INSERT
AS
BEGIN
    IF EXISTS (
        SELECT 1 FROM ExamClassrooms ec
        JOIN Exams e_existing ON ec.ExamID = e_existing.ExamID
        JOIN inserted ins ON ec.ClassroomID = ins.ClassroomID
        JOIN Exams e_new ON ins.ExamID = e_new.ExamID
        WHERE e_existing.ExamDate = e_new.ExamDate 
          AND e_existing.SlotID = e_new.SlotID
    )
    BEGIN
        RAISERROR('Hata: Seçilen salon bu tarih ve oturumda zaten başka bir sınava tahsis edilmiş!', 16, 1);
    END
    ELSE
    BEGIN
        INSERT INTO ExamClassrooms (ExamID, ClassroomID)
        SELECT ExamID, ClassroomID FROM inserted;
    END
END;
GO








CREATE PROCEDURE sp_BackupLumoraDatabase
    @BackupFolder NVARCHAR(255) = 'C:\Yedekler\' -- Varsayılan klasör yolu
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @FileName NVARCHAR(500);
    DECLARE @DateString NVARCHAR(50);
    
    -- Dosya ismine tarih ekleyerek çakışmayı önlüyoruz (Örn: LumoraAcademyDB_20260517.bak)
    SET @DateString = CONVERT(NVARCHAR(50), GETDATE(), 112); 
    SET @FileName = @BackupFolder + 'LumoraAcademyDB_' + @DateString + '.bak';
    
    BEGIN TRY
        BACKUP DATABASE LumoraAcademyDB
        TO DISK = @FileName
        WITH FORMAT,
             MEDIANAME = 'LumoraSQLBackup',
             NAME = 'Full Backup of LumoraAcademyDB';
             
        SELECT 'Yedekleme İşlemi Başarılı. Dosya Konumu: ' + @FileName AS ResultMessage;
    END TRY
    BEGIN CATCH
        SELECT 'Yedekleme Hatası: Klasör iznini veya yolunu kontrol edin! Hata: ' + ERROR_MESSAGE() AS ResultMessage;
    END CATCH
END;
GO




USE LumoraAcademyDB;
GO

-- EKSİK OLAN SYSTEMLOGS (BACKLOG) TABLOSUNU OLUŞTURMA
CREATE TABLE SystemLogs (
    LogID INT IDENTITY(1,1) PRIMARY KEY,
    LogType VARCHAR(50) NOT NULL,
    LogDetails NVARCHAR(500) NOT NULL,
    FormattedDate VARCHAR(50) NOT NULL,
    SystemTimestamp VARCHAR(50) NOT NULL,
    CreatedAt DATETIME DEFAULT GETDATE()
);
GO



-- =========================================================================
-- 1. FONKSİYON: Kapasite Kontrolü Güncellemesi
-- =========================================================================
DROP FUNCTION IF EXISTS dbo.fn_SalonKapasiteKontrol;
GO

CREATE FUNCTION dbo.fn_SalonKapasiteKontrol (@CourseID INT, @ToplamKapasite INT)
RETURNS BIT
AS
BEGIN
    DECLARE @YeterliMi BIT = 0;
    DECLARE @Kontenjan INT;
    
    -- Kolon adları tablonuza uygun olarak CourseID ve StudentCount yapıldı
    SELECT @Kontenjan = StudentCount FROM Courses WHERE CourseID = @CourseID;
    
    IF (@ToplamKapasite >= @Kontenjan)
    BEGIN
        SET @YeterliMi = 1;
    END;
    RETURN @YeterliMi;
END;
GO












-- =========================================================================
-- 2. FONKSİYON: Dönem/Yarıyıl Çakışma Kontrolü Güncellemesi
-- =========================================================================
DROP FUNCTION IF EXISTS dbo.fn_DonemCakismaVarMi;
GO

CREATE FUNCTION dbo.fn_DonemCakismaVarMi (@Semester INT, @Tarih DATE, @SlotID INT)
RETURNS BIT
AS
BEGIN
    DECLARE @CakismaVar BIT = 0;
    
    -- Kolon adları ve ilişkiler tablonuza göre CourseID ve Semester olarak güncellendi
    IF EXISTS (
        SELECT 1 FROM Sinavlar s
        JOIN Courses c ON s.CourseID = c.CourseID 
        WHERE c.Semester = @Semester AND s.Tarih = @Tarih AND s.OturumID = @SlotID
    )
    BEGIN
        SET @CakismaVar = 1;
    END;
    RETURN @CakismaVar;
END;
GO




-- =========================================================================
-- 1. TETİKLEYİCİ: Salon Çakışmasını Veritabanı Seviyesinde Bloklama
-- Aynı Tarih ve Oturumda (SlotID), bir derslik ikinci kez başka sınava atanamaz.
-- =========================================================================
CREATE TRIGGER trg_SalonCakismaEngelle
ON Sinav_Salonlari
AFTER INSERT, UPDATE
AS
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM inserted i
        JOIN Sinavlar s1 ON i.SinavID = s1.SinavID
        JOIN Sinav_Salonlari ss ON i.DerslikID = ss.DerslikID AND i.SinavID <> ss.SinavID
        JOIN Sinavlar s2 ON ss.SinavID = s2.SinavID
        WHERE s1.Tarih = s2.Tarih AND s1.OturumID = s2.OturumID
    )
    BEGIN
        RAISERROR ('❌ KRİTİK VERİTABANI HATASI: Bu salon aynı saat diliminde başka bir sınava zaten tahsis edilmiş!', 16, 1);
        ROLLBACK TRANSACTION;
    END
END;
GO




-- =========================================================================
-- 2. TETİKLEYİCİ: Ders Silindiğinde Geçmiş/Aktif Sınav Kontrolü
-- Eğer silinmeye çalışılan dersin bir sınav kaydı varsa silme işlemini engeller.
-- =========================================================================
CREATE TRIGGER trg_DersSilmeKontrolu
ON Courses
INSTEAD OF DELETE
AS
BEGIN
    -- Eğer silinmek istenen dersin Sınavlar tablosunda kaydı varsa işlemi iptal et
    IF EXISTS (
        SELECT 1 
        FROM Sinavlar 
        WHERE CourseID IN (SELECT CourseID FROM deleted)
    )
    BEGIN
        RAISERROR ('❌ İŞLEM ENGELLENDİ: Bu derse ait planlanmış sınav kayıtları bulunmaktadır. Önce sınavları silmelisiniz!', 16, 1);
    END
    ELSE
    BEGIN
        -- Sınavı yoksa güvenle sil
        DELETE FROM Courses WHERE CourseID IN (SELECT CourseID FROM deleted);
    END
END;
GO



ALTER TRIGGER trg_DersSilmeKontrolu
ON Courses
AFTER DELETE
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Eğer silinen derslere ait aktif bir sınav kaydı varsa silmeyi engellemek için yazılmış olabilir.
    -- İçerideki 'Sinavlar' tablosunu şemana uygun olarak 'Exams' ile değiştiriyoruz:
    IF EXISTS (
        SELECT 1 
        FROM Exams e
        INNER JOIN deleted d ON e.CourseID = d.CourseID
    )
    BEGIN
        RAISERROR ('Bu derse ait planlanmış sınavlar bulunduğundan ders silinemez!', 16, 1);
        ROLLBACK TRANSACTION;
        RETURN;
    END
END;





USE LumoraAcademyDB;
GO

ALTER PROCEDURE sp_AutoAssignClassrooms
    @ExamID INT
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @StudentCount INT, @ExamDate DATE, @SlotID INT;
    SELECT @StudentCount = c.StudentCount, @ExamDate = e.ExamDate, @SlotID = e.SlotID 
    FROM Exams e JOIN Courses c ON e.CourseID = c.CourseID WHERE e.ExamID = @ExamID;

    DECLARE @RemainingCapacity INT = @StudentCount;
    
    -- O tarihteki tüm boş salonları geçici tabloya al
    SELECT * INTO #TempAvailableRooms FROM dbo.fn_GetAvailableClassrooms(@ExamDate, @SlotID);

    -- İlk salonu seç (Öğrenciyi sığdırabilecek en büyük veya ideal salon)
    DECLARE @FirstRoomID INT, @FirstRoomFloor INT, @FirstRoomCapacity INT;
    
    SELECT TOP 1 @FirstRoomID = ClassroomID, @FirstRoomFloor = Floor, @FirstRoomCapacity = Capacity
    FROM #TempAvailableRooms
    ORDER BY Capacity DESC, RoomName ASC;

    IF @FirstRoomID IS NOT NULL
    BEGIN
        INSERT INTO ExamClassrooms (ExamID, ClassroomID) VALUES (@ExamID, @FirstRoomID);
        SET @RemainingCapacity = @RemainingCapacity - @FirstRoomCapacity;
        
        -- Atanan salonu havuzdan sil
        DELETE FROM #TempAvailableRooms WHERE ClassroomID = @FirstRoomID;
    END

    -- Kalan öğrenciler varsa, ÖNCELİKLE AYNI KATTAKİ salonları doldur
    IF @RemainingCapacity > 0
    BEGIN
        DECLARE @RoomID INT, @RoomCapacity INT;
        
        DECLARE floor_cursor CURSOR FOR 
        SELECT ClassroomID, Capacity 
        FROM #TempAvailableRooms 
        ORDER BY CASE WHEN Floor = @FirstRoomFloor THEN 0 ELSE 1 END ASC, Capacity DESC, RoomName ASC;
        
        OPEN floor_cursor;
        FETCH NEXT FROM floor_cursor INTO @RoomID, @RoomCapacity;

        WHILE @@FETCH_STATUS = 0 AND @RemainingCapacity > 0
        BEGIN
            INSERT INTO ExamClassrooms (ExamID, ClassroomID) VALUES (@ExamID, @RoomID);
            SET @RemainingCapacity = @RemainingCapacity - @RoomCapacity;
            
            FETCH NEXT FROM floor_cursor INTO @RoomID, @RoomCapacity;
        END

        CLOSE floor_cursor;
        DEALLOCATE floor_cursor;
    END

    DROP TABLE #TempAvailableRooms;

    IF (@RemainingCapacity <= 0)
        SELECT 'Salonlar aynı kat önceliği ve akıllı kapasite hesabı gözetilerek başarıyla atandı.' AS StatusMessage;
    ELSE
        SELECT 'UYARI: Boş salonların kapasitesi yetmedi! Ek salon açılmalı.' AS StatusMessage;
END;
GO




USE LumoraAcademyDB;
GO

-- 1. Çakışma Fonksiyonunu Gerçek Tablo Adına Göre Güncelleme
ALTER FUNCTION dbo.fn_DonemCakismaVarMi (@Semester INT, @Tarih DATE, @SlotID INT)
RETURNS BIT
AS
BEGIN
    DECLARE @CakismaVar BIT = 0;
    
    IF EXISTS (
        SELECT 1 FROM Exams s
        JOIN Courses c ON s.CourseID = c.CourseID 
        WHERE c.Semester = @Semester AND s.ExamDate = @Tarih AND s.SlotID = @SlotID
    )
    BEGIN
        SET @CakismaVar = 1;
    END;
    RETURN @CakismaVar;
END;
GO

-- 2. Salon Çakışma Tetikleyicisini Gerçek Tablo Adına Göre Güncelleme
DROP TRIGGER IF EXISTS trg_SalonCakismaEngelle;
GO

CREATE TRIGGER trg_SalonCakismaEngelle
ON ExamClassrooms
AFTER INSERT, UPDATE
AS
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM inserted i
        JOIN Exams s1 ON i.ExamID = s1.ExamID
        JOIN ExamClassrooms ss ON i.ClassroomID = ss.ClassroomID AND i.ExamID <> ss.ExamID
        JOIN Exams s2 ON ss.ExamID = s2.ExamID
        WHERE s1.ExamDate = s2.ExamDate AND s1.SlotID = s2.SlotID
    )
    BEGIN
        RAISERROR ('❌ KRİTİK VERİTABANI HATASI: Bu salon aynı saat diliminde başka bir sınava zaten tahsis edilmiş!', 16, 1);
        ROLLBACK TRANSACTION;
    END
END;
GO


-- 1. ADIM: İlişkili tablolardaki eski/hatalı deneme verilerini temizliyoruz
DELETE FROM InvigilatorAssignments;
DELETE FROM ExamClassrooms;
DELETE FROM Exams;
DELETE FROM PersonnelExcuses;

-- 2. ADIM: Çift kayıtların bulunduğu ana TimeSlots tablosunu tamamen boşaltıyoruz
DELETE FROM TimeSlots;

-- 3. ADIM: Otomatik artan SlotID sayacını sıfırlıyoruz (1'den başlasın diye)
DBCC CHECKIDENT ('TimeSlots', RESEED, 0);

-- 4. ADIM: Sadece benzersiz ve jilet gibi temiz 5 ana oturumu ekliyoruz
INSERT INTO TimeSlots (SlotName, StartTime, EndTime) VALUES
('Sabah-1 (1. Oturum)', '08:30:00', '10:15:00'),
('Sabah-2 (2. Oturum)', '10:45:00', '12:30:00'),
('Öğle-1 (3. Oturum)', '13:30:00', '15:15:00'),
('Öğle-2 (4. Oturum)', '15:45:00', '17:30:00'),
('Akşam-1 (5. Oturum)', '18:00:00', '19:45:00');


-- ExamClassrooms üzerindeki tüm tetikleyicileri devre dışı bırakır
ALTER TABLE ExamClassrooms DISABLE TRIGGER ALL;