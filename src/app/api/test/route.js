// src/app/api/test/route.js
import { connectDB } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Kısıtlı izleyici (App_Viewer) rolü ile veritabanı bağlantı havuzunu açıyoruz
    const pool = await connectDB('viewer');
    
    // Veritabanındaki 'Dersler' tablosundan tüm kayıtları çekiyoruz
    const result = await pool.request().query('SELECT * FROM Dersler');

    // Bağlantı başarılı ise verileri tarayıcıya JSON formatında gönderiyoruz
    return NextResponse.json({ 
      success: true, 
      message: "SQL Server bağlantısı başarılı!", 
      data: result.recordset 
    });

  } catch (error) {
    // Herhangi bir bağlantı veya sorgu hatası olursa burası çalışır
    return NextResponse.json({ 
      success: false, 
      message: "Veritabanına bağlanılamadı veya sorgu hatası oluştu!", 
      error: error.message 
    }, { status: 500 });
  }
}