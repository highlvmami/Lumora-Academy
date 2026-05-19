import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const pool = await connectDB();
    
    // 🚀 Düzenleme: StartTime ve EndTime kolonlarını da sorguya ekledik
    const result = await pool.request().query(`
      SELECT SlotID, SlotName, StartTime, EndTime 
      FROM TimeSlots 
      ORDER BY SlotID ASC
    `);

    const formatliTimeslots = result.recordset.map(row => {
      // SQL'den gelen TIME verisini (Örn: 1970-01-01T09:00:00.000Z veya direkt string) HH:mm formatına getiriyoruz
      const baslangic = row.StartTime ? new Date(row.StartTime).toISOString().substring(11, 16) : '';
      const bitis = row.EndTime ? new Date(row.EndTime).toISOString().substring(11, 16) : '';
      
      // Eğer ISO string dönüşümü patlarsa veya veri direkt string gelirse diye alternatif güvenli format
      const saatAraligi = (baslangic && bitis) ? `${baslangic} - ${bitis}` : '';

      return {
        id: row.SlotID,
        SlotID: row.SlotID,
        // Ön yüzde select box içinde "Sabah-1 (09:00 - 10:30)" şeklinde listelensin diye birleştirdik
        name: saatAraligi ? `${row.SlotName} (${saatAraligi})` : row.SlotName,
        SlotName: row.SlotName,
        time: saatAraligi,
        date: ""
      };
    });

    return NextResponse.json(formatliTimeslots);
  } catch (error) {
    console.error("❌ Timeslots çekilirken SQL hatası oluştu:", error);
    return NextResponse.json({ error: "Oturum slotları veritabanından yüklenemedi." }, { status: 500 });
  }
}