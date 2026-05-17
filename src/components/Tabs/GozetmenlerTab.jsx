"use client";
import { useState } from 'react';

// Yeni parametreler: Seçim kutularını dinamik beslemek için 'bolumler' ve 'zamanDilimleri' eklendi.
export default function GozetmenlerTab({ 
  gozetmenler = [], 
  bolumler = [], 
  zamanDilimleri = [], 
  onGozetmenEkle, 
  onMazeretSil, 
  onGozetmenSil 
}) {
  const [unvan, setUnvan] = useState('');
  const [ad, setAd] = useState('');
  const [soyad, setSoyad] = useState('');
  const [bolumId, setBolumId] = useState('');
  
  // Mazeret Alanları
  const [mazeretTarih, setMazeretTarih] = useState('');
  const [mazeretSlotId, setMazeretSlotId] = useState('');
  const [mazeretTuru, setMazeretTuru] = useState('Mazeret');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!ad.trim() || !soyad.trim() || !bolumId) return;
    
    // İlişkisel veritabanı şemasına uygun parametre yapısı gönderiliyor
    onGozetmenEkle({
      title: unvan,
      firstName: ad,
      lastName: soyad,
      departmentId: parseInt(bolumId),
      // Eğer mazeret tarihi seçildiyse mazeret verileri de gönderiliyor
      excuseDate: mazeretTarih || null,
      slotId: mazeretSlotId ? parseInt(mazeretSlotId) : null,
      excuseType: mazeretTarih ? mazeretTuru : null
    });

    // Formu temizle
    setUnvan('');
    setAd('');
    setSoyad('');
    setBolumId('');
    setMazeretTarih('');
    setMazeretSlotId('');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* FORM ALANI (%30 PANEL YAPISI) */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs h-fit">
        <h2 className="text-xs font-bold text-slate-800 mb-4 uppercase tracking-wider flex items-center gap-2">
          <span>👤</span> Gözetmen / Mazeret Kaydı
        </h2>
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* UNVAN SEÇİMİ */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">
              Unvan
            </label>
            <select
              value={unvan}
              onChange={(e) => setUnvan(e.target.value)}
              className="w-full border border-slate-200 p-2 rounded-xl bg-slate-50/50 text-slate-700 text-xs focus:outline-none focus:border-indigo-500"
              required
            >
              <option value="">-- Unvan Seçiniz --</option>
              <option value="Prof. Dr.">Prof. Dr.</option>
              <option value="Doç. Dr.">Doç. Dr.</option>
              <option value="Dr. Öğr. Üyesi">Dr. Öğr. Üyesi</option>
              <option value="Arş. Gör.">Arş. Gör.</option>
              <option value="Öğr. Gör.">Öğr. Gör.</option>
            </select>
          </div>

          {/* AD VE SOYAD (AYRI ALANLAR - 3NF UYUMU) */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">
                Ad
              </label>
              <input
                type="text"
                value={ad}
                onChange={(e) => setAd(e.target.value)}
                placeholder="Örn: Can"
                className="w-full border border-slate-200 p-2 rounded-xl bg-slate-50/50 text-slate-700 text-xs focus:outline-none focus:border-indigo-500"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">
                Soyad
              </label>
              <input
                type="text"
                value={soyad}
                onChange={(e) => setSoyad(e.target.value)}
                placeholder="Örn: Yılmaz"
                className="w-full border border-slate-200 p-2 rounded-xl bg-slate-50/50 text-slate-700 text-xs focus:outline-none focus:border-indigo-500"
                required
              />
            </div>
          </div>

          {/* BAĞLI OLDUĞU BÖLÜM (HAVUZ SİSTEMİ İÇİN KRİTİK) */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">
              Bağlı Olduğu Bölüm
            </label>
            <select
              value={bolumId}
              onChange={(e) => setBolumId(e.target.value)}
              className="w-full border border-slate-200 p-2 rounded-xl bg-slate-50/50 text-slate-700 text-xs focus:outline-none focus:border-indigo-500"
              required
            >
              <option value="">-- Bölüm Seçiniz --</option>
              {bolumler.map((b) => (
                <option key={b.DepartmentID} value={b.DepartmentID}>{b.DepartmentName}</option>
              ))}
            </select>
          </div>

          <div className="border-t border-dashed border-slate-100 my-2 pt-2">
            <span className="text-[10px] font-bold text-indigo-600 block mb-2">🛡️ İlk Mazeret Tanımı (Opsiyonel)</span>
            
            {/* MAZERET TARİHİ */}
            <div className="space-y-2">
              <input
                type="date"
                value={mazeretTarih}
                onChange={(e) => setMazeretTarih(e.target.value)}
                className="w-full border border-slate-200 p-2 rounded-xl bg-slate-50/50 text-slate-600 text-xs focus:outline-none focus:border-indigo-500"
              />

              {/* MAZERET SLOTU */}
              <select
                value={mazeretSlotId}
                onChange={(e) => setMazeretSlotId(e.target.value)}
                className="w-full border border-slate-200 p-2 rounded-xl bg-slate-50/50 text-slate-700 text-xs focus:outline-none focus:border-indigo-500"
                required={!!mazeretTarih} // Tarih seçildiyse zorunlu
              >
                <option value="">-- Mazeretli Oturum (Slot) --</option>
                {zamanDilimleri.map((ts) => (
                  <option key={ts.SlotID} value={ts.SlotID}>{ts.SlotName}</option>
                ))}
              </select>

              {/* MAZERET TÜRÜ */}
              <select
                value={mazeretTuru}
                onChange={(e) => setMazeretTuru(e.target.value)}
                className="w-full border border-slate-200 p-2 rounded-xl bg-slate-50/50 text-slate-700 text-xs focus:outline-none focus:border-indigo-500"
              >
                <option value="Mazeret">Mazeret</option>
                <option value="İzinli">İzinli</option>
                <option value="Danışmanlık Saati">Danışmanlık Saati</option>
              </select>
            </div>
          </div>
          
          <button 
            type="submit" 
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white p-2.5 rounded-xl font-semibold text-xs shadow-xs transition active:scale-99"
          >
            Gözetmeni Havuza Kaydet
          </button>
        </form>
      </div>

      {/* LİSTE ALANI (%30 PANEL YAPISI) */}
      <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <h2 className="text-xs font-bold text-slate-800 mb-4 uppercase tracking-wider flex items-center gap-2">
          <span>📋</span> Aktif Akademisyen & Mazeret Havuzu
        </h2>
        <div className="space-y-3">
          {gozetmenler.length === 0 ? (
            <div className="text-center p-8 text-slate-400 text-xs italic">
              Gözetmen havuzu henüz boş. Yukarıdaki formdan ekleme yapabilirsiniz.
            </div>
          ) : (
            gozetmenler.map((g) => {
              // SQL'den gelen veriye göre unvan ad soyad birleştirmesi
              const tamAd = g.FullName || `${g.Title} ${g.FirstName} ${g.LastName}`;
              const personelId = g.PersonnelID || g.id;

              // Mazeretleri güvenli bir şekilde listeleme (Dizi veya virgüllü string kontrolü)
              const mazeretListesi = Array.isArray(g.mazeretler) 
                ? g.mazeretler 
                : (g.mazeretler ? g.mazeretler.split(',') : []);

              return (
                <div key={personelId} className="p-4 border border-slate-100 rounded-xl bg-slate-50/40 flex justify-between items-center transition hover:border-slate-200">
                  <div>
                    <div className="text-xs font-bold text-slate-700">
                      {tamAd} 
                      <span className="ml-2 bg-slate-100 text-slate-500 font-normal px-2 py-0.5 rounded text-[10px]">
                        {g.DepartmentName || g.bolumAdi}
                      </span>
                    </div>
                    
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {mazeretListesi.length > 0 ? (
                        mazeretListesi.map((mStr, i) => {
                          // Mazeret verisi 'Tarih - SlotName (MazeretTuru)' formatında gelecektir.
                          return (
                            <div key={i} className="flex items-center gap-1.5 bg-rose-50/60 text-rose-700 border border-rose-100/70 text-[10px] font-medium px-2 py-0.5 rounded-md">
                              <span>🛡️ {mStr}</span>
                              <button 
                                type="button" 
                                onClick={() => onMazeretSil(personelId, mStr)} 
                                className="text-rose-400 font-bold ml-1 hover:text-rose-700 transition"
                                title="Mazereti Kaldır"
                              >
                                ✕
                              </button>
                            </div>
                          );
                        })
                      ) : (
                        <span className="text-[10px] text-emerald-700 bg-emerald-50/60 border border-emerald-100/70 px-2 py-0.5 rounded-md font-medium">
                          ✓ Tüm Oturumlara Müsait
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* 🗑️ PERSONEL SİLME BUTONU */}
                  <button 
                    onClick={() => onGozetmenSil(personelId, tamAd)} 
                    className="text-slate-400 hover:text-red-500 bg-slate-100 hover:bg-red-50 border border-slate-200/60 hover:border-red-100 px-3 py-1.5 rounded-lg text-[10px] font-semibold transition"
                  >
                    Kaldır
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}