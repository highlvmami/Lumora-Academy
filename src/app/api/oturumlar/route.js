import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const pool = await connectDB();
    
    const result = await pool.request().query(`
      SELECT SlotID, SlotName 
      FROM TimeSlots 
      ORDER BY SlotID ASC
    `);

    const formatliTimeslots = result.recordset.map(row => ({
      id: row.SlotID,
      SlotID: row.SlotID,
      name: row.SlotName,
      SlotName: row.SlotName,
      time: "",
      date: ""
    }));

    return NextResponse.json(formatliTimeslots);
  } catch (error) {
    console.error("❌ Timeslots çekilirken SQL hatası oluştu:", error);
    return NextResponse.json({ error: "Oturum slotları veritabanından yüklenemedi." }, { status: 500 });
  }
}