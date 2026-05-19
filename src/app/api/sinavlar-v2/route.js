import { NextResponse } from 'next/server';
import { connectDB, sql } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET: Sınavları listeleme görünümü
export async function GET() {
  try {
    const pool = await connectDB();
    const queryText = `
      SELECT 
        e.ExamID, e.ExamDate, e.SlotID,
        c.CourseCode, c.CourseName, c.Semester,
        cr.RoomName, cr.Floor,
        p.PersonnelID, p.Title, p.FirstName, p.LastName
      FROM Exams e
      INNER JOIN Courses c ON e.CourseID = c.CourseID
      LEFT JOIN ExamClassrooms ec ON e.ExamID = ec.ExamID
      LEFT JOIN Classrooms cr ON ec.ClassroomID = cr.ClassroomID
      LEFT JOIN InvigilatorAssignments ia ON ec.ExamClassroomId = ia.ExamClassroomId
      LEFT JOIN Personnel p ON ia.PersonnelID = p.PersonnelID
      ORDER BY e.ExamDate ASC, e.SlotID ASC
    `;
    const result = await pool.request().query(queryText);
    const sinavlarMap = {};
    
    result.recordset.forEach(row => {
      if (!sinavlarMap[row.ExamID]) {
        const fTarih = row.ExamDate ? new Date(row.ExamDate).toISOString().split('T')[0] : '';
        sinavlarMap[row.ExamID] = {
          id: row.ExamID, ExamID: row.ExamID, dersKod: row.CourseCode, dersAdi: row.CourseName,
          yariyil: row.Semester, tarih: fTarih, ExamDate: row.ExamDate, oturum: row.SlotID, SlotID: row.SlotID,
          salonlar: [], gozetmenler: []
        };
      }
      if (row.RoomName && !sinavlarMap[row.ExamID].salonlar.includes(`${row.RoomName} (Kat: ${row.Floor})`)) {
        sinavlarMap[row.ExamID].salonlar.push(`${row.RoomName} (Kat: ${row.Floor})`);
      }
      if (row.PersonnelID) {
        const hAd = `${row.Title || ''} ${row.FirstName} ${row.LastName}`.trim();
        if (!sinavlarMap[row.ExamID].gozetmenler.includes(hAd)) sinavlarMap[row.ExamID].gozetmenler.push(hAd);
      }
    });
    return NextResponse.json(Object.values(sinavlarMap));
  } catch (error) {
    return NextResponse.json({ error: "Sınav programı yüklenemedi." }, { status: 500 });
  }
}

// POST: Kat Öncelikli, Minimum Sınıf ve Bölüm Öncelikli Gözetmen Atamalı Akıllı Planlama Motoru
export async function POST(request) {
  try {
    const body = await request.json();
    
    const courseId = parseInt(body.courseId || body.CourseID, 10);
    const slotId = parseInt(body.slotId || body.SlotID, 10);
    const examDate = body.examDate || body.ExamDate || body.tarih;

    if (isNaN(courseId) || isNaN(slotId) || !examDate) {
      return NextResponse.json({ error: "❌ Eksik veya geçersiz veri girişi algılandı. Lütfen tüm alanları seçin." }, { status: 400 });
    }

    const pool = await connectDB();

    // 1. ADIM: Ders Bilgilerini ve Kontenjanı Çek
    const courseResult = await pool.request()
      .input('courseId', sql.Int, courseId)
      .query('SELECT CourseCode, CourseName, StudentCount, Semester, DepartmentID FROM Courses WHERE CourseID = @courseId');

    if (!courseResult.recordset || courseResult.recordset.length === 0) {
      return NextResponse.json({ error: "❌ Seçilen ders veritabanında kayıtlı değil." }, { status: 404 });
    }

    const ders = courseResult.recordset[0];

  // ... (GET fonksiyonu aynı kalıyor, POST fonksiyonundaki 2. ADIM'ı şu şekilde teyit et veya değiştir:)

// 2. ADIM: Dönem/Yarıyıl Çakışma Kontrolü
const cakismaCheck = await pool.request()
  .input('deptId', sql.Int, ders.DepartmentID)
  .input('semester', sql.Int, ders.Semester)
  .input('tarih', sql.Date, examDate)
  .input('slotId', sql.Int, slotId)
  .query(`
    SELECT TOP 1 c.CourseCode, c.CourseName FROM Exams e 
    JOIN Courses c ON e.CourseID = c.CourseID
    WHERE c.DepartmentID = @deptId AND c.Semester = @semester AND e.ExamDate = @tarih AND e.SlotID = @slotId
  `);

if (cakismaCheck.recordset && cakismaCheck.recordset.length > 0) {
  const mevcutSinav = cakismaCheck.recordset[0];
  return NextResponse.json({ 
    error: `❌ DÖNEM ÇAKIŞMASI ENGELLENDİ: Bu bölümün ${ders.Semester}. yarıyılına ait başka bir sınav (${mevcutSinav.CourseCode} - ${mevcutSinav.CourseName}) aynı gün ve saatte zaten planlanmış!` 
  }, { status: 400 });
}

// ... (Geri kalan kodlar aynı şekilde devam ediyor)

    // 3. ADIM: Boş/Müsait Sınıfları Getir
    const bosSalonlarResult = await pool.request()
      .input('tarih', sql.Date, examDate)
      .input('slotId', sql.Int, slotId)
      .query('SELECT ClassroomID, RoomName, Capacity, Floor, RoomType FROM Classrooms WHERE IsActive = 1 AND ClassroomID NOT IN (SELECT ClassroomID FROM ExamClassrooms ec JOIN Exams e ON ec.ExamID = e.ExamID WHERE e.ExamDate = @tarih AND e.SlotID = @slotId) ORDER BY Capacity DESC');

    const bosSalonlar = bosSalonlarResult.recordset || [];
    if (bosSalonlar.length === 0) {
      return NextResponse.json({ error: "❌ Müsait salon bulunamadı! Tüm derslikler dolu." }, { status: 400 });
    }

    // 4. ADIM: KAT ÖNCELİKLİ VE MİNIMUM SALON OPTİMİZASYONU
    let atanacakSalonlar = [];
    let secilenKapasiteHacmi = 0;

    const tekilSiganSalon = [...bosSalonlar].reverse().find(s => s.Capacity >= ders.StudentCount);
    
    if (tekilSiganSalon) {
      atanacakSalonlar.push(tekilSiganSalon);
      secilenKapasiteHacmi = tekilSiganSalon.Capacity;
    } else {
      const anaSalon = bosSalonlar[0];
      atanacakSalonlar.push(anaSalon);
      secilenKapasiteHacmi += anaSalon.Capacity;

      const ayniKattakiSalonlar = bosSalonlar.filter(s => s.ClassroomID !== anaSalon.ClassroomID && s.Floor === anaSalon.Floor);
      const farkliKattakiSalonlar = bosSalonlar.filter(s => s.ClassroomID !== anaSalon.ClassroomID && s.Floor !== anaSalon.Floor);
      
      const siraliAramaHavuzu = [...ayniKattakiSalonlar, ...farkliKattakiSalonlar];

      for (let salon of siraliAramaHavuzu) {
        if (secilenKapasiteHacmi >= ders.StudentCount) break;
        atanacakSalonlar.push(salon);
        secilenKapasiteHacmi += salon.Capacity;
      }
    }

    if (secilenKapasiteHacmi < ders.StudentCount) {
      return NextResponse.json({ 
        error: `❌ KAPASİTE YETERSİZ: Mevcut boş salonların toplam kapasitesi (${secilenKapasiteHacmi} kişi), ders mevcuduna (${ders.StudentCount} kişi) yetmiyor.` 
      }, { status: 400 });
    }

    // 5. ADIM: SQL TRANSACTION İLE GÜVENLİ YAZMA VE GÖZETMEN ATAMA
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      const examInsert = await transaction.request()
        .input('courseId', sql.Int, courseId)
        .input('tarih', sql.Date, examDate)
        .input('slotId', sql.Int, slotId)
        .query(`
          INSERT INTO Exams (CourseID, ExamDate, SlotID) 
          OUTPUT INSERTED.ExamID
          VALUES (@courseId, @tarih, @slotId);
        `);

      const yeniExamId = examInsert.recordset[0].ExamID;
      const atananGozetmenIDleri = [];

      for (let salon of atanacakSalonlar) {
        const ecInsert = await transaction.request()
          .input('examId', sql.Int, yeniExamId)
          .input('classroomId', sql.Int, salon.ClassroomID)
          .query(`
            INSERT INTO ExamClassrooms (ExamID, ClassroomID) 
            OUTPUT INSERTED.ExamClassroomId
            VALUES (@examId, @classroomId);
          `);
        
        const yeniEcId = ecInsert.recordset[0].ExamClassroomId;

        // Gözetmen Havuzu Sorgusu - Hem Bölüm Öncelikli Hem Adil Yük Dağıtımlı
        const gozetmenQuery = transaction.request()
          .input('tarih', sql.Date, examDate)
          .input('slotId', sql.Int, slotId)
          .input('courseDeptId', sql.Int, ders.DepartmentID);

        let exclusionQuery = atananGozetmenIDleri.length > 0 ? `AND p.PersonnelID NOT IN (${atananGozetmenIDleri.join(',')})` : '';

        const gozetmenResult = await gozetmenQuery.query(`
          SELECT TOP 1 p.PersonnelID 
          FROM Personnel p
          WHERE p.PersonnelID NOT IN (
              SELECT PersonnelID FROM PersonnelExcuses WHERE ExcuseDate = @tarih AND SlotID = @slotId
          )
          AND p.PersonnelID NOT IN (
              SELECT ia.PersonnelID FROM InvigilatorAssignments ia
              JOIN ExamClassrooms ec ON ia.ExamClassroomId = ec.ExamClassroomId
              JOIN Exams e ON ec.ExamID = e.ExamID
              WHERE e.ExamDate = @tarih AND e.SlotID = @slotId
          )
          ${exclusionQuery}
          ORDER BY 
            CASE WHEN p.DepartmentID = @courseDeptId THEN 1 ELSE 0 END DESC, -- Kendi bölüm hocası öncelikli
            (SELECT COUNT(*) FROM InvigilatorAssignments ia2 WHERE ia2.PersonnelID = p.PersonnelID) ASC, -- Görev yükü az olan öncelikli (Adil Dağıtım)
            NEWID() -- Eşitlik durumunda rastgelelik
        `);

        if (!gozetmenResult.recordset || gozetmenResult.recordset.length === 0) {
          throw new Error(`Kritik Eksiklik: Sınav salonu atandı fakat bu oturumda görevlendirilecek boşta gözetmen kalmadı!`);
        }

        const atananHocaId = gozetmenResult.recordset[0].PersonnelID;
        atananGozetmenIDleri.push(atananHocaId);

        await transaction.request()
          .input('ecId', sql.Int, yeniEcId)
          .input('personnelId', sql.Int, atananHocaId)
          .query('INSERT INTO InvigilatorAssignments (ExamClassroomId, PersonnelID) VALUES (@ecId, @personnelId)');
      }

      // 📜 SİSTEM LOGU KAYDI
      const simdi = new Date();
      const trTarihSaat = simdi.toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' });
      const logDetay = `Akıllı Sınav Planlandı: ${ders.CourseCode} için minimum ${atanacakSalonlar.length} salon ayrıldı.`;

      await transaction.request()
        .input('logType', sql.VarChar(50), 'SINAV_PLANLAMA')
        .input('logDetails', sql.NVarChar(500), logDetay)
        .input('formattedDate', sql.VarChar(50), trTarihSaat)
        .input('systemTimestamp', sql.VarChar(50), Date.now().toString())
        .query('INSERT INTO SystemLogs (LogType, LogDetails, FormattedDate, SystemTimestamp) VALUES (@logType, @logDetails, @formattedDate, @systemTimestamp)');

      await transaction.commit();
      return NextResponse.json({ success: true, detay: { dersAdi: ders.CourseName } });

    } catch (txError) {
      await transaction.rollback();
      throw txError;
    }

  } catch (error) {
    console.error("Algoritma motoru hatası:", error);
    return NextResponse.json({ error: `Planlama motoru hatası: ${error.message}` }, { status: 500 });
  }
}

// DELETE: Planlanmış bir sınavı ve ilişkili tüm alt atamaları güvenli bir şekilde silme
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: "Sınav ID parametresi eksik." }, { status: 400 });
    }

    const pool = await connectDB();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      await transaction.request()
        .input('examId', sql.Int, id)
        .query(`
          DELETE FROM InvigilatorAssignments 
          WHERE ExamClassroomId IN (SELECT ExamClassroomId FROM ExamClassrooms WHERE ExamID = @examId)
        `);

      await transaction.request()
        .input('examId', sql.Int, id)
        .query('DELETE FROM ExamClassrooms WHERE ExamID = @examId');

      await transaction.request()
        .input('examId', sql.Int, id)
        .query('DELETE FROM Exams WHERE ExamID = @examId');

      // 📜 SİLME İŞLEMİ LOGU
      const simdi = new Date();
      const trTarihSaat = simdi.toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' });
      await transaction.request()
        .input('logDetails', sql.NVarChar(500), `Sınav planı iptal edildi. ID: ${id}`)
        .input('formattedDate', sql.VarChar(50), trTarihSaat)
        .query("INSERT INTO SystemLogs (LogType, LogDetails, FormattedDate, SystemTimestamp) VALUES ('SINAV_SILME', @logDetails, @formattedDate, CAST(DATEDIFF(s, '1970-01-01', GETUTCDATE()) AS VARCHAR(50)))");

      await transaction.commit();
      return NextResponse.json({ success: true, message: "Sınav ve bağlı tüm görevlendirmeler başarıyla iptal edildi." });

    } catch (txError) {
      await transaction.rollback();
      throw txError;
    }
  } catch (error) {
    console.error("Sınav silme hatası:", error);
    return NextResponse.json({ error: `Sınav planı iptal edilemedi: ${error.message}` }, { status: 500 });
  }
}