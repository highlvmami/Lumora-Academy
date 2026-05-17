"use client";

export default function Sidebar({ activeTab, setActiveTab }) {
  const sekmeler = [
    { id: 'dersler', ad: '📚 Dersler & Sınıflar' },
    { id: 'gozetmenler', ad: '👤 Gözetmen Havuzu' },
    { id: 'takvim', ad: '📅 Sınav Programı Yap' },
    { id: 'backlog', ad: '📜 İşlem Günlüğü (Backlog)' },
  ];

  return (
    <nav className="p-6 flex flex-col gap-1.5 h-full bg-white border-r border-slate-100">
      {/* Lumora Academy Marka Başlığı */}
      <div className="px-3 mb-6">
        <h1 className="text-sm font-bold text-slate-800 tracking-tight">
          ✨ Lumora Academy
        </h1>
        <p className="text-[10px] text-slate-400 font-medium">Sınav Planlama Sistemi</p>
      </div>

      <p className="text-[10px] font-bold tracking-wider text-slate-400 uppercase px-3 mb-2">
        Navigasyon
      </p>
      
      {sekmeler.map((sekme) => {
        const aktifMi = activeTab === sekme.id;
        return (
          <button
            key={sekme.id}
            onClick={() => setActiveTab(sekme.id)}
            className={`w-full text-left px-4 py-3 rounded-xl text-xs font-medium transition-all ${
              aktifMi
                ? "bg-indigo-50 text-indigo-700 font-semibold shadow-sm shadow-indigo-100/50"
                : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
            }`}
          >
            {sekme.ad}
          </button>
        );
      })}
    </nav>
  );
}