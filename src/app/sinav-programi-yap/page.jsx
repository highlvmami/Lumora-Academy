'use client';
import { useState, useEffect } from 'react';

export default function SinavProgramiYap() {
  const [courses, setCourses] = useState([]);
  const [timeslots, setTimeslots] = useState([]);
  const [exams, setExams] = useState([]); 
  
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSlot, setSelectedSlot] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [activeTab, setActiveTab] = useState('calendar'); 

  const fetchSistemVerileri = async () => {
    try {
      // Senin orijinal endpoint yapılarına dokunulmadı, db verilerin aynen gelecek
      const [dersRes, oturumRes, sinavRes] = await Promise.all([
        fetch('/api/dersler').then(res => res.json()),
        fetch('/api/oturumlar').then(res => res.json()),
        fetch('/api/sinavlar-v2').then(res => res.json()) 
      ]);
      
      setCourses(dersRes || []);
      setTimeslots(oturumRes || []);
      setExams(sinavRes || []);
    } catch (err) {
      console.error("Sistem verileri yüklenirken hata oluştu:", err);
    }
  };

  useEffect(() => {
    fetchSistemVerileri();
  }, []);

 const handlePlanla = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    // 1. ADIM: AYNI DERS VE AYNI GÜN KONTROLÜ
    // exams listesinde, seçilen ders (selectedCourse) ve seçilen tarih (selectedDate) 
    // daha önce eklenmiş mi kontrol ediyoruz.
    const dersAyniGunPlanliMi = exams.some(exam => {
      // Veritabanından gelen tarih genellikle 'YYYY-MM-DD' formatındadır, 
      // eğer farklıysa burada formatı eşitlemen gerekebilir.
      return String(exam.courseId) === String(selectedCourse) && exam.tarih === selectedDate;
    });

    if (dersAyniGunPlanliMi) {
      setLoading(false);
      // Kullanıcıya istediğin mesajı gösteriyoruz
      setMessage({ 
        type: 'error', 
        text: '⚠️ Lütfen başka bir tarih seçiniz! Bu dersin sınavı seçtiğiniz günde zaten planlanmış.' 
      });
      return; // İşlemi durduruyoruz, backend'e gitmesine gerek kalmıyor
    }

    try {
      if (!selectedCourse || !selectedDate || !selectedSlot) {
        throw new Error('Lütfen formdaki tüm alanları doldurunuz.');
      }

      const bodyData = {
        courseId: parseInt(selectedCourse, 10),
        tarih: selectedDate,
        slotId: parseInt(selectedSlot, 10)
      };

      const response = await fetch('/api/sinavlar-v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyData)
      });

      const resData = await response.json();

      if (!response.ok) {
        throw new Error(resData.error || 'Planlama sırasında bir hata oluştu.');
      }

      setMessage({ 
        type: 'success', 
        text: `🎉 Başarılı! Sınav programı akıllı algoritma tarafından başarıyla oluşturuldu.` 
      });
      
      setSelectedCourse('');
      setSelectedDate('');
      setSelectedSlot('');
      fetchSistemVerileri(); // Listeyi güncelle

    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };
  const handleSil = async (id) => {
    if (!confirm('Bu sınav programını ve bağlı tüm gözetmen/salon atamalarını iptal etmek istediğinize emin misiniz?')) return;
    
    try {
      const response = await fetch(`/api/sinavlar-v2?id=${id}`, { method: 'DELETE' });
      const resData = await response.json();
      
      if (!response.ok) throw new Error(resData.error || 'Silme işlemi başarısız.');
      
      setMessage({ type: 'success', text: '🗑️ Sınav planı başarıyla iptal edildi.' });
      fetchSistemVerileri();
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    }
  };

  const benzersizTarihler = [...new Set(exams.map(e => e.tarih))].sort();

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8 bg-gray-50 min-h-screen">
      
      {/* 1. ÜST PANEL: AKILLI SINAV PLANLAMA FORMU */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-6">
        <div className="border-b pb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <span className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-sm">⚡</span>
            AKILLI SINAV PLANLAMA MODÜLÜ
          </h2>
        </div>

        {/* BİLDİRİM PANELİ */}
        {message.text && (
          <div className={`p-4 rounded-xl text-sm font-semibold flex items-center gap-2 border transition-all animate-fadeIn ${
            message.type === 'success' 
              ? 'bg-green-50 text-green-800 border-green-200' 
              : 'bg-red-50 text-red-800 border-red-200 shadow-sm'
          }`}>
            <span>{message.type === 'success' ? '✅' : '⚠️'}</span>
            <p>{message.text}</p>
          </div>
        )}

        <form onSubmit={handlePlanla} className="grid grid-cols-1 md:grid-cols-3 gap-5 items-end">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Planlanacak Ders</label>
            <select 
              value={selectedCourse} 
              onChange={(e) => setSelectedCourse(e.target.value)}
              className="block w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-gray-700"
              required
            >
              <option value="">-- Ders Seçiniz --</option>
              {courses.map(c => {
                const id = c.CourseID || c.id;
                return (
                  <option key={id} value={id}>
                    {c.CourseCode || c.kod} - {c.CourseName || c.ad} ({c.StudentCount || c.mevcut || 0} Öğrenci)
                  </option>
                );
              })}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Sınav Tarihi</label>
            <input 
              type="date" 
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="block w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-gray-700"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Sınav Oturumu</label>
            <select 
              value={selectedSlot} 
              onChange={(e) => setSelectedSlot(e.target.value)}
              className="block w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-gray-700"
              required
            >
              <option value="">-- Oturum Seçiniz --</option>
              {timeslots.map(t => {
                const id = t.SlotID || t.id;
                return (
                  <option key={id} value={id}>
                    {t.SlotName || t.name || `Oturum ${id}`}
                  </option>
                );
              })}
            </select>
          </div>

          <div className="md:col-span-3 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full p-3.5 text-white font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] disabled:bg-gray-300 disabled:scale-100 transition-all text-sm shadow-sm shadow-indigo-100 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full"></span>
                  Kapasite, Kat ve Gözetmen Optimizasyonu Yapılıyor...
                </>
              ) : 'Sınavı Algoritmaya Gönder (Otomatik Ata)'}
            </button>
          </div>
        </form>
      </div>

      {/* 2. ALT PANEL: TAKVİM VE LİSTELEME EKRANI */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-gray-800">🗓️ PLANLANAN SINAV TAKVİMİ</h3>
            <p className="text-xs text-gray-500 mt-0.5">Sistemde toplam {exams.length} aktif sınav planı kurulu.</p>
          </div>
          
          <div className="flex bg-gray-200/60 p-1 rounded-xl self-start sm:self-center">
            <button 
              onClick={() => setActiveTab('calendar')}
              className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all ${activeTab === 'calendar' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
            >
              Matris Takvim Görünümü
            </button>
            <button 
              onClick={() => setActiveTab('list')}
              className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all ${activeTab === 'list' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
            >
              Kompakt Kart Listesi
            </button>
          </div>
        </div>

        <div className="p-6">
          {exams.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-gray-100 rounded-xl">
              <span className="text-3xl">📭</span>
              <p className="text-sm text-gray-400 mt-2 font-medium">Henüz planlanmış bir sınav bulunmuyor.</p>
            </div>
          ) : activeTab === 'calendar' ? (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-100 rounded-xl overflow-hidden">
                <thead>
                  <tr className="bg-gray-50/70">
                    <th className="border border-gray-100 p-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider bg-gray-100/40 w-44">
                      Sınav Dönemleri / Tarih
                    </th>
                    {timeslots.map(slot => (
                      <th key={slot.SlotID} className="border border-gray-100 p-4 text-center text-xs font-bold text-gray-600 min-w-[200px]">
                        <div className="text-indigo-600 font-extrabold">{slot.SlotName ? slot.SlotName.split(' ')[0] : ''}</div>
                        <div className="text-[10px] text-gray-400 font-normal mt-0.5">
                          {slot.SlotName ? (slot.SlotName.match(/\(([^)]+)\)/)?.[0] || '') : ''}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {benzersizTarihler.map(tarih => {
                    const fTarih = new Date(tarih).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
                    const gunAdi = new Date(tarih).toLocaleDateString('tr-TR', { weekday: 'long' });

                    return (
                      <tr key={tarih} className="hover:bg-gray-50/40 transition-colors">
                        <td className="border border-gray-100 p-4 font-semibold text-sm text-gray-700 bg-gray-50/30">
                          <div className="text-gray-900">{fTarih}</div>
                          <div className="text-xs text-gray-400 font-normal">{gunAdi}</div>
                        </td>

                        {timeslots.map(slot => {
                          const oOturumdakiSinavlar = exams.filter(e => e.tarih === tarih && parseInt(e.oturum || e.SlotID, 10) === slot.SlotID);

                          return (
                            <td key={slot.SlotID} className="border border-gray-100 p-3 bg-white relative min-h-[120px]">
                              {oOturumdakiSinavlar.map(sinav => (
                                <div key={sinav.id} className="group relative bg-gradient-to-br from-indigo-50/70 to-indigo-100/40 p-3 rounded-xl border border-indigo-100/80 space-y-2 text-xs shadow-sm hover:shadow transition-all mb-2">
                                  <button 
                                    onClick={() => handleSil(sinav.id)}
                                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 font-bold transition-all text-sm p-0.5 rounded-md hover:bg-red-50"
                                    title="Sınavı İptal Et"
                                  >
                                    ✕
                                  </button>
                                  <div className="font-bold text-gray-800 pr-4 leading-tight">
                                    <span className="text-indigo-700">{sinav.dersKod}</span> - {sinav.dersAdi}
                                  </div>
                                  <div className="flex flex-wrap gap-1">
                                    <span className="bg-white/80 border border-gray-200 px-1.5 py-0.5 rounded text-[10px] font-medium text-gray-500">
                                      {sinav.yariyil}. Yarıyıl
                                    </span>
                                  </div>
                                  <div className="space-y-0.5 pt-1 border-t border-indigo-200/30">
                                    <div className="text-[10px] uppercase font-bold text-indigo-500/80 tracking-wider">📍 Salonlar</div>
                                    <div className="font-medium text-gray-700 text-[11px] leading-relaxed">
                                      {sinav.salonlar ? sinav.salonlar.join(', ') : 'Atanmadı'}
                                    </div>
                                  </div>
                                  <div className="space-y-0.5">
                                    <div className="text-[10px] uppercase font-bold text-emerald-600/80 tracking-wider">👤 Gözetmenler</div>
                                    <div className="font-medium text-gray-600 text-[11px] leading-relaxed">
                                      {sinav.gozetmenler ? sinav.gozetmenler.join(', ') : 'Atanmadı'}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {exams.map(sinav => {
                const sTarih = sinav.tarih ? new Date(sinav.tarih).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';
                const oAd = timeslots.find(t => t.SlotID === parseInt(sinav.oturum || sinav.SlotID, 10))?.SlotName || `Oturum ${sinav.oturum}`;

                return (
                  <div key={sinav.id} className="p-4 bg-white border border-gray-150 rounded-xl hover:border-indigo-200 transition-all space-y-3 relative group">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-sm text-gray-800">
                          <span className="text-indigo-600">{sinav.dersKod}</span> {sinav.dersAdi}
                        </h4>
                        <div className="flex gap-2 items-center mt-1 text-xs text-gray-400">
                          <span>📅 {sTarih}</span>
                          <span>•</span>
                          <span>⏰ {oAd}</span>
                          <span>•</span>
                          <span className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded text-[10px] font-medium">{sinav.yariyil}. Yarıyıl</span>
                        </div>
                      </div>
                      <button 
                        onClick={() => handleSil(sinav.id)}
                        className="text-xs font-bold text-red-500 hover:bg-red-50 px-2 py-1 rounded-lg transition-colors border border-transparent hover:border-red-100"
                      >
                        Sınavı İptal Et
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-50 text-xs">
                      <div className="bg-gray-50 p-2 rounded-lg">
                        <span className="block text-[10px] font-bold text-gray-400 uppercase">📍 Atanan Salonlar</span>
                        <span className="font-semibold text-gray-700 mt-0.5 block">{sinav.salonlar ? sinav.salonlar.join(', ') : '—'}</span>
                      </div>
                      <div className="bg-gray-50 p-2 rounded-lg">
                        <span className="block text-[10px] font-bold text-gray-400 uppercase">👤 Görevli Gözetmenler</span>
                        <span className="font-semibold text-gray-600 mt-0.5 block">{sinav.gozetmenler ? sinav.gozetmenler.join(', ') : '—'}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}