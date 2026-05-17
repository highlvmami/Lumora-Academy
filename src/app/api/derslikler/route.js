import { NextResponse } from 'next/server';
import { connectDB, sql } from '@/lib/db';

export async function GET() {
  try {
    const pool = await connectDB();
    
    // Şemanızdaki RoomName kolonuna göre sıralıyoruz
    const result = await pool.request().query('SELECT * FROM Classrooms ORDER BY RoomName ASC');
    
    const derslikler = result.recordset.map(row => ({
      ClassroomID: row.ClassroomID,
      RoomName: row.RoomName,
      Capacity: row.Capacity,
      RoomType: row.RoomType,
      Floor: row.Floor,

      // Frontend Köprüsü (Arayüz ad alanına bakar)
      id: row.ClassroomID,
      ad: row.RoomName,
      kapasite: row.Capacity
    }));

    return NextResponse.json(derslikler);
  } catch (error) {
    console.error("Derslik çekme hatası:", error);
    return NextResponse.json({ error: "Derslik verileri alınamadı." }, { status: 500 });
  }
}