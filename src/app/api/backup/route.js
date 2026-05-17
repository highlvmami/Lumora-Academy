// src/app/api/backup/route.js
import { NextResponse } from 'next/server';
import { connectDB, sql } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST() {
  try {
    const pool = await connectDB();

    // Veritabanında hazırladığımız yedekleme Stored Procedure'ünü çalıştırıyoruz
    const result = await pool.request().execute('sp_BackupDatabase');
    
    const yedekYolu = result.recordset[0]?.YedeklenenDosyaYolu || "C:\\Yedekler\\";

    // 📜 İŞLEM GÜNLÜĞÜNE (BACKLOG) YEDEKLEME LOGUNU İŞLEYELİM (Sistem Sıfırla/Yedekle Rengi)
    const simdi = new Date();
    const trTarihSaat = simdi.toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' });
    const logDetay = `Sistem Yedekleme: Tam veritabanı yedeği başarıyla oluşturuldu. Dosya: ${yedekYolu}`;

    await pool.request()
      .input('logType', sql.VarChar(50), 'SISTEM_YEDEKLE')
      .input('logDetails', sql.NVarChar(500), logDetay)
      .input('formattedDate', sql.VarChar(50), trTarihSaat)
      .input('systemTimestamp', sql.VarChar(50), Date.now().toString())
      .query(`
        INSERT INTO SystemLogs (LogType, LogDetails, FormattedDate, SystemTimestamp)
        VALUES (@logType, @logDetails, @formattedDate, @systemTimestamp)
      `);

    return NextResponse.json({ 
      success: true, 
      message: "Veritabanı başarıyla yedeklendi ve işlem günlüğüne kaydedildi.",
      path: yedekYolu
    });

  } catch (error) {
    console.error("Yedekleme API hatası:", error);
    return NextResponse.json({ 
      error: `Yedekleme işlemi başarısız oldu: ${error.message}. (Lütfen C:\\Yedekler klasörünün mevcut olduğundan ve SQL Server'ın yazma izni olduğundan emin olun.)` 
    }, { status: 500 });
  }
}