'use client';
import { useState } from 'react';

export default function BackupButton() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });

  const handleBackup = async () => {
    setLoading(true);
    setStatus({ type: '', message: '' });

    try {
      const res = await fetch('/api/backup', {
        method: 'POST',
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Yedekleme sırasında bir hata oluştu.');
      }

      setStatus({
        type: 'success',
        message: `💾 Veritabanı başarıyla yedeklendi! Dosya Yolu: ${data.path}`
      });

    } catch (error) {
      setStatus({
        type: 'error',
        message: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-800">Veritabanı Yönetimi</h3>
          <p className="text-xs text-gray-500">Sistem verilerini T-SQL yapısıyla C:\Yedekler klasörüne yedekleyin.</p>
        </div>
        <button
          onClick={handleBackup}
          disabled={loading}
          className={`px-4 py-2 text-xs font-bold text-white rounded-md shadow transition-all ${
            loading 
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-emerald-600 hover:bg-emerald-700 active:scale-95'
          }`}
        >
          {loading ? 'Yedek Alınıyor...' : '🗄️ Şimdi Yedek Al'}
        </button>
      </div>

      {status.message && (
        <div className={`p-3 rounded text-xs font-medium border ${
          status.type === 'success' 
            ? 'bg-green-50 text-green-700 border-green-200' 
            : 'bg-red-50 text-red-700 border-red-200'
        }`}>
          {status.message}
        </div>
      )}
    </div>
  );
}