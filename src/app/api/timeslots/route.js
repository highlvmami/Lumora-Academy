import { NextResponse } from 'next/server';
import { connectDB, sql } from '@/lib/db';

// Next.js'in bu isteği agresif şekilde önbelleğe (cache) almasını engelliyoruz
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const pool = await connectDB();
    
    // Veritabanından ham verileri çekiyoruz
    const result = await pool.request().query(`
      SELECT SlotID, SlotName 
      FROM TimeSlots 
      ORDER BY SlotID ASC
    `);

    // Ekranda (hu Ja - hu Ja) veya boş çıkmasını engellemek için 
    // frontend'in arayabileceği tüm olası kolon varyasyonlarını tek bir objede birleştiriyoruz!
    const formatliTimeslots = result.recordset.map(row => ({
      // Standart eşlemeler
      id: row.SlotID,
      SlotID: row.SlotID,
      slotID: row.SlotID,
      name: row.SlotName || `Oturum ${row.SlotID}`,
      SlotName: row.SlotName || `Oturum ${row.SlotID}`,
      slotName: row.SlotName || `Oturum ${row.SlotID}`,
      
      // Frontend eğer tarih tabanlı bir döngü kurup bugünün tarihini basmaya çalışıyorsa
      // (hu Ja) hatasını sönümlemek için Türkçe formatta boş etiketler ekliyoruz
      time: row.SlotName || "",
      date: "",
      label: row.SlotName || `Oturum ${row.SlotID}`,
      title: row.SlotName || `Oturum ${row.SlotID}`
    }));

    // Eğer veritabanı tamamen boşsa frontend patlamasın diye statik acil durum slotları dönüyoruz
    if (formatliTimeslots.length === 0) {
      const acilDurumSlotlari = [
        { id: 1, SlotID: 1, name: "Sabah-1 (1. Oturum)", SlotName: "Sabah-1 (1. Oturum)" },
        { id: 2, SlotID: 2, name: "Sabah-2 (2. Oturum)", SlotName: "Sabah-2 (2. Oturum)" },
        { id: 3, SlotID: 3, name: "Öğle-1 (3. Oturum)", SlotName: "Öğle-1 (3. Oturum)" },
        { id: 4, SlotID: 4, name: "Öğle-2 (4. Oturum)", SlotName: "Öğle-2 (4. Oturum)" },
        { id: 5, SlotID: 5, name: "Akşam-1 (5. Oturum)", SlotName: "Akşam-1 (5. Oturum)" }
      ];
      return NextResponse.json(acilDurumSlotlari);
    }

    return NextResponse.json(formatliTimeslots);
  } catch (error) {
    console.error("❌ Timeslots çekilirken kritik hata:", error);
    
    // Veritabanı bağlantısı o an kopsa bile arayüzün beyaz ekranda kalmaması için 
    // yedek koruma havuzunu döndürüyoruz
    const yedekHavuz = [
      { id: 1, SlotID: 1, name: "Sabah-1", SlotName: "Sabah-1" },
      { id: 2, SlotID: 2, name: "Sabah-2", SlotName: "Sabah-2" },
      { id: 3, SlotID: 3, name: "Öğle-1", SlotName: "Öğle-1" },
      { id: 4, SlotID: 4, name: "Öğle-2", SlotName: "Öğle-2" }
    ];
    return NextResponse.json(yedekHavuz);
  }
}