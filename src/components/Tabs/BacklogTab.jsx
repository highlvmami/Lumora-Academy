"use client";

export default function BacklogTab({ backloglar = [], onBacklogSifirla }) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
      {/* ÜST BAŞLIK VE AKSİYON GRUBU */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-5">
        <div>
          <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <span>📜</span> Sistem İşlem Günlüğü (Backlog)
          </h2>
          <p className="text-xs text-slate-400 mt-1">Veritabanı ve API mekanizmaları tarafından kaydedilen işlemler gerçek zamanlı izlenir.</p>
        </div>
        
        {/* Buton ve Sayaç Grubu */}
        <div className="flex items-center gap-3 w-full sm:w-auto justify-end print:hidden">
          {backloglar && backloglar.length > 0 && (
            <button
              onClick={onBacklogSifirla}
              className="text-[11px] font-semibold bg-rose-50/60 hover:bg-rose-100 text-rose-600 border border-rose-100 px-3 py-1.5 rounded-xl transition active:scale-98"
            >
              Günlüğü Temizle
            </button>
          )}
          <span className="text-[11px] font-bold bg-slate-100 text-slate-600 px-3 py-1.5 rounded-full shrink-0">
            {backloglar ? backloglar.length : 0} İşlem
          </span>
        </div>
      </div>

      {/* LİSTELEME ALANI */}
      {!backloglar || backloglar.length === 0 ? (
        <div className="text-center p-8 text-slate-400 text-xs italic border border-dashed border-slate-200 rounded-xl">
          Henüz kaydedilmiş bir işlem geçmişi bulunmuyor.
        </div>
      ) : (
        <div className="overflow-hidden border border-slate-100 rounded-xl">
          <div className="max-h-[500px] overflow-y-auto divide-y divide-slate-100 custom-scrollbar">
            {backloglar.map((log, index) => {
              // 🔍 GELİŞTİRİLMİŞ VERİTABANI MODELİ (%100 UYUMLULUK KORUMASI)
              const islemTipi = log.LogType || log.logType || log.type || log.islemTipi || log.IslemTipi || "İŞLEM";
              const detay = log.LogDetails || log.logDetails || log.details || log.detay || log.Detay || log.Description || "Detay belirtilmedi.";
              const hamTarih = log.FormattedDate || log.formattedDate || log.date || log.tarihSaat || log.TarihSaat || log.CreatedDate || "";
              const logId = log.LogID || log.id || index;

              let formatliTarih = hamTarih;
              if (hamTarih && !isNaN(Date.parse(hamTarih)) && !hamTarih.includes('.')) {
                formatliTarih = new Date(hamTarih).toLocaleString('tr-TR', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit'
                });
              }

              // 🛡️ TÜRKÇE VE KARAKTER UYUMLULUK KALKANI
              // Karşılaştırma yaparken hem İngilizce hem Türkçe karakter uyumsuzluğunu önlemek için 
              // alt çizgileri kaldırıp tamamen küçük harfe (locale-sensitive) çeviriyoruz.
              let badgeStyles = "bg-indigo-50/60 text-indigo-700 border-indigo-100/70";
              const temizTip = islemTipi.replace('_', ' ').toLowerCase('tr-TR');
              
              // 🔴 SİLME, IPTAL ve DELETE durumları (sil, silme, silindi, delete kontrolü)
              if (temizTip.includes('sil') || temizTip.includes('delete') || temizTip.includes('iptal')) {
                badgeStyles = "bg-rose-50/60 text-rose-700 border-rose-100/70";
              } 
              // 🟢 EKLEME ve PLANLAMA durumları
              else if (temizTip.includes('ekle') || temizTip.includes('insert') || temizTip.includes('planla') || temizTip.includes('create')) {
                badgeStyles = "bg-emerald-50/60 text-emerald-700 border-emerald-100/70";
              } 
              // 🟡 GÜNCELLEME durumları
              else if (temizTip.includes('update') || temizTip.includes('güncelle')) {
                badgeStyles = "bg-amber-50/60 text-amber-700 border-amber-100/70";
              }

              return (
                <div key={logId} className="p-3.5 hover:bg-slate-50/50 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 transition">
                  {/* İşlem Tipi Etiketi */}
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider w-fit sm:w-28 text-center shrink-0 border ${badgeStyles}`}>
                    {islemTipi.replace('_', ' ')}
                  </span>
                  
                  {/* Detay Açıklaması */}
                  <div className="flex-1 text-xs text-slate-600 font-medium tracking-tight">
                    {detay}
                  </div>
                  
                  {/* Tarih ve Zaman Damgası */}
                  {formatliTarih && (
                    <div className="text-[10px] text-slate-400 font-medium shrink-0 bg-slate-50 border border-slate-100 px-2 py-1 rounded-lg flex items-center gap-1.5 self-end sm:self-auto">
                      <span>⏰</span> {formatliTarih}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}