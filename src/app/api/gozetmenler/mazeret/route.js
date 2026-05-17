import { NextResponse } from 'next/server';
import { connectDB, sql } from '@/lib/db';

// 1. MAZERET KAYDETME (POST)
export async function POST(request) {
  try {
    const body = await request.json();
    const personnelId = body.personnelId || body.gozetmenId;
    const excuseDate = body.excuseDate || body.tarih;
    const slotId = body.slotId ? parseInt(body.slotId) : 1; 
    const excuseType = body.excuseType || "Mazeret";

    if (!personnelId || !excuseDate) {
      return NextResponse.json({ error: "Eksik parametre." }, { status: 400 });
    }

    const pool = await connectDB();

    // Loglama için personelin adını soyadını önceden alalım
    const personResult = await pool.request()
      .input('pId', sql.Int, personnelId)
      .query('SELECT Title, FirstName, LastName FROM Personnel WHERE PersonnelID = @pId');
    
    let personName = "Akademisyen";
    if (personResult.recordset.length > 0) {
      const p = personResult.recordset[0];
      personName = `${p.Title || ''} ${p.FirstName} ${p.LastName}`.trim();
    }

    // Güvenli süreç yönetimi (Transaction)
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      // PersonnelExcuses tablosuna kayıt
      await transaction.request()
        .input('personnelId', sql.Int, personnelId)
        .input('excuseDate', sql.Date, excuseDate)
        .input('slotId', sql.Int, slotId)
        .input('excuseType', sql.NVarChar(50), excuseType)
        .query(`
          INSERT INTO PersonnelExcuses (PersonnelID, ExcuseDate, SlotID, ExcuseType) 
          VALUES (@personnelId, @excuseDate, @slotId, @excuseType)
        `);

      // 📜 İŞLEM GÜNLÜĞÜNE YAZMA
      const simdi = new Date();
      const trTarihSaat = simdi.toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' });
      const safeTimestamp = Date.now().toString();
      const logDetay = `${personName} için mazeret tanımlandı: ${excuseDate} (Oturum Slot ID: ${slotId}) - Tür: ${excuseType}`;

      await transaction.request()
        .input('logType', sql.VarChar(50), 'MAZERET_EKLEME')
        .input('logDetails', sql.NVarChar(500), logDetay)
        .input('formattedDate', sql.VarChar(50), trTarihSaat)
        .input('systemTimestamp', sql.VarChar(50), safeTimestamp)
        .query(`
          INSERT INTO SystemLogs (LogType, LogDetails, FormattedDate, SystemTimestamp)
          VALUES (@logType, @logDetails, @formattedDate, @systemTimestamp)
        `);

      await transaction.commit();
      return NextResponse.json({ success: true, message: "Mazeret başarıyla eklendi ve loglandı." });
    } catch (txError) {
      await transaction.rollback();
      throw txError;
    }
  } catch (error) {
    console.error("Mazeret ekleme hatası:", error);
    return NextResponse.json({ error: `Mazeret kaydı başarısız: ${error.message}` }, { status: 500 });
  }
}

// 2. MAZERET KALDIRMA (DELETE)
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const personnelId = searchParams.get('personnelId') || searchParams.get('gozetmenId');
    const textParam = searchParams.get('text');

    if (!personnelId) return NextResponse.json({ error: "Personel ID eksik." }, { status: 400 });

    const pool = await connectDB();

    // Loglama için personelin adını soyadını alalım
    const personResult = await pool.request()
      .input('pId', sql.Int, personnelId)
      .query('SELECT Title, FirstName, LastName FROM Personnel WHERE PersonnelID = @pId');
    
    let personName = "Akademisyen";
    if (personResult.recordset.length > 0) {
      const p = personResult.recordset[0];
      personName = `${p.Title || ''} ${p.FirstName} ${p.LastName}`.trim();
    }

    let queryText = "";
    const req = pool.request().input('personnelId', sql.Int, personnelId);
    let tarihKismi = "";

    if (textParam) {
      tarihKismi = textParam.split(' - ')[0]?.trim();
      const slotKismiMatch = textParam.match(/ID:\s*(\d+)/);
      const slotId = slotKismiMatch ? parseInt(slotKismiMatch[1]) : 1;

      req.input('excuseDate', sql.Date, tarihKismi);
      req.input('slotId', sql.Int, slotId);
      queryText = 'DELETE FROM PersonnelExcuses WHERE PersonnelID = @personnelId AND ExcuseDate = @excuseDate AND SlotID = @slotId';
    } else {
      return NextResponse.json({ error: "Silme formatı geçersiz." }, { status: 400 });
    }

    // Silme ve loglamayı transaction ile bağlıyoruz
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      await transaction.request()
        .input('personnelId', sql.Int, personnelId)
        .input('excuseDate', sql.Date, tarihKismi)
        .input('slotId', sql.Int, req.parameters.slotId.value)
        .query(queryText);

      // 📜 İŞLEM GÜNLÜĞÜNE SİLME LOGU YAZMA (Kırmızı yanacak)
      const simdi = new Date();
      const trTarihSaat = simdi.toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' });
      const safeTimestamp = Date.now().toString();
      const logDetay = `${personName} üzerinden mazeret kaydı iptal edildi / kaldırıldı. (Tarih: ${tarihKismi})`;

      await transaction.request()
        .input('logType', sql.VarChar(50), 'MAZERET_SILME')
        .input('logDetails', sql.NVarChar(500), logDetay)
        .input('formattedDate', sql.VarChar(50), trTarihSaat)
        .input('systemTimestamp', sql.VarChar(50), safeTimestamp)
        .query(`
          INSERT INTO SystemLogs (LogType, LogDetails, FormattedDate, SystemTimestamp)
          VALUES (@logType, @logDetails, @formattedDate, @systemTimestamp)
        `);

      await transaction.commit();
      return NextResponse.json({ success: true, message: "Mazeret kaldırıldı ve günlüğe işlendi." });
    } catch (txError) {
      await transaction.rollback();
      throw txError;
    }
  } catch (error) {
    console.error("Mazeret silme hatası:", error);
    return NextResponse.json({ error: "Mazeret silinemedi." }, { status: 500 });
  }
}