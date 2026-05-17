import { NextResponse } from 'next/server';
import { connectDB, sql } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// 1. GET: Tüm dersleri veritabanından çekme
export async function GET() {
  try {
    const pool = await connectDB();
    const result = await pool.request().query('SELECT * FROM Courses ORDER BY CourseCode ASC');
    
    const dersler = result.recordset.map(row => ({
      CourseID: row.CourseID,
      CourseCode: row.CourseCode,
      CourseName: row.CourseName,
      DepartmentID: row.DepartmentID,
      StudentCount: row.StudentCount,
      Semester: row.Semester,
      CourseType: row.CourseType,

      // Geriye Dönük Frontend Uyumluluk Köprüsü
      id: row.CourseID,
      kod: row.CourseCode,
      ad: row.CourseName,
      mevcut: row.StudentCount,
      yariyil: row.Semester
    }));

    return NextResponse.json(dersler);
  } catch (error) {
    console.error("Ders çekme hatası:", error);
    return NextResponse.json({ error: "Veritabanından dersler çekilemedi." }, { status: 500 });
  }
}

// 2. POST: Yeni ders ekleme
export async function POST(request) {
  try {
    const body = await request.json();
    
    const courseCode = body.courseCode || body.kod || '';
    const courseName = body.courseName || body.ad || '';
    
    let studentCount = body.studentCount !== undefined ? parseInt(body.studentCount) : (body.mevcut !== undefined ? parseInt(body.mevcut) : 40);
    if (isNaN(studentCount) || studentCount <= 0) {
      studentCount = 40; 
    }
                        
    let semester = body.semester !== undefined ? parseInt(body.semester) : (body.yariyil !== undefined ? parseInt(body.yariyil) : 1);
    if (isNaN(semester) || semester < 1 || semester > 8) {
      semester = 1;
    }
    
    const departmentId = body.departmentId || body.bolumId || 1; 
    const courseType = 'Zorunlu'; 

    if (!courseCode || !courseName) {
      return NextResponse.json({ error: "Ders kodu ve ders adı zorunludur." }, { status: 400 });
    }

    const pool = await connectDB();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      await transaction.request()
        .input('courseCode', sql.NVarChar(20), courseCode.toString().trim())
        .input('courseName', sql.NVarChar(150), courseName.toString().trim())
        .input('departmentId', sql.Int, departmentId)
        .input('studentCount', sql.Int, studentCount)
        .input('semester', sql.Int, semester)
        .input('courseType', sql.NVarChar(10), courseType)
        .query(`
          INSERT INTO Courses (CourseCode, CourseName, DepartmentID, StudentCount, Semester, CourseType) 
          VALUES (@courseCode, @courseName, @departmentId, @studentCount, @semester, @courseType)
        `);

      const simdi = new Date();
      const trTarihSaat = simdi.toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' });
      const safeTimestamp = Date.now().toString();
      const logDetay = `Yeni müfredat dersi havuza eklendi: ${courseCode.toString().trim()} - ${courseName.toString().trim()} (${studentCount} Öğrenci)`;

      await transaction.request()
        .input('logType', sql.VarChar(50), 'DERS_EKLEME')
        .input('logDetails', sql.NVarChar(500), logDetay)
        .input('formattedDate', sql.VarChar(50), trTarihSaat)
        .input('systemTimestamp', sql.VarChar(50), safeTimestamp)
        .query(`
          INSERT INTO SystemLogs (LogType, LogDetails, FormattedDate, SystemTimestamp)
          VALUES (@logType, @logDetails, @formattedDate, @systemTimestamp)
        `);

      await transaction.commit();
      return NextResponse.json({ success: true, message: "Ders başarıyla SQL veritabanına eklendi ve günlüğe kaydedildi." });
    } catch (txError) {
      await transaction.rollback();
      throw txError;
    }
  } catch (error) {
    console.error("❌ SQL Ders Ekleme Hatası:", error);
    return NextResponse.json({ error: `Veritabanı reddetti: ${error.message}` }, { status: 500 });
  }
}

// 3. DELETE: Güvenli Ders Silme Metodu
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: "Id parametresi eksik." }, { status: 400 });

    const pool = await connectDB();
    
    const dersBilgiResult = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT CourseCode, CourseName FROM Courses WHERE CourseID = @id');
    
    if (dersBilgiResult.recordset.length === 0) {
      return NextResponse.json({ error: "Silinmek istenen ders zaten veritabanında mevcut değil." }, { status: 404 });
    }
    
    const silinenDersKod = dersBilgiResult.recordset[0].CourseCode;
    const silinenDersAd = dersBilgiResult.recordset[0].CourseName;

    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      const examsResult = await transaction.request()
        .input('id', sql.Int, id)
        .query('SELECT ExamID FROM Exams WHERE CourseID = @id');
      
      const examIds = examsResult.recordset.map(r => r.ExamID);

      if (examIds.length > 0) {
        const idListStr = examIds.join(',');

        await transaction.request().query(`
          DELETE FROM InvigilatorAssignments 
          WHERE ExamClassroomId IN (
            SELECT ExamClassroomId FROM ExamClassrooms WHERE ExamID IN (${idListStr})
          )
        `);

        await transaction.request().query(`DELETE FROM ExamClassrooms WHERE ExamID IN (${idListStr})`);
        await transaction.request().query(`DELETE FROM Exams WHERE ExamID IN (${idListStr})`);
      }

      await transaction.request()
        .input('id', sql.Int, id)
        .query('DELETE FROM Courses WHERE CourseID = @id');

      const simdi = new Date();
      const trTarihSaat = simdi.toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' });
      const safeTimestamp = Date.now().toString();
      const logDetay = `Müfredat dersi havuzdan kaldırıldı: ${silinenDersKod} - ${silinenDersAd}`;

      await transaction.request()
        .input('logType', sql.VarChar(50), 'DERS_SILME')
        .input('logDetails', sql.NVarChar(500), logDetay)
        .input('formattedDate', sql.VarChar(50), trTarihSaat)
        .input('systemTimestamp', sql.VarChar(50), safeTimestamp)
        .query(`
          INSERT INTO SystemLogs (LogType, LogDetails, FormattedDate, SystemTimestamp)
          VALUES (@logType, @logDetails, @formattedDate, @systemTimestamp)
        `);

      await transaction.commit();
      return NextResponse.json({ success: true, message: "Ders ve bağlı tüm sınav planları başarıyla silindi." });

    } catch (txError) {
      await transaction.rollback();
      throw txError;
    }
  } catch (error) {
    console.error("Ders silme hatası ayrıntısı:", error);
    return NextResponse.json({ error: `Ders silinemedi: ${error.message}` }, { status: 500 });
  }
}