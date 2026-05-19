import { NextResponse } from 'next/server';
import { connectDB, sql } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// 1. GET: Tüm gözetmenleri ve mazeretlerini çekme
export async function GET() {
  try {
    const pool = await connectDB();
    
    const queryText = `
      SELECT 
        p.PersonnelID, p.Title, p.FirstName, p.LastName, p.DepartmentID,
        d.DepartmentName,
        pe.ExcuseDate, pe.SlotID, pe.ExcuseType
      FROM Personnel p
      LEFT JOIN Departments d ON p.DepartmentID = d.DepartmentID
      LEFT JOIN PersonnelExcuses pe ON p.PersonnelID = pe.PersonnelID
      ORDER BY p.FirstName ASC, p.LastName ASC
    `;
    const result = await pool.request().query(queryText);

    const gozetmenMap = {};
    
    result.recordset.forEach(row => {
      const pId = row.PersonnelID;
      if (!gozetmenMap[pId]) {
        gozetmenMap[pId] = {
          id: pId,
          PersonnelID: pId,
          Title: row.Title,
          FirstName: row.FirstName,
          LastName: row.LastName,
          DepartmentID: row.DepartmentID,
          DepartmentName: row.DepartmentName,
          
          title: row.Title,
          firstName: row.FirstName,
          lastName: row.LastName,
          departmentName: row.DepartmentName,
          bolumAdi: row.DepartmentName,

          unvan: row.Title || '',
          ad: row.FirstName || '',
          soyad: row.LastName || '',
          
          mazeretler: []
        };
      }
      
      if (row.ExcuseDate) {
        const temizTarih = new Date(row.ExcuseDate).toISOString().split('T')[0];
        const mazeretEtiketi = `${temizTarih} - ID: ${row.SlotID || 1} (${row.ExcuseType || 'Mazeret'})`;
        if (!gozetmenMap[pId].mazeretler.includes(mazeretEtiketi)) {
          gozetmenMap[pId].mazeretler.push(mazeretEtiketi);
        }
      }
    });

    return NextResponse.json(Object.values(gozetmenMap));
  } catch (error) {
    console.error("❌ Gözetmen çekme hatası:", error);
    return NextResponse.json({ error: "Gözetmenler alınamadı." }, { status: 500 });
  }
}

// 2. POST: Yeni gözetmen ekleme (LOGLAMA ENTEGRELİ)
export async function POST(request) {
  try {
    const body = await request.json();
    const title = body.title || body.unvan || 'Arş. Gör.';
    const firstName = body.firstName || body.ad?.split(' ')[0] || 'İsim';
    const lastName = body.lastName || body.soyad || body.ad?.split(' ').slice(1).join(' ') || 'Soyisim';
    const departmentId = body.departmentId || body.bolumId || 1;

    const pool = await connectDB();
    
    // Güvenli kayıt ve loglama için Transaction başlatıyoruz
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      // ADIM 1: Personel tablosuna akademisyeni ekle
      const result = await transaction.request()
        .input('title', sql.NVarChar(30), title)
        .input('firstName', sql.NVarChar(50), firstName)
        .input('lastName', sql.NVarChar(50), lastName)
        .input('departmentId', sql.Int, departmentId)
        .query(`
          INSERT INTO Personnel (Title, FirstName, LastName, DepartmentID) 
          VALUES (@title, @firstName, @lastName, @departmentId);
          SELECT SCOPE_IDENTITY() AS YeniId;
        `);

      const yeniId = result.recordset[0].YeniId;
      const hocaTamAd = `${title} ${firstName} ${lastName}`.trim();

      // ADIM 2: 📜 BEKLENEN BACKLOG ENTEGRASYONU (SystemLogs tablosuna yazma)
      const simdi = new Date();
      const trTarihSaat = simdi.toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' });
      const safeTimestamp = Date.now().toString();
      const logDetay = `Yeni Akademisyen/Gözetmen: ${hocaTamAd} başarıyla sisteme eklendi ve havuz kapasitesine dahil edildi.`;

      await transaction.request()
        .input('logType', sql.VarChar(50), 'GOZETMEN_EKLEME')
        .input('logDetails', sql.NVarChar(500), logDetay)
        .input('formattedDate', sql.VarChar(50), trTarihSaat)
        .input('systemTimestamp', sql.VarChar(50), safeTimestamp)
        .query(`
          INSERT INTO SystemLogs (LogType, LogDetails, FormattedDate, SystemTimestamp)
          VALUES (@logType, @logDetails, @formattedDate, @systemTimestamp)
        `);

      // İki adım da başarılıysa veritabanına kaydet
      await transaction.commit();

      return NextResponse.json({ success: true, id: yeniId });

    } catch (txError) {
      await transaction.rollback();
      throw txError;
    }

  } catch (error) {
    console.error("❌ Gözetmen ekleme hatası:", error);
    return NextResponse.json({ error: "Gözetmen eklenemedi." }, { status: 500 });
  }
}

// 3. DELETE: Gözetmen silme ve İşlem Günlüğü (Backlog) Loglama Altyapısı
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: "ID eksik." }, { status: 400 });

    const pool = await connectDB();
    const targetPersonnelId = parseInt(id, 10);

    // 🛡️ LOGLAMA İÇİN SİLİNMEDEN ÖNCE HOCANIN BİLGİLERİNİ SORGULAYALIM
    const hocaBilgiResult = await pool.request()
      .input('id', sql.Int, targetPersonnelId)
      .query('SELECT Title, FirstName, LastName FROM Personnel WHERE PersonnelID = @id');
    
    if (hocaBilgiResult.recordset.length === 0) {
      return NextResponse.json({ error: "Silinmek istenen gözetmen veritabanında bulunamadı." }, { status: 404 });
    }
    
    const hoca = hocaBilgiResult.recordset[0];
    const hocaTamAd = `${hoca.Title || ''} ${hoca.FirstName} ${hoca.LastName}`.trim();

    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      // ADIM 1: Gözetmenin mazeretlerini kaldır (PersonnelExcuses)
      await transaction.request()
        .input('id', sql.Int, targetPersonnelId)
        .query('DELETE FROM PersonnelExcuses WHERE PersonnelID = @id');

      // ADIM 2: Sınav salon görevlendirmelerini kaldır (InvigilatorAssignments)
      await transaction.request()
        .input('id', sql.Int, targetPersonnelId)
        .query('DELETE FROM InvigilatorAssignments WHERE PersonnelID = @id');

      // ADIM 3: Esas akademisyen kaydını tablodan uçur (Personnel)
      await transaction.request()
        .input('id', sql.Int, targetPersonnelId)
        .query('DELETE FROM Personnel WHERE PersonnelID = @id');

      // ADIM 4: 📜 BEKLENEN BACKLOG ENTEGRASYONU (SystemLogs tablosuna yazma)
      const simdi = new Date();
      const trTarihSaat = simdi.toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' });
      const safeTimestamp = Date.now().toString();
      const logDetay = `${hocaTamAd} üzerinden akademisyen/gözetmen profili veritabanından kaldırıldı.`;

      await transaction.request()
        .input('logType', sql.VarChar(50), 'GOZETMEN_SILME')
        .input('logDetails', sql.NVarChar(500), logDetay)
        .input('formattedDate', sql.VarChar(50), trTarihSaat)
        .input('systemTimestamp', sql.VarChar(50), safeTimestamp)
        .query(`
          INSERT INTO SystemLogs (LogType, LogDetails, FormattedDate, SystemTimestamp)
          VALUES (@logType, @logDetails, @formattedDate, @systemTimestamp)
        `);

      await transaction.commit();

      return NextResponse.json({ success: true, message: "Gözetmen başarıyla silindi ve günlüğe kaydedildi." });
    } catch (txError) {
      await transaction.rollback();
      throw txError;
    }

  } catch (error) {
    console.error("❌ Gözetmen silme hatası:", error);
    return NextResponse.json({ error: `Gözetmen silinemedi: ${error.message}` }, { status: 500 });
  }
}