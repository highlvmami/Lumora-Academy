"use client";
import { useState } from 'react';

export default function DerslerTab({ dersler = [], onDersEkle, onDersSil }) {
  const [kod, setKod] = useState('');
  const [ad, setAd] = useState('');
  const [mevcut, setMevcut] = useState('');
  const [yariyil, setYariyil] = useState('');

  const [aramaMetni, setAramaMetni] = useState('');
  const [secilenFiltreYariyil, setSecilenFiltreYariyil] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!kod || !ad || !mevcut || !yariyil) return;
    
    // Veritabanı şemasındaki isimlendirmelere paralel parametreler gönderiliyor
    onDersEkle({ 
      courseCode: kod.trim(), 
      courseName: ad.trim(), 
      studentCount: parseInt(mevcut), 
      semester: parseInt(yariyil) 
    });
    
    setKod(''); 
    setAd(''); 
    setMevcut(''); 
    setYariyil('');
  };

  // Veritabanından gelen nesne özelliklerini (CourseName, CourseCode, Semester) güvenli şekilde filtrele
  const filtrelenmisDersler = dersler.filter((d) => {
    const dersAdi = d.CourseName || d.ad || '';
    const dersKodu = d.CourseCode || d.kod || '';
    const dersYariyil = d.Semester || d.yariyil || '';

    const aramaUyumlu = dersAdi.toLowerCase().includes(aramaMetni.toLowerCase()) || 
                        dersKodu.toLowerCase().includes(aramaMetni.toLowerCase());
                        
    const yariyilUyumlu = secilenFiltreYariyil === '' || dersYariyil.toString() === secilenFiltreYariyil;
    
    return aramaUyumlu && yariyilUyumlu;
  });

  return (
    <div className="space-y-6">
      {/* YENİ DERS EKLEME FORMU */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs print:hidden">
        <h2 className="text-xs font-bold text-slate-800 mb-4 flex items-center gap-2 uppercase tracking-wider">
          <span>📚</span> Yeni Ders Kaydet
        </h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <input 
            type="text" 
            placeholder="Ders Kodu (Örn: YZM 2102)" 
            value={kod} 
            onChange={(e) => setKod(e.target.value)} 
            className="border border-slate-200 p-2.5 rounded-xl bg-slate-50/50 text-slate-700 placeholder-slate-400 text-xs focus:outline-none focus:border-indigo-500 focus:bg-white transition"
            required 
          />
          <input 
            type="text" 
            placeholder="Ders Adı" 
            value={ad} 
            onChange={(e) => setAd(e.target.value)} 
            className="border border-slate-200 p-2.5 rounded-xl bg-slate-50/50 text-slate-700 placeholder-slate-400 text-xs focus:outline-none focus:border-indigo-500 focus:bg-white transition"
            required 
          />
          <input 
            type="number" 
            placeholder="Öğrenci Mevcudu" 
            value={mevcut} 
            onChange={(e) => setMevcut(e.target.value)} 
            className="border border-slate-200 p-2.5 rounded-xl bg-slate-50/50 text-slate-700 placeholder-slate-400 text-xs focus:outline-none focus:border-indigo-500 focus:bg-white transition"
            min="1" required 
          />
          <select 
            value={yariyil} 
            onChange={(e) => setYariyil(e.target.value)} 
            className="border border-slate-200 p-2.5 rounded-xl bg-slate-50/50 text-slate-600 text-xs focus:outline-none focus:border-indigo-500 focus:bg-white transition"
            required
          >
            <option value="">-- Yarıyıl Seç --</option>
            {[1, 2, 3, 4, 5, 6, 7, 8].map(y => <option key={y} value={y}>{y}. Yarıyıl</option>)}
          </select>
          
          <button type="submit" className="md:col-span-4 bg-indigo-600 hover:bg-indigo-700 text-white p-2.5 rounded-xl font-semibold transition text-xs shadow-xs active:scale-99">
            Dersi Havuza Ekle
          </button>
        </form>
      </div>

      {/* MÜFREDAT DERS HAVUZU KARTI */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-slate-50/30">
          <div>
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">📖 Müfredat Ders Havuzu</h2>
            <p className="text-xs text-slate-400 mt-1">Toplam {dersler.length} dersten {filtrelenmisDersler.length} adet listeleniyor</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-2 print:hidden">
            <input 
              type="text" 
              placeholder="Kod veya Ad ile ara..." 
              value={aramaMetni}
              onChange={(e) => setAramaMetni(e.target.value)}
              className="border border-slate-200 p-2 px-3 rounded-xl bg-white text-slate-700 text-xs w-44 focus:outline-none focus:border-indigo-500"
            />
            <select
              value={secilenFiltreYariyil}
              onChange={(e) => setSecilenFiltreYariyil(e.target.value)}
              className="border border-slate-200 p-2 rounded-xl bg-white text-slate-600 text-xs focus:outline-none focus:border-indigo-500"
            >
              <option value="">Tüm Yarıyıllar</option>
              {[1,2,3,4,5,6,7,8].map(y => <option key={y} value={y}>{y}. Yarıyıl</option>)}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-[10px] font-bold uppercase tracking-wider border-b border-slate-100">
                <th className="p-4 pl-6">Ders Kodu</th>
                <th className="p-4">Ders Adı</th>
                <th className="p-4 text-center">Yarıyıl</th>
                <th className="p-4 text-center">Öğrenci Sayısı</th>
                <th className="p-4 pr-6 text-right print:hidden">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-600">
              {filtrelenmisDersler.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-slate-400 italic">Ders havuzu henüz boş.</td>
                </tr>
              ) : (
                filtrelenmisDersler.map((d) => {
                  const dersId = d.CourseID || d.id;
                  const dKod = d.CourseCode || d.kod;
                  const dAd = d.CourseName || d.ad;
                  const dYariyil = d.Semester || d.yariyil;
                  const dMevcut = d.StudentCount || d.mevcut;

                  return (
                    <tr key={dersId} className="hover:bg-slate-50/50 transition">
                      <td className="p-4 pl-6 font-mono font-bold text-indigo-600">{dKod}</td>
                      <td className="p-4 font-semibold text-slate-700">{dAd}</td>
                      <td className="p-4 text-center">
                        <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md text-[10px] font-medium">{dYariyil}. YYY</span>
                      </td>
                      <td className="p-4 text-center font-medium text-slate-700">{dMevcut}</td>
                      <td className="p-4 pr-6 text-right print:hidden">
                        <button 
                          onClick={() => onDersSil(dersId, dKod, dAd)}
                          className="text-[10px] font-semibold text-red-500 bg-red-50 hover:bg-red-100/80 border border-red-100 px-2 py-1 rounded-lg transition"
                        >
                          Sil
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}