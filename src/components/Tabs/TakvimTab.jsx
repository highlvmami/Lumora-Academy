"use client";
import { useState } from 'react';

export default function TakvimTab({ dersler = [], mevcutSinavlar = [], zamanDilimleri = [], onSinavPlanla, onSinavSil }) {
  const [secilenDers, setSecilenDers] = useState('');
  const [secilenTarih, setSecilenTarih] = useState('');
  const [secilenOturum, setSecilenOturum] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!secilenDers || !secilenTarih || !secilenOturum) return;
    
    // API tarafındaki tüm parametre isimlendirmelerine tam uyumluluk köprüsü
    onSinavPlanla({ 
      courseId: secilenDers, 
      CourseID: secilenDers,
      examDate: secilenTarih, 
      ExamDate: secilenTarih,
      tarih: secilenTarih,
      slotId: secilenOturum,
      SlotID: secilenOturum
    });
    
    setSecilenDers('');
    setSecilenTarih('');
    setSecilenOturum('');
  };

  return (
    <div className="space-y-6">
      {/* YENİ SINAV PLANLAMA FORMU */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs print:hidden">
        <h2 className="text-xs font-bold text-slate-800 mb-4 uppercase tracking-wider flex items-center gap-2">
          <span>⚡</span> Akıllı Sınav Planlama
        </h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* DERS SEÇİMİ */}
          <select 
            value={secilenDers} 
            onChange={(e) => setSecilenDers(e.target.value)} 
            className="border border-slate-200 p-2.5 rounded-xl bg-slate-50/50 text-slate-600 text-xs focus:outline-none focus:border-indigo-500 focus:bg-white transition" 
            required
          >
            <option value="">-- Ders Seçiniz --</option>
            {dersler.map((d) => (
              <option key={d.CourseID || d.id} value={d.CourseID || d.id}>
                {d.CourseCode || d.kod} - {d.CourseName || d.ad} ({d.StudentCount || d.kontenjan || d.mevcut} Kişi)
              </option>
            ))}
          </select>
          
          {/* TARİH SEÇİMİ */}
          <input 
            type="date" 
            value={secilenTarih} 
            onChange={(e) => setSecilenTarih(e.target.value)} 
            className="border border-slate-200 p-2.5 rounded-xl bg-slate-50/50 text-slate-600 text-xs focus:outline-none focus:border-indigo-500 focus:bg-white transition" 
            required 
          />
          
          {/* DİNAMİK OTURUM SEÇİMİ */}
          <select 
            value={secilenOturum} 
            onChange={(e) => setSecilenOturum(e.target.value)} 
            className="border border-slate-200 p-2.5 rounded-xl bg-slate-50/50 text-slate-600 text-xs focus:outline-none focus:border-indigo-500 focus:bg-white transition" 
            required
          >
            <option value="">-- Oturum Seçiniz --</option>
            {zamanDilimleri.length > 0 ? (
              zamanDilimleri.map((t) => (
                <option key={t.SlotID || t.id} value={t.SlotID || t.id}>
                  {t.SlotName || t.ad} ({t.StartTime?.substring(0, 5)} - {t.EndTime?.substring(0, 5)})
                </option>
              ))
            ) : (
              <>
                <option value="1">Sabah-1 (09:00 - 10:30)</option>
                <option value="2">Öğle-2 (11:00 - 12:30)</option>
                <option value="3">İkindi-3 (14:00 - 15:30)</option>
              </>
            )}
          </select>
          
          <button 
            type="submit" 
            className="md:col-span-3 bg-indigo-600 hover:bg-indigo-700 text-white p-2.5 rounded-xl font-semibold text-xs shadow-xs transition active:scale-99"
          >
            Sınavı Algoritmaya Gönder (Otomatik Ata)
          </button>
        </form>
      </div>

      {/* PLANLANAN SINAV TAKVİMİ LİSTESİ */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="mb-4">
          <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <span>📅</span> Planlanan Sınav Takvimi
          </h2>
          <p className="text-xs text-slate-400 mt-1">Sistemde toplam {mevcutSinavlar.length} aktif sınav planı kurulu.</p>
        </div>

        <div className="space-y-3">
          {mevcutSinavlar.length === 0 ? (
            <div className="text-center p-8 text-slate-400 text-xs italic border border-dashed border-slate-200 rounded-xl">
              Henüz planlanmış bir sınav bulunmuyor. Yukarıdaki panelden algoritmayı tetikleyebilirsiniz.
            </div>
          ) : (
            mevcutSinavlar.map((s) => {
              const temizTarih = s.ExamDate ? new Date(s.ExamDate).toLocaleDateString('tr-TR') : s.tarih;
              const gozetmenListesi = Array.isArray(s.gozetmenler) ? s.gozetmenler : (s.gozetmenler ? s.gozetmenler.split(',') : []);
              const salonListesi = Array.isArray(s.salonlar) ? s.salonlar : (s.salonlar ? s.salonlar.split(',') : (s.RoomName ? [s.RoomName] : []));

              return (
                <div 
                  key={s.ExamID || s.id} 
                  className="p-4 border border-slate-100 rounded-xl bg-slate-50/40 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 transition hover:border-slate-200"
                >
                  <div className="space-y-1">
                    <div className="text-xs font-bold text-slate-800 tracking-tight">
                      <span className="text-indigo-600 font-mono mr-1.5">{s.CourseCode || s.dersKod}</span> 
                      {s.CourseName || s.dersAdi}
                    </div>
                    <div className="text-[11px] text-slate-400 font-medium flex items-center gap-3">
                      <span>🗓️ {temizTarih}</span>
                      <span className="text-slate-300">|</span>
                      <span>⏰ {s.SlotName || s.oturum}</span>
                      <span className="text-slate-300">|</span>
                      <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[10px]">{s.Semester || s.yariyil}. Yarıyıl</span>
                    </div>
                    <div className="text-[11px] text-slate-600 font-medium pt-1">
                      <span className="text-slate-400 font-semibold">👤 Gözetmenler:</span>{" "}
                      {gozetmenListesi.length > 0 ? (
                        <span className="text-slate-700">{gozetmenListesi.join(", ")}</span>
                      ) : (
                        <span className="text-rose-500 italic">Atanmadı (Havuz Kontrol Ediliyor)</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100">
                    <div className="text-[11px] font-bold text-indigo-700 bg-indigo-50/60 border border-indigo-100/70 px-2.5 py-1 rounded-lg">
                      📍 {salonListesi.length > 0 ? salonListesi.join(" + ") : "Salon Atanıyor..."}
                    </div>
                    
                    <button
                      onClick={() => onSinavSil(s.ExamID || s.id, s.CourseName || s.dersAdi, temizTarih)}
                      className="text-[10px] font-semibold bg-rose-50/60 hover:bg-rose-100 text-rose-600 border border-rose-100 px-2.5 py-1 rounded-lg transition print:hidden"
                    >
                      Sınavı İptal Et
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}