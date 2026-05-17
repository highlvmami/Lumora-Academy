"use client";
import { useState, useEffect, useCallback } from 'react';

import Sidebar from '../components/Sidebar';
import StatsPanel from '../components/StatsPanel';
import DerslerTab from '../components/Tabs/DerslerTab';
import GozetmenlerTab from '../components/Tabs/GozetmenlerTab';
import TakvimTab from '../components/Tabs/TakvimTab';
import BacklogTab from '../components/Tabs/BacklogTab';

export default function Home() {
  const [activeTab, setActiveTab] = useState('dersler');
  const [mesaj, setMesaj] = useState({ tip: '', icerik: '' });

  // ☁️ LumoraAcademyDB Uyumlu Dinamik State Yönetimleri
  const [dersler, setDersler] = useState([]);
  const [derslikler, setDerslikler] = useState([]);
  const [gozetmenler, setGozetmenler] = useState([]);
  const [mevcutSinavlar, setMevcutSinavlar] = useState([]);
  const [backloglar, setBackloglar] = useState([]);
  
  // Seçim kutularını besleyecek yardımcı ilişkisel stateler
  const [bolumler, setBolumler] = useState([]);
  const [zamanDilimleri, setZamanDilimleri] = useState([]);
  
  const [yukleniyor, setYukleniyor] = useState(true);

  // 📝 BACKLOG SİSTEMİNE LOG KAYDETME
  const logEkle = async (logType, description) => {
    try {
      await fetch('/api/backlog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logType, description })
      });
    } catch (error) {
      console.error("Backlog hatası:", error);
    }
  };

  // ☁️ TÜM İLİŞKİSEL VERİLERİN SENKRONİZASYONU
  const verileriYukle = useCallback(async () => {
    setYukleniyor(true);
    try {
      // 1. Dersleri Çek (Courses)
      const dersRes = await fetch('/api/dersler');
      if (dersRes.ok) setDersler(await dersRes.json());

      // 2. Derslikleri Çek (Classrooms)
      const derslikRes = await fetch('/api/derslikler');
      if (derslikRes.ok) setDerslikler(await derslikRes.json());

      // 3. Gözetmenleri Çek (Personnel & Excuses)
      const gozetmenRes = await fetch('/api/gozetmenler');
      if (gozetmenRes.ok) setGozetmenler(await gozetmenRes.json());

      // 4. Planlanan Sınavları Çek (Exams & Assignments)
      const sinavRes = await fetch('/api/sinavlar');
      if (sinavRes.ok) setMevcutSinavlar(await sinavRes.json());

      // 5. İşlem Günlüğünü Çek (SystemLog)
      const backlogRes = await fetch('/api/backlog');
      if (backlogRes.ok) setBackloglar(await backlogRes.json());

      // 6. Formlar için Bölüm ve Zaman Dilimlerini Çek (Departments & TimeSlots)
      const bolumRes = await fetch('/api/bolumler');
      if (bolumRes.ok) setBolumler(await bolumRes.json());

      const slotRes = await fetch('/api/slots');
      if (slotRes.ok) setZamanDilimleri(await slotRes.json());

    } catch (error) {
      console.error("Veri yükleme hatası:", error);
      setMesaj({ tip: 'hata', icerik: 'Sistem verileri ilişkisel SQL veritabanından senkronize edilemedi!' });
    } finally {
      setYukleniyor(false);
    }
  }, []);

  useEffect(() => {
    verileriYukle();
  }, [verileriYukle]);

  // 📚 YENİ DERS EKLEME AKSİYONU
  const handleDersEkle = async ({ courseCode, courseName, studentCount, semester }) => {
    try {
      const res = await fetch('/api/dersler', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseCode, courseName, studentCount, semester })
      });

      if (!res.ok) throw new Error('Ders eklenemedi');

      await logEkle("DERS_EKLE", `${courseCode.toUpperCase()} - ${courseName} ders havuzuna başarıyla kaydedildi.`);
      setMesaj({ tip: 'basari', icerik: `Ders başarıyla SQL Server'a kaydedildi.` });
      verileriYukle();
    } catch (error) {
      console.error(error);
      setMesaj({ tip: 'hata', icerik: 'Ders eklenirken bir hata oluştu!' });
    }
  };

  // 🗑️ DERS SİLME AKSİYONU
  const handleDersSil = async (courseId, courseCode, courseName) => {
    if (!window.confirm(`🚨 ${courseCode} - ${courseName} dersini silmek istediğinize emin misiniz?`)) return;
    try {
      const res = await fetch(`/api/dersler?id=${courseId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Ders silinemedi');

      await logEkle("DERS_SIL", `${courseCode} kodlu ders ve bağlı tüm veriler havuzdan kaldırıldı.`);
      setMesaj({ tip: 'basari', icerik: `Ders başarıyla veritabanından kaldırıldı.` });
      verileriYukle();
    } catch (error) {
      console.error(error);
      setMesaj({ tip: 'hata', icerik: 'Ders silinirken bir hata oluştu!' });
    }
  };

  // 👤 GÖZETMEN EKLEME / MAZERET GÜNCELLEME AKSİYONU
  const handleGozetmenEkle = async (personnelData) => {
    const { title, firstName, lastName, departmentId, excuseDate, slotId, excuseType } = personnelData;
    
    // Aynı isimde bir personelin zaten mevcut olup olmadığını kontrol et
    const mevcutGozetmen = gozetmenler.find(g => 
      (g.FirstName || '').toLowerCase().trim() === firstName.toLowerCase().trim() &&
      (g.LastName || '').toLowerCase().trim() === lastName.toLowerCase().trim()
    );

    try {
      if (mevcutGozetmen) {
        const pId = mevcutGozetmen.PersonnelID || mevcutGozetmen.id;
        // Eğer personelin kaydı varsa ve mazeret tarihi girildiyse yeni mazeret ekle
        if (excuseDate && slotId) {
          const res = await fetch('/api/gozetmenler/mazeret', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ personnelId: pId, excuseDate, slotId, excuseType })
          });
          if (!res.ok) throw new Error('Mazeret eklenemedi');

          const tamAd = `${mevcutGozetmen.Title} ${mevcutGozetmen.FirstName} ${mevcutGozetmen.LastName}`;
          await logEkle("MAZERET_EKLE", `${tamAd} için ${excuseDate} tarihine mazeret tanımlandı.`);
          setMesaj({ tip: 'basari', icerik: `Akademisyene yeni mazeret kaydı başarıyla işlendi.` });
        } else {
          setMesaj({ tip: 'hata', icerik: `Bu akademisyen sistemde zaten kayıtlı!` });
          return;
        }
      } else {
        // Tamamen yeni gözetmen (Personnel) ekleme
        const res = await fetch('/api/gozetmenler', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(personnelData)
        });
        if (!res.ok) throw new Error('Gözetmen eklenemedi');

        await logEkle("GOZETMEN_EKLE", `${title} ${firstName} ${lastName} personel havuzuna kaydedildi.`);
        setMesaj({ tip: 'basari', icerik: `Yeni gözetmen profili ve mazeret verisi sisteme işlendi.` });
      }
      verileriYukle();
    } catch (error) {
      console.error(error);
      setMesaj({ tip: 'hata', icerik: 'Gözetmen kaydı işlenirken hata oluştu!' });
    }
  };

  // ❌ MAZERET SİLME AKSİYONU
  const handleMazeretSil = async (personnelId, mazeretMetni) => {
    if (!window.confirm(`Mazeret kaydı kaldırılsın mı?\n(${mazeretMetni})`)) return;
    try {
      // Mazeret string'inden tarihi parse etme veya doğrudan ID bazlı silme
      const res = await fetch(`/api/gozetmenler/mazeret?personnelId=${personnelId}&text=${encodeURIComponent(mazeretMetni)}`, { 
        method: 'DELETE' 
      });
      if (!res.ok) throw new Error('Mazeret silinemedi');

      await logEkle("MAZERET_SIL", `ID: ${personnelId} olan personelin bir mazeret kaydı silindi.`);
      setMesaj({ tip: 'basari', icerik: `Mazeret kaydı personelin takviminden temizlendi.` });
      verileriYukle();
    } catch (error) {
      console.error(error);
      setMesaj({ tip: 'hata', icerik: 'Mazeret kaydı silinemedi!' });
    }
  };

  // 🗑️ GÖZETMEN SİLME AKSİYONU
  const handleGozetmenSil = async (personnelId, tamAd) => {
    if (!window.confirm(`${tamAd} profilini kalıcı olarak silmek istediğinize emin misiniz?`)) return;
    try {
      const res = await fetch(`/api/gozetmenler?id=${personnelId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Gözetmen silinemedi');

      await logEkle("GOZETMEN_SIL", `${tamAd} sistem havuzundan tamamen silindi.`);
      setMesaj({ tip: 'basari', icerik: `Gözetmen profili veritabanından kaldırıldı.` });
      verileriYukle();
    } catch (error) {
      console.error(error);
      setMesaj({ tip: 'hata', icerik: 'Silme işlemi veritabanı kısıtlamaları nedeniyle gerçekleştirilemedi!' });
    }
  };

  // 🗑️ SINAV PLANINI PROGRAMDAN SİLME AKSİYONU
  const handleSinavSil = async (examId, courseName, dateText) => {
    if (!window.confirm(`🚨 ${courseName} dersinin sınav programı iptal edilsin mi?`)) return;
    try {
      const res = await fetch(`/api/sinavlar?id=${examId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Sınav planı silinemedi');

      await logEkle("SINAV_SIL", `${courseName} dersinin sınav kaydı (ID: ${examId}) sistemden temizlendi.`);
      setMesaj({ tip: 'basari', icerik: `Sınav planı ve tüm bağlı gözetmen görevlendirmeleri iptal edildi.` });
      verileriYukle();
    } catch (error) {
      console.error(error);
      setMesaj({ tip: 'hata', icerik: 'Sınav programı iptal edilirken hata oluştu!' });
    }
  };

  // 🚀 AKILLI VE GÜVENLİ SINAV PLANLAMA ALGORİTMASI (LumoraAcademyDB Entegrasyonlu)
  const handleSinavPlanla = async ({ secilenDers, secilenTarih, secilenOturum }) => {
    setMesaj({ tip: '', icerik: '' });
    
    const dersBilgi = dersler.find(d => Number(d.CourseID || d.id) === Number(secilenDers));
    if (!dersBilgi) {
      alert("Hata: Seçilen ders bilgisi veritabanında bulunamadı.");
      return;
    }

    const dId = dersBilgi.CourseID || dersBilgi.id;
    const dYariyil = dersBilgi.Semester || dersBilgi.yariyil;
    const dMevcut = dersBilgi.StudentCount || dersBilgi.mevcut;
    const dKod = dersBilgi.CourseCode || dersBilgi.kod;

    // 1. Çakışma Kontrolü (Aynı yarıyıldaki derslerin sınavı aynı gün/saat slotunda olamaz)
    const cakismaVarMi = mevcutSinavlar.some(s => 
      s.ExamDate === secilenTarih && 
      Number(s.SlotID) === Number(secilenOturum) && 
      Number(s.Semester) === Number(dYariyil)
    );
    
    if (cakismaVarMi) {
      alert("🚨 Çakışma Engellendi! Bu yarıyıla ait başka bir dersin sınavı aynı saat dilimine zaten planlanmış.");
      return;
    }

    // 2. Salon Dağıtım Algoritması (Kapasiteye göre azalan sırada sıralayıp salon atama)
    let atananSalonlar = [];
    let kalanOgrenci = dMevcut;
    const siraliDerslikler = [...derslikler].sort((a, b) => (b.Capacity || b.kapasite) - (a.Capacity || a.kapasite));
    
    for (let salon of siraliDerslikler) {
      if (kalanOgrenci > 0) { 
        atananSalonlar.push({ 
          id: salon.ClassroomID || salon.id, 
          ad: salon.ClassroomName || salon.ad 
        }); 
        kalanOgrenci -= (salon.Capacity || salon.kapasite); 
      }
    }

    if (atananSalonlar.length === 0) {
      alert("🚨 Sınav Planlanamadı! Sistemde sınıf/salon verisi bulunamadı.");
      return;
    }

    // 3. Meşgul Gözetmenlerin Tespiti (Seçilen tarih ve slotta görevli olanlar)
    const mesgulGozetmenIds = [];
    mevcutSinavlar.forEach(sinav => {
      if (sinav.ExamDate === secilenTarih && Number(sinav.SlotID) === Number(secilenOturum)) {
        if (sinav.GozetmenIds) {
          mesgulGozetmenIds.push(...sinav.GozetmenIds);
        }
      }
    });

    // 4. Müsait Gözetmenlerin Filtrelenmesi (Mazeretsiz ve Meşgul Olmayanlar)
    const uygunGozetmenler = gozetmenler.filter(g => {
      const pId = g.PersonnelID || g.id;
      
      // Personel mazeret listesini kontrol et (Dizi veya split uyumlu)
      const mazeretListesi = Array.isArray(g.mazeretler) ? g.mazeretler : (g.mazeretler ? g.mazeretler.split(',') : []);
      
      // Örn mazeret biçimi: "2026-05-17 - Sabah Oturumu"
      const mazeretliMi = mazeretListesi.some(m => m.includes(secilenTarih) && m.includes(`ID: ${secilenOturum}`));
      const mesgulMu = mesgulGozetmenIds.includes(pId);
      
      return !mazeretliMi && !mesgulMu;
    });

    if (uygunGozetmenler.length < atananSalonlar.length) {
      alert(`🚨 Gözetmen Yetersiz!\n\nGereken Salon: ${atananSalonlar.length}\nMüsait Gözetmen: ${uygunGozetmenler.length}`);
      return;
    }

    const atananGozetmenIds = uygunGozetmenler.slice(0, atananSalonlar.length).map(g => g.PersonnelID || g.id);

    // 5. API'ye Gönderme İşlemi
    try {
      const res = await fetch('/api/sinavlar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId: dId,
          examDate: secilenTarih,
          slotId: parseInt(secilenOturum),
          classroomIds: atananSalonlar.map(s => s.id),
          personnelIds: atananGozetmenIds
        })
      });

      if (!res.ok) throw new Error('Sınav planlanamadı');

      await logEkle("SINAV_PLANLA", `${dKod} kodlu dersin sınavı ${secilenTarih} tarihine başarıyla planlandı.`);
      setMesaj({ tip: 'basari', icerik: `Sınav başarıyla planlandı. ${atananSalonlar.length} salon ve gözetmen otomatik atandı.` });
      verileriYukle();
    } catch (error) {
      console.error(error);
      setMesaj({ tip: 'hata', icerik: 'Planlama veritabanına yazılırken bir hata oluştu!' });
    }
  };

  // 🚨 SYSTEM LOG SIFIRLAMA AKSİYONU
  const handleBacklogSifirla = async () => {
    if (backloglar.length === 0) return;
    if (!window.confirm("🚨 Tüm sistem işlem günlüğünü (Backlog) kalıcı olarak temizlemek istiyor musiniz?")) return;

    try {
      const res = await fetch('/api/backlog', { method: 'DELETE' });
      if (!res.ok) throw new Error('Backlog temizlenemedi');

      await logEkle("SISTEM_SIFIRLA", "Tüm sistem işlem günlükleri veritabanından temizlendi.");
      setMesaj({ tip: 'basari', icerik: 'Sistem işlem günlüğü başarıyla sıfırlandı.' });
      verileriYukle();
    } catch (error) {
      console.error(error);
      setMesaj({ tip: 'hata', icerik: 'İşlem günlüğü temizlenirken bir hata oluştu!' });
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 font-sans flex flex-col text-slate-700 antialiased">
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-50 px-8 py-4 flex justify-between items-center print:hidden">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 text-white p-2 rounded-xl shadow-xs">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-slate-900">Lumora Academy</h1>
            <p className="text-xs text-slate-500 font-medium">Sınav Takvimi & Gözetmen Yönetim Paneli</p>
          </div>
        </div>
        <button 
          onClick={() => window.print()} 
          className="bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 text-xs font-semibold px-4 py-2.5 rounded-xl shadow-xs transition-all duration-200 flex items-center gap-2 active:scale-98"
        >
          PDF Çıktısı Al
        </button>
      </header>

      <div className="bg-slate-100/50 border-b border-slate-200/60 py-0.5">
        <StatsPanel 
          mevcutSinavlar={mevcutSinavlar} 
          gozetmenler={gozetmenler} 
        />
      </div>

      <div className="flex flex-1 max-w-[1600px] w-full mx-auto">
        <aside className="w-64 border-r border-slate-200 bg-white print:hidden">
          <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
        </aside>

        <section className="flex-1 p-8 lg:p-10 min-w-0">
          {mesaj.icerik && (
            <div className={`p-4 rounded-xl mb-6 text-sm flex items-center gap-3 border print:hidden ${
              mesaj.tip === 'hata' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
            }`}>
              <p className="flex-1 font-semibold">{mesaj.icerik}</p>
              <button onClick={() => setMesaj({ tip: '', icerik: '' })} className="text-slate-400 hover:text-slate-600 transition ml-auto">✕</button>
            </div>
          )}

          {yukleniyor ? (
            <div className="min-h-[400px] flex flex-col items-center justify-center gap-3 bg-white border border-slate-200 rounded-2xl p-8">
              <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs font-semibold text-slate-400 tracking-wider">SQL Server Verileri Senkronize Ediliyor...</p>
            </div>
          ) : (
            <div className="transition-all duration-200">
              {activeTab === 'dersler' && (
                <DerslerTab dersler={dersler} onDersEkle={handleDersEkle} onDersSil={handleDersSil} />
              )}
              
              {activeTab === 'gozetmenler' && (
                <GozetmenlerTab 
                  gozetmenler={gozetmenler} 
                  bolumler={bolumler} 
                  zamanDilimleri={zamanDilimleri} 
                  onGozetmenEkle={handleGozetmenEkle} 
                  onMazeretSil={handleMazeretSil} 
                  onGozetmenSil={handleGozetmenSil} 
                />
              )}

              {activeTab === 'takvim' && (
                <TakvimTab 
                  dersler={dersler} 
                  mevcutSinavlar={mevcutSinavlar} 
                  zamanDilimleri={zamanDilimleri}
                  onSinavPlanla={handleSinavPlanla} 
                  onSinavSil={handleSinavSil} 
                />
              )}

              {activeTab === 'backlog' && (
                <BacklogTab backloglar={backloglar} onBacklogSifirla={handleBacklogSifirla} />
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}