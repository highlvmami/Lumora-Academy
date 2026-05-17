import { NextResponse } from 'next/server';
import { connectDB, sql } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request) {
  try {
    const body = await request.json();
    
    // Gelen ham body verisini terminale logla (VS Code terminalinden kontrol edebilirsin)
    console.log("=== API'YE GELEN DATA ===", body);

    // Olası tüm harf varyasyonlarını string ve sayı kontrolleriyle temizleyelim
    let rawCourseId = body.courseId || body.CourseID || body.courseid || body.selectedCourse;
    const { tarih, slotId } = body;

    // Eğer ID string olarak "1" geldiyse sayıya çevirelim
    const targetCourseId = rawCourseId ? parseInt(rawCourseId, 10) : null;

    if (!targetCourseId || isNaN(targetCourseId) || !tarih || !slotId) {
      return NextResponse.json({ 
        error: `Eksik veya Hatalı Veri! Ders ID: ${rawCourseId}, Tarih: ${tarih}, Slot: ${slotId}` 
      }, { status: 400 });
    }

    const pool = await connectDB();

    // 2. Ders sorgusunu yapıyoruz
    const courseResult = await pool.request()
      .input('courseId', sql.Int, targetCourseId)
      .query('SELECT CourseCode, CourseName, StudentCount, Semester FROM Courses WHERE CourseID = @courseId');

    // ❌ Hatanın patladığı yer: Detaylandırarak ekrana basıyoruz
    if (!courseResult.recordset || courseResult.recordset.length === 0) {
      // Veritabanında o an gerçekten ne olduğunu anlamak için mevcut derslerin ID'lerini çekelim
      const mevcutDersler = await pool.query('SELECT CourseID, CourseCode FROM Courses');
      const mevcutIdListesi = mevcutDersler.recordset.map(c => c.CourseID).join(', ');

      return NextResponse.json({ 
        error: `Hata: Seçilen ders bilgisi veritabanında bulunamadı.\nAranan ID: ${targetCourseId}\nVeritabanındaki Mevcut ID'ler: [${mevcutIdListesi}]` 
      }, { status: 404 });
    }

    const ders = courseResult.recordset[0];
    let kalanOgrenci = ders.StudentCount;

    // 3. 🛡️ YARIYIL / DÖNEM ÇAKIŞMA KONTROLÜ (UDF)
    const cakismaCheck = await pool.request()
      .input('semester', sql.Int, ders.Semester)
      .input('tarih', sql.Date, tarih)
      .input('slotId', sql.Int, slotId)
      .query('SELECT dbo.fn_DonemCakismaVarMi(@semester, @tarih, @slotId) AS CakismaVar');

    if (cakismaCheck.recordset[0].CakismaVar === true || cakismaCheck.recordset[0].CakismaVar === 1) {
      return NextResponse.json({ 
        error: `❌ ÇAKIŞMA ENGELLENDİ: ${ders.Semester}. Yarıyıla (Sınıfa) ait başka bir dersin sınavı aynı gün ve saatte zaten var!` 
      }, { status: 400 });
    }

    // 4. 🏢 BOŞ SALONLARI BÜYÜKTEN KÜÇÜĞE SIRALAYARAK GETİR
    const bosSalonlarResult = await pool.request()
      .input('tarih', sql.Date, tarih)
      .input('slotId', sql.Int, slotId)
      .query(`
        SELECT DerslikID, Ad, Kapasite 
        FROM Derslikler 
        WHERE Aktif = 1 
        AND DerslikID NOT IN (
          SELECT ss.DerslikID 
          FROM Sinav_Salonlari ss
          JOIN Sinavlar s ON ss.SinavID = s.SinavID
          WHERE s.Tarih = @tarih AND s.OturumID = @slotId
        )
        ORDER BY Kapasite DESC, Ad ASC
      `);

    const bosSalonlar = bosSalonlarResult.recordset;
    const atanacakSalonlar = [];
    let toplamAtananKapasite = 0;

    // 5. 🧠 AKILLI SALON SEÇİM ALGORİTMASI
    for (let salon of bosSalonlar) {
      if (kalanOgrenci <= 0) break;

      atanacakSalonlar.push(salon);
      toplamAtananKapasite += salon.Kapasite;
      kalanOgrenci -= salon.Kapasite;
    }

    if (kalanOgrenci > 0) {
      return NextResponse.json({ 
        error: `❌ KAPASİTE YETERSİZ: Bu sınav için ${ders.StudentCount} kişilik yer lazım fakat o saatteki boş salonların toplam kapasitesi sadece ${toplamAtananKapasite} kişi.` 
      }, { status: 400 });
    }

    // 6. 🔏 TRANSACTION İLE GÜVENLİ KAYIT ATMA
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      const examInsert = await transaction.request()
        .input('courseId', sql.Int, targetCourseId)
        .input('tarih', sql.Date, tarih)
        .input('slotId', sql.Int, slotId)
        .query(`
          INSERT INTO Sinavlar (CourseID, Tarih, OturumID) 
          VALUES (@courseId, @tarih, @slotId);
          SELECT SCOPE_IDENTITY() AS YeniSinavID;
        `);

      const yeniSinavId = examInsert.recordset[0].YeniSinavID;

      for (let salon of atanacakSalonlar) {
        await transaction.request()
          .input('sinavId', sql.Int, yeniSinavId)
          .input('derslikId', sql.Int, salon.DerslikID)
          .query(`
            INSERT INTO Sinav_Salonlari (SinavID, DerslikID) 
            VALUES (@sinavId, @derslikId)
          `);
      }

      // 📜 LOGLAMA SİSTEMİ
      const simdi = new Date();
      const trTarihSaat = simdi.toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' });
      const salonIsimleri = atanacakSalonlar.map(s => `${s.Ad} (${s.Kapasite})`).join(', ');
      const logDetay = `Akıllı Planlama: ${ders.CourseCode} - ${ders.CourseName} sınavı için ${salonIsimleri} salonları otomatik ayrıldı. Toplam Kontenjan: ${ders.StudentCount}, Atanan Kapasite: ${toplamAtananKapasite}`;

      await transaction.request()
        .input('logType', sql.VarChar(50), 'SINAV_PLANLAMA')
        .input('logDetails', sql.NVarChar(500), logDetay)
        .input('formattedDate', sql.VarChar(50), trTarihSaat)
        .input('systemTimestamp', sql.VarChar(50), Date.now().toString())
        .query(`
          INSERT INTO SystemLogs (LogType, LogDetails, FormattedDate, SystemTimestamp)
          VALUES (@logType, @logDetails, @formattedDate, @systemTimestamp)
        `);

      await transaction.commit();

      return NextResponse.json({
        success: true,
        message: "Sınav başarıyla planlandı.",
        detay: {
          sinavId: yeniSinavId,
          dersAdi: ders.CourseName,
          kontenjan: ders.StudentCount,
          atananKapasite: toplamAtananKapasite,
          salonlar: atanacakSalonlar.map(s => s.Ad)
        }
      });

    } catch (txError) {
      await transaction.rollback();
      throw txError;
    }

  } catch (error) {
    console.error("Sınav planlama algoritma hatası:", error);
    return NextResponse.json({ error: `Planlama başarısız oldu: ${error.message}` }, { status: 500 });
  }
}