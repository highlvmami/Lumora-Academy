// src/app/api/slots/route.js
import { NextResponse } from 'next/server';
import { connectDB, sql } from '@/lib/db';

export async function GET() {
  try {
    const pool = await connectDB();
    
    // 🔍 SQL İÇİNDE DİREKT FORMATLAMA
    // CONVERT(varchar(5), Sütun, 108) ifadesi saati doğrudan "08:30" formatında string yapar.
    // Böylece JavaScript'in bunu garip lokalize etmesini kökten engelleriz.
    const queryText = `
      SELECT 
        SlotID, 
        SlotName,
        CONVERT(varchar(5), StartTime, 108) AS TemizStart,
        CONVERT(varchar(5), EndTime, 108) AS TemizEnd
      FROM TimeSlots 
      ORDER BY SlotID ASC
    `;
    
    const result = await pool.request().query(queryText);
    
    const slots = result.recordset.map(row => {
      const baslangic = row.TemizStart || "00:00";
      const bitis = row.TemizEnd || "00:00";
      
      // Arayüzde görünecek o jilet gibi temiz etiket:
      const temizEtiket = `${row.SlotName} (${baslangic} - ${bitis})`;

      return {
        id: row.SlotID,
        SlotID: row.SlotID,
        slotId: row.SlotID,
        oturum: row.SlotID,
        
        // Frontend select option'larının okuduğu tüm olası alanlar
        ad: temizEtiket,
        name: temizEtiket,
        label: temizEtiket,
        
        StartTime: baslangic,
        EndTime: bitis
      };
    });

    return NextResponse.json(slots);
  } catch (error) {
    console.error("❌ Zaman dilimleri çekilemedi:", error);
    return NextResponse.json({ error: "Zaman dilimleri yüklenemedi." }, { status: 500 });
  }
}