// src/app/api/bolumler/route.js
import { NextResponse } from 'next/server';
import { connectDB, sql } from '@/lib/db';

export async function GET() {
  try {
    const pool = await connectDB();
    
    // Veritabanındaki Departments tablosundan id ve isimleri çekiyoruz
    // (Senin şemana göre kolon isimleri DepartmentID ve DepartmentName şeklindedir)
    const result = await pool.request().query(`
      SELECT DepartmentID, DepartmentName 
      FROM Departments 
      ORDER BY DepartmentName ASC
    `);

    // Frontend hem büyük/küçük harf seçiciye takılmasın hem de direkt eşleşsin diye map'liyoruz
    const formatliBolumler = result.recordset.map(row => ({
      id: row.DepartmentID,
      DepartmentID: row.DepartmentID,
      name: row.DepartmentName,
      DepartmentName: row.DepartmentName
    }));

    return NextResponse.json(formatliBolumler);
  } catch (error) {
    console.error("❌ Bölümler çekilirken SQL hatası oluştu:", error);
    return NextResponse.json({ error: "Bölüm listesi veritabanından yüklenemedi." }, { status: 500 });
  }
}