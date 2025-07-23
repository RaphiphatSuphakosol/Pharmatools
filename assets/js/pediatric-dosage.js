// ฟังก์ชันสำหรับโหลดข้อมูลยาจาก JSON (มีการปรับปรุงเพื่อใช้ localStorage)
async function loadDrugData() {
    const cachedData = localStorage.getItem('drugData');
    const lastUpdated = localStorage.getItem('drugDataLastUpdated');
    const currentTime = new Date().getTime();

    // *** ตรวจสอบว่ามีข้อมูลใน localStorage และยังไม่เกิน 1 เดือน ***
    if (cachedData && lastUpdated && (currentTime - parseInt(lastUpdated) < UPDATE_INTERVAL_MS)) {
        try {
            allDrugs = JSON.parse(cachedData);
            console.log('ข้อมูลยาโหลดจาก Local Storage แล้ว.');
            initializeDrugSearchAndDisplay(); // เรียกใช้ฟังก์ชัน initialization
            return; // ออกจากฟังก์ชัน ไม่ต้องดึงข้อมูลจาก Web App
        } catch (e) {
            console.error('เกิดข้อผิดพลาดในการ parse ข้อมูลจาก Local Storage:', e);
            // ถ้า parse ไม่ได้ ให้ดึงข้อมูลใหม่
        }
    }

    // ... โค้ดดึงข้อมูลจาก DRUG_DATA_JSON_URL ...

    // บันทึกข้อมูลและ timestamp ลงใน Local Storage
    localStorage.setItem('drugData', JSON.stringify(allDrugs));
    localStorage.setItem('drugDataLastUpdated', currentTime.toString());
    // ...
}
