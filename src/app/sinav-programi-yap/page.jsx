'use client';
import { useState, useEffect } from 'react';

export default function SinavProgramiYap() {
  const [courses, setCourses] = useState([]);
  const [timeslots, setTimeslots] = useState([]);
  
  // Form State'leri
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSlot, setSelectedSlot] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Sayfa yüklendiğinde dersleri ve oturum slotlarını çekelim
  useEffect(() => {
    fetch('/api/dersler')
      .then(res => res.json())
      .then(data => {
        console.log("Gelen Dersler:", data);
        setCourses(data || []);
      })
      .catch(err => console.error("Ders yükleme hatası:", err));

    fetch('/api/oturumlar')
      .then(res => res.json())
      .then(data => {
        console.log("Gelen Oturumlar:", data);
        setTimeslots(data || []);
      })
      .catch(err => console.error("Slot yükleme hatası:", err));
  }, []);

  // 🧠 Akıllı Planlama ve Atama Akışı
  const handlePlanla = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      if (!selectedCourse || !selectedDate || !selectedSlot) {
        throw new Error('Lütfen tüm alanları eksiksiz doldurunuz.');
      }

      const parsedCourseId = parseInt(selectedCourse, 10);
      const parsedSlotId = parseInt(selectedSlot, 10);

      // 🚨 KRİTİK DEĞİŞİKLİK: Sınav API'sinin hem küçük harfli hem büyük harfli parametre 
      // araması ihtimaline karşı gövdeyi (body) her iki varyasyonla da besliyoruz!
      const response = await fetch('/api/sinavlar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId: parsedCourseId,
          CourseID: parsedCourseId, // Büyük harf alternatifi
          tarih: selectedDate,
          examDate: selectedDate,   // Olası değişken alternatifi
          slotId: parsedSlotId,
          SlotID: parsedSlotId      // Büyük harf alternatifi
        })
      });

      const examData = await response.json();

      if (!response.ok) {
        throw new Error(examData.error || 'Sınav planlaması başarısız oldu.');
      }

      setMessage({
        type: 'success',
        text: `🎉 Başarılı! ${examData.detay?.dersAdi || 'Seçilen ders'} için sınav planı başarıyla kuruldu.`
      });

      // Formu temizle
      setSelectedCourse('');
      setSelectedDate('');
      setSelectedSlot('');

    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto bg-white rounded-xl shadow-sm space-y-6 border border-gray-100">
      
      <div className="border-b pb-4">
        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          ⚡ AKILLI SINAV PLANLAMA
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Dönem çakışmalarını kontrol eder, salon kapasitelerini optimize eder ve gözetmenleri adil yük dağılımına göre atar.
        </p>
      </div>
      
      {message.text && (
        <div className={`p-4 rounded-lg text-sm font-medium transition-all ${
          message.type === 'success' 
            ? 'bg-green-50 text-green-800 border border-green-200' 
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handlePlanla} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
        
        {/* 1. Ders Seçimi */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider">Planlanacak Ders</label>
          <select 
            value={selectedCourse} 
            onChange={(e) => setSelectedCourse(e.target.value)}
            className="block w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg text-gray-700 text-sm focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
            required
          >
            <option value="">-- Ders Seçiniz --</option>
            {courses.map(c => {
              const id = c.CourseID || c.id;
              const kod = c.CourseCode || c.kod || '';
              const ad = c.CourseName || c.ad || '';
              const mevcut = c.StudentCount || c.mevcut || 0;
              return (
                <option key={id} value={id}>
                  {kod} - {ad} ({mevcut} Kişi)
                </option>
              );
            })}
          </select>
        </div>

        {/* 2. Tarih Seçimi */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider">Sınav Tarihi</label>
          <input 
            type="date" 
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="block w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg text-gray-700 text-sm focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
            required
          />
        </div>

        {/* 3. Oturum/Slot Seçimi */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider">Sınav Oturumu (Slot)</label>
          <select 
            value={selectedSlot} 
            onChange={(e) => setSelectedSlot(e.target.value)}
            className="block w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg text-gray-700 text-sm focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
            required
          >
            <option value="">-- Oturum Seçiniz --</option>
            {timeslots.map(t => {
              const id = t.SlotID || t.id;
              const name = t.SlotName || t.name || `Slot ${id}`;
              return (
                <option key={id} value={id}>
                  {name}
                </option>
              );
            })}
          </select>
        </div>

        <div className="md:col-span-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className={`w-full p-3 text-white font-bold rounded-lg tracking-wide shadow-sm text-sm transition-all ${
              loading 
                ? 'bg-gray-400 cursor-not-allowed animate-pulse' 
                : 'bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99]'
            }`}
          >
            {loading ? '⚙️ Algoritma Çalışıyor...' : 'Sınavı Algoritmaya Gönder (Otomatik Ata)'}
          </button>
        </div>
      </form>
    </div>
  );
}