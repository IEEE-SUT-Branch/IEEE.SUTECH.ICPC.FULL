const fs = require('fs');

// 1. إعدادات الملفات
const INPUT_FILE = 'IEEE SUTech Champions Program_ ECPC & ICPC Qualification 2026(1-148).csv';
const OUTPUT_FILE = 'final_students_list.csv';

// دالة لمعالجة سطور CSV بشكل صحيح (لتجاهل الفواصل داخل علامات التنصيص)
function parseCSVLine(line) {
    let result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        let char = line[i];
        if (char === '"' && line[i + 1] === '"') {
            current += '"';
            i++;
        } else if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current.trim());
    return result;
}

// دالة لخلط المصفوفة عشوائياً (Fisher-Yates Shuffle)
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

try {
    // 2. قراءة الملف الأصلي كبيانات خام (Buffer) لمعالجة مشاكل الترميز
    const buffer = fs.readFileSync(INPUT_FILE);
    
    // -- [ الفحص الذكي للملفات ] --
    // إذا كان الملف يبدأ بـ "PK" فهذا يعني أنه ملف Excel مضغوط وليس CSV
    if (buffer.length >= 2 && buffer[0] === 0x50 && buffer[1] === 0x4B) {
        console.error('\n❌ خطأ فادح: الملف الذي تحاول قراءته هو ملف Excel (.xlsx) حقيقي، تم تغيير امتداده فقط.');
        console.error('💡 الحل: افتح الملف في برنامج Excel، واختر "Save As"، ثم اختر الصيغة "CSV UTF-8 (Comma delimited)".\n');
        process.exit(1);
    }

    let fileContent = '';

    // معالجة ترميز UTF-16LE (الذي يصدره Excel أحياناً)
    if (buffer.length >= 2 && buffer[0] === 0xFF && buffer[1] === 0xFE) {
        fileContent = buffer.toString('utf16le');
    } 
    // معالجة ترميز UTF-8 مع BOM
    else if (buffer.length >= 3 && buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) {
        fileContent = buffer.toString('utf8').substring(1);
    } 
    // الترميز العادي
    else {
        fileContent = buffer.toString('utf8');
    }

    const lines = fileContent.split(/\r?\n/).filter(line => line.trim() !== '');

    // تخطي السطر الأول (الـ Header)
    const dataLines = lines.slice(1);
    
    let students = [];

    // 3. استخراج البيانات (الاسم، الـ ID، الإيميل)
    dataLines.forEach(line => {
        const columns = parseCSVLine(line);
        // بناءً على هيكل الملف، الـ Full Name في العمود 6 (Index 6)
        // الـ Student ID في العمود 7 (Index 7)
        // الـ SUTech Email في العمود 9 (Index 9) أو العمود 3 (Email)
        
        const fullName = columns[6];
        const universityId = columns[7];
        const email = columns[9] || columns[3]; // أخذ إيميل الجامعة كأولوية

        if (fullName && universityId && email) {
            students.push({ fullName, universityId, email });
        }
    });

    if (students.length === 0) {
        console.error('\n⚠️ تحذير: لم يتم استخراج أي طلاب! يرجى التأكد من أن الملف بصيغة CSV صحيحة وأن الأعمدة متطابقة.');
        process.exit(1);
    }

    // 4. التوزيع العشوائي
    students = shuffleArray(students);

    const labs = ['Lab 6', 'Lab 7', 'Lab 123'];
    const testGroups = ['Group1', 'Group2'];
    
    // حساب نقطة المنتصف لتقسيم الطلاب لمجموعتين
    const midpoint = Math.ceil(students.length / 2);

    // 5. بناء الملف الجديد
    let outputCSV = 'fullName,universityId,email,labAssignment,testGroup\n';

    students.forEach((student, index) => {
        // تحديد المجموعة (النصف الأول Group1، النصف الثاني Group2)
        const testGroup = index < midpoint ? testGroups[0] : testGroups[1];
        
        // اختيار لاب عشوائي
        const randomLab = labs[Math.floor(Math.random() * labs.length)];

        outputCSV += `${student.fullName},${student.universityId},${student.email},${randomLab},${testGroup}\n`;
    });

    // 6. حفظ الملف
    fs.writeFileSync(OUTPUT_FILE, outputCSV, 'utf8');
    
    console.log('✅ تم الانتهاء بنجاح واستخراج البيانات الصحيحة!');
    console.log(`📊 إجمالي الطلاب الذين تمت معالجتهم: ${students.length}`);
    console.log(`📁 تم حفظ النتيجة في ملف: ${OUTPUT_FILE}`);

} catch (error) {
    console.error('❌ حدث خطأ أثناء معالجة الملف:', error.message);
}