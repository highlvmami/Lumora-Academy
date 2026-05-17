"use client";

export default function StatsPanel({ mevcutSinavlar = [], gozetmenler = [] }) {
  // Veritabanından gelen verilerde 'salonlar' veya 'gozetmenler' string, array veya undefined gelebilir.
  // Güvenli reduce işlemleri ile benzersiz salon ve gözetmen sayılarını hesaplıyoruz.
  
  const toplamSinav = mevcutSinavlar.length;

  const kullanilanSalonlar = mevcutSinavlar.reduce((acc, s) => {
    if (Array.isArray(s.salonlar)) {
      s.salonlar.forEach(x => { if (!acc.includes(x)) acc.push(x); });
    } else if (s.RoomName && !acc.includes(s.RoomName)) {
      // Eğer API düzleştirilmiş (flat) view verisi döndüyse RoomName'i baz al
      acc.push(s.RoomName);
    }
    return acc;
  }, []);

  const aktifGozetmenler = mevcutSinavlar.reduce((acc, s) => {
    if (Array.isArray(s.gozetmenler)) {
      s.gozetmenler.forEach(x => { if (!acc.includes(x)) acc.push(x); });
    } else if (s.FullName && !acc.includes(s.FullName)) {
      // Eğer API v_InvigilatorTaskReport gibi bir view'dan beslendiyse FullName'i baz al
      acc.push(s.FullName);
    }
    return acc;
  }, []);

  const kartlar = [
    { baslik: "PLANLANAN SINAV", deger: `${toplamSinav} Adet`, renk: "text-indigo-600" },
    { baslik: "KULLANILAN SALON", deger: `${kullanilanSalonlar.length} Salon`, renk: "text-slate-700" },
    { baslik: "AKTİF GÖREVLENDİRME", deger: `${aktifGozetmenler.length} Akademisyen`, renk: "text-emerald-600" },
    { baslik: "HAVUZ KAPASİTESİ", deger: `${gozetmenler.length} Kayıtlı`, renk: "text-amber-600" },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-slate-200 max-w-[1600px] mx-auto px-8 py-2">
      {kartlar.map((kart, idx) => (
        <div key={idx} className="bg-white/40 py-2 px-4 flex flex-col">
          <span className="text-[9px] font-bold tracking-widest text-slate-400 uppercase">
            {kart.baslik}
          </span>
          <span className={`text-sm font-bold mt-0.5 ${kart.renk}`}>
            {kart.deger}
          </span>
        </div>
      ))}
    </div>
  );
}