// src/app/api/backlog/route.js
import { NextResponse } from 'next/server';
import { connectDB, sql } from '@/lib/db';

// 1. GÜNLÜKLERİ LİSTELEME (GET)
export async function GET() {
  try {
    const pool = await connectDB();
    
    // Veritabanından orijinal kolon isimleriyle çekiyoruz
    const result = await pool.request().query(`
      SELECT LogID, LogType, LogDetails, FormattedDate, SystemTimestamp 
      FROM SystemLogs
      ORDER BY LogID DESC
    `);

    // 🔍 KESİN ÇÖZÜM KÖPRÜSÜ:
    // `BacklogTab.jsx` hangi property ismini ararsa arasın, boş dönmesin diye her varyasyonu dolduruyoruz.
    const formatliLoglar = result.recordset.map(row => {
      const tur = row.LogType || 'SİSTEM';
      const detay = row.LogDetails || 'İşlem gerçekleştirildi.';
      const tarih = row.FormattedDate || new Date().toLocaleString('tr-TR');

      return {
        // ID varyasyonları
        id: row.LogID,
        LogID: row.LogID,

        // İşlem Türü varyasyonları (Küçük, Büyük, Türkçe)
        type: tur,
        LogType: tur,
        logType: tur,
        islemTuru: tur,

        // İşlem Detayı varyasyonları
        details: detay,
        LogDetails: detay,
        logDetails: detay,
        detay: detay,

        // Zaman varyasyonları
        formattedDate: tarih,
        FormattedDate: tarih,
        date: tarih,
        tarih: tarih,
        timestamp: row.SystemTimestamp || Date.now().toString()
      };
    });

    return NextResponse.json(formatliLoglar);
  } catch (error) {
    console.error("❌ Backlog çekme hatası:", error);
    return NextResponse.json({ error: "İşlem günlüğü yüklenemedi." }, { status: 500 });
  }
}

// 2. YENİ GÜNLÜK KAYDETME (POST)
// src/app/api/backlog/route.js - SADECE POST FONKSİYONU GÜNCELLEMESİ

export async function POST(request) {
  try {
    const body = await request.json();
    
    const logType = body.type || body.logType || body.LogType || body.islemTuru || '';
    const logDetails = body.details || body.logDetails || body.LogDetails || body.detay || '';
    
    // 🛡️ ÇİFT LOG ATMA KALKANI: 
    // Frontend'den gelen içi boş, detaysız veya mükerrer tetiklenen log isteklerini 
    // veritabanına yazmadan doğrudan pas geçiyoruz. Böylece sadece jilet gibi olan tek log kalıyor.
    if (!logType || logDetails === 'İşlem gerçekleştirildi.' || !body.details) {
      return NextResponse.json({ success: true, message: "Gereksiz/Mükerrer log engellendi." });
    }

    const simdi = new Date();
    const formattedDate = body.formattedDate || body.FormattedDate || body.tarih || simdi.toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' });
    const systemTimestamp = body.timestamp || body.systemTimestamp || Date.now().toString();

    const pool = await connectDB();
    
    await pool.request()
      .input('logType', sql.VarChar(50), logType)
      .input('logDetails', sql.NVarChar(500), logDetails)
      .input('formattedDate', sql.VarChar(50), formattedDate)
      .input('systemTimestamp', sql.VarChar(50), systemTimestamp)
      .query(`
        INSERT INTO SystemLogs (LogType, LogDetails, FormattedDate, SystemTimestamp)
        VALUES (@logType, @logDetails, @formattedDate, @systemTimestamp)
      `);

    return NextResponse.json({ success: true, message: "Log başarıyla yazıldı." });
  } catch (error) {
    console.error("❌ Backlog yazma hatası (POST):", error);
    return NextResponse.json({ error: `Log kaydedilemedi: ${error.message}` }, { status: 500 });
  }
}

// 3. TÜM GÜNLÜĞÜ TEMİZLEME (DELETE)
export async function DELETE() {
  try {
    const pool = await connectDB();
    await pool.request().query('TRUNCATE TABLE SystemLogs');
    return NextResponse.json({ success: true, message: "Tüm işlem günlüğü temizlendi." });
  } catch (error) {
    console.error("❌ Backlog temizleme hatası:", error);
    return NextResponse.json({ error: "Günlük temizlenemedi." }, { status: 500 });
  }
}