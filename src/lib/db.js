// src/lib/db.js
import sql from 'mssql';

// src/lib/db.js içindeki config nesnesini bununla güncelleyin:
const config = {
  server: '127.0.0.1', // localhost yerine doğrudan IP
  database: 'LumoraAcademyDB', // Veritabanı adınız
  user: 'sa', // Aktif ettiğimiz kullanıcı adı
  password: '123456', // SSMS'te sa kullanıcısına verdiğiniz şifre (örn: 123456)
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

let poolPromise;


export async function connectDB() {
  if (!poolPromise) {
    poolPromise = sql.connect(config)
      .then(pool => {
        console.log('🔌 MS SQL Server veritabanına başarıyla bağlanıldı.');
        return pool;
      })
      .catch(err => {
        console.error('❌ Veritabanı bağlantı hatası: ', err);
        poolPromise = null;
        throw err;
      });
  }
  return poolPromise;
}


export { sql };