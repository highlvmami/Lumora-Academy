// src/app/api/assignments/route.js
import { NextResponse } from 'next/server';
import { connectDB, sql } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request) {
  try {
    const body = await request.json();
    const { sinavId, tarih, slotId } = body;

    if (!sinavId || !tarih || !slotId) {
      return NextResponse.json({ error: "Eksik parametre: sinavId, tarih ve slotId zorunludur." }, { status: 400 });
    }

    const pool = await connectDB();

    // 1. Bu sınav için kaç salona/dersliğe atama yapıldığını bulalım
    // Her salon için 1 gözetmen gerekecektir.
    const salonCountResult = await pool.request()
      .input('sinavId', sql.Int, sinavId)
      .query('SELECT COUNT(*) AS SalonSayisi FROM Sinav_Salonlari WHERE SinavID = @sinavId');

    const gerekliGozetmenSayisi = salonCountResult.recordset[0].SalonSayisi;

    if (gerekliGozetmenSayisi === 0) {
      return NextResponse.json({ error: "Bu sınava ait atanmış bir salon bulunamadı. Önce salon planlaması yapılmalı." }, { status: 400 });
    }

    // 2. Sınavın hangi ders ve bölüme ait olduğunu öğrenelim (Bölüm önceliği için)
    const dersResult = await pool.request()
      .input('sinavId', sql.Int, sinavId)
      .query(`
        SELECT c.DepartmentID, c.CourseName 
        FROM Sinavlar s 
        JOIN Courses c ON s.CourseID = c.CourseID 
        WHERE s.SinavID = @sinavId
      `);
    
    const dBolumId = dersResult.recordset[0]?.DepartmentID;
    const dName = dersResult.recordset[0]?.CourseName;

    // 3. 📜 SQL'DEKİ SP'Yİ (`sp_GetMusaitGozetmenler`) ÇAĞIRARAK TÜM MÜSAİT HOCALARI ALALIM
    // Bu SP zaten mazeretlileri ve o saatte çakışması olanları eledi, üstüne görev yüküne göre sıraladı!
    const gozetmenlerResult = await pool.request()
      .input('Tarih', sql.Date, tarih)
      .input('SlotID', sql.Int, slotId)
      .execute('sp_GetMusaitGozetmenler');

    const adayHocalar = gozetmenlerResult.recordset;
    const secilenHocalar = [];

    // 4. 🧠 NEXT.JS KATMANINDA ARDIŞIK 3 OTURUM KONTROLÜ (İŞ KURALI DENETİMİ)
    for (let hoca of adayHocalar) {
      if (secilenHocalar.length >= gerekliGozetmenSayisi) break;

      const pId = hoca.PersonnelID;

      // Hoca günün önceki ardışık slotlarında görev almış mı kontrol edelim (Örn: Slot 4 ise, Slot 1-2-3 kontrolü)
      // Doküman kuralı: Bir hoca peş peşe en fazla 3 oturumda görev alabilir.
      if (slotId >= 4) {
        const ardisikGorevCheck = await pool.request()
          .input('pId', sql.Int, pId)
          .input('tarih', sql.Date, tarih)
          .input('s1', sql.Int, slotId - 1)
          .input('s2', sql.Int, slotId - 2)
          .input('s3', sql.Int, slotId - 3)
          .query(`
            SELECT COUNT(*) AS AtamaSayisi 
            FROM Gozetmen_Atamalari ga
            JOIN Sinavlar s ON ga.SinavID = s.SinavID
            WHERE ga.PersonelID = @pId 
              AND s.Tarih = @tarih 
              AND s.OturumID IN (@s1, @s2, @s3)
          `);

        // Eğer son 3 oturumun üçünde de görevliyse bu hocayı pas geç (Dinlenme Kuralı)
        if (ardisikGorevCheck.recordset[0].AtamaSayisi === 3) {
          console.log(`⏳ Gözetmen ${hoca.FirstName} ${hoca.LastName} ardışık 3 oturum sınırına takıldığı için dinlendiriliyor.`);
          continue; 
        }
      }

      // 5. 🌊 BÖLÜM ÖNCELİKLİ HAVUZ SİSTEMİ
      // Eğer hocanın bölümü dersin bölümüyle eşleşiyorsa listenin başına, eşleşmiyorsa (Ortak Havuz) sonrasına kalacak şekilde bir esneklik puanı verelim
      hoca.oncelikPuani = (hoca.DepartmentID === dBolumId) ? 0 : 1;
      secilenHocalar.push(hoca);
    }

    // Görev yükü ve bölüm önceliğine göre nihai sıralamayı yapıp ihtiyacımız kadar hoca seçelim
    secilenHocalar.sort((a, b) => a.oncelikPuani - b.oncelikPuani || a.GörevYükü - b.GörevYükü);
    const nihaiGozetmenler = secilenHocalar.slice(0, gerekliGozetmenSayisi);

    // Havuzda yeterli hoca kalmadıysa hata verelim
    if (nihaiGozetmenler.length < gerekliGozetmenSayisi) {
      return NextResponse.json({ 
        error: `❌ GÖZETMEN YETERSİZ: Bu sınavın ${gerekliGozetmenSayisi} salonu için hoca lazım ancak kriterlere uyan sadece ${nihaiGozetmenler.length} müsait gözetmen bulundu.` 
      }, { status: 400 });
    }

    // 6. 🔏 ATAMALARI VERİTABANINA KAYDEDELİM VE LOGLAYALIM
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      for (let hoca of nihaiGozetmenler) {
        await transaction.request()
          .input('sinavId', sql.Int, sinavId)
          .input('personelId', sql.Int, hoca.PersonnelID)
          .query('INSERT INTO Gozetmen_Atamalari (SinavID, PersonelID) VALUES (@sinavId, @personelId)');
      }

      // 📜 İŞLEM GÜNLÜĞÜNE (BACKLOG) YAZALIM (Yeşil Etiket)
      const simdi = new Date();
      const trTarihSaat = simdi.toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' });
      const hocaIsimleri = nihaiGozetmenler.map(h => `${h.Unvan} ${h.FirstName} ${h.LastName}`).join(', ');
      const logDetay = `Otomatik Atama: "${dBName}" sınavının ${gerekliGozetmenSayisi} salonuna adil yük dağılımıyla [ ${hocaIsimleri} ] gözetmen olarak atandı.`;

      await transaction.request()
        .input('logType', sql.VarChar(50), 'GOZETMEN_ATAMA')
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
        message: "Gözetmenler adil dağıtım ve havuz kısıtlarına göre başarıyla atandı.",
        atananlar: nihaiGozetmenler.map(h => `${h.Unvan} ${h.FirstName} ${h.LastName}`)
      });

    } catch (txError) {
      await transaction.rollback();
      throw txError;
    }

  } catch (error) {
    console.error("Gözetmen atama algoritma hatası:", error);
    return NextResponse.json({ error: `Gözetmen ataması başarısız: ${error.message}` }, { status: 500 });
  }
}