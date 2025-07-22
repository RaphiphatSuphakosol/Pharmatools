// Function to calculate Ideal Body Weight (IBW), Adjusted Body Weight (ABW), BMI, and BSA
function calculateIBWABW() {
    const gender = document.getElementById('gender-ibw').value;
    const heightCm = parseFloat(document.getElementById('height-ibw').value);
    const actualWeight = parseFloat(document.getElementById('actual-weight-abw').value);

    const resultIbwElement = document.getElementById('result-ibw');
    const resultAbwElement = document.getElementById('result-abw');
    const resultBmiElement = document.getElementById('result-bmi');
    const resultBsaElement = document.getElementById('result-bsa');
    const resultIbwDiffAwElement = document.getElementById('result-ibw-diff-aw');
    const crclWeightSelectionSection = document.getElementById('crcl-weight-selection-section');

    // ฟังก์ชันย่อยสำหรับอัปเดตค่าใน .result-value
    const updateResultValue = (element, value, isError = false) => {
        const valueSpan = element.querySelector('.result-value');
        if (valueSpan) {
            if (isError) {
                valueSpan.innerHTML = `<span class="error-message">${value}</span>`;
            } else {
                valueSpan.textContent = value;
            }
        }
    };

    // --- กำหนด label เริ่มต้นให้กับทุก element เพื่อให้หัวข้อแสดงอยู่เสมอ ---
    // โดยค่าเริ่มต้นจะเป็นค่าว่างเปล่า (หรือ "")
    // IBW
    resultIbwElement.innerHTML = `<span class="result-label">Ideal Body Weight (IBW)</span><span class="result-value"></span>`;
    // IBW Diff (ตั้ง label ค้างไว้)
    resultIbwDiffAwElement.innerHTML = `<span class="result-label">Percent Ideal Body Weight (Percent IBW)</span><span class="result-value"></span>`;
    // ABW
    resultAbwElement.innerHTML = `<span class="result-label">adjusted body weight (AjBW)</span><span class="result-value"></span>`;
    // BMI
    resultBmiElement.innerHTML = `<span class="result-label">Body Mass Index (BMI)</span><span class="result-value"></span>`;
    // BSA
    resultBsaElement.innerHTML = `<span class="result-label">Body Surface Area (BSA)</span><span class="result-value"></span>`;

    // ตรวจสอบว่ามีการกรอกข้อมูลในส่วน IBW/ABW/BMI หรือไม่
    // isNaN(heightCm) && heightCm === 0 หมายถึงมีการกรอก 0 ซึ่งถือว่าไม่เพียงพอ
    const isAnyIBWABWBMIInputFilled = (gender !== "" && !isNaN(heightCm) && heightCm > 0) || (!isNaN(actualWeight) && actualWeight > 0);

    if (!isAnyIBWABWBMIInputFilled) {
        // เมื่อไม่มีการกรอกข้อมูลใดๆ เลย หรือข้อมูลยังไม่สมบูรณ์สำหรับการคำนวณเบื้องต้น
        // ให้ทุกช่องแสดงหัวข้อเท่านั้น และค่าเป็นช่องว่าง
        updateResultValue(resultIbwElement, "");
        updateResultValue(resultIbwDiffAwElement, "");
        updateResultValue(resultAbwElement, "");
        updateResultValue(resultBmiElement, "");
        updateResultValue(resultBsaElement, "");

        localStorage.removeItem('ibw');
        localStorage.removeItem('abw');
        localStorage.removeItem('actualWeight');
        localStorage.removeItem('selectedGender');

        // ซ่อนส่วนเลือกน้ำหนัก CrCl
        if (crclWeightSelectionSection) {
            crclWeightSelectionSection.style.display = 'none';
        }
        return; // ออกจากฟังก์ชัน ไม่ทำการคำนวณต่อ
    } else {
        // แสดงส่วนเลือกน้ำหนัก CrCl ถ้ามีการกรอกข้อมูล
        if (crclWeightSelectionSection) {
            crclWeightSelectionSection.style.display = '';
        }
    }

    let ibw = NaN;
    let abw = NaN;

    // --- IBW Calculation ---
    // ตรวจสอบข้อมูลที่จำเป็นสำหรับการคำนวณ IBW: ต้องมีเพศ และ ส่วนสูงที่ถูกต้อง (มากกว่า 0)
    if (gender !== "" && !isNaN(heightCm) && heightCm > 0) {
        const heightInches = heightCm / 2.54;
        const heightOver5FeetInches = heightInches - 60;
        if (gender === 'male') {
            ibw = (heightInches <= 60) ? 50 : (50 + (2.3 * heightOver5FeetInches));
        } else { // female
            ibw = (heightInches <= 60) ? 45.5 : (45.5 + (2.3 * heightOver5FeetInches));
        }
        updateResultValue(resultIbwElement, `${ibw.toFixed(2)} kg`);
    } else {
        updateResultValue(resultIbwElement, "ข้อมูลไม่เพียงพอ", true); // แสดงข้อความ error สำหรับช่องนี้
    }

    // --- Calculation and display for IBW vs Actual Weight difference ---
    // ตรวจสอบข้อมูลที่จำเป็นสำหรับการคำนวณส่วนต่าง: ต้องมี IBW, ActualWeight ที่ถูกต้อง (มากกว่า 0)
    if (!isNaN(ibw) && !isNaN(actualWeight) && actualWeight > 0) {
        const diff = actualWeight - ibw;
        const diffPercentage = (diff / ibw) * 100;

        let diffLabel = "";
        let diffValue = "";

        if (diffPercentage > 10) {
            diffLabel = `น้ำหนักตัวจริงสูงกว่า IBW:`;
            diffValue = `${diffPercentage.toFixed(0)}%`;
        } else if (diffPercentage < -10) {
            diffLabel = `น้ำหนักตัวจริงต่ำกว่า IBW:`;
            diffValue = `${Math.abs(diffPercentage).toFixed(0)}%`;
        } else {
            diffLabel = `น้ำหนักตัวจริงใกล้เคียง IBW`;
            diffValue = ``;
        }
        resultIbwDiffAwElement.querySelector('.result-label').textContent = diffLabel;
        resultIbwDiffAwElement.querySelector('.result-value').textContent = diffValue;
    } else {
        // ถ้าข้อมูลไม่พอสำหรับการคำนวณส่วนต่าง
        resultIbwDiffAwElement.querySelector('.result-label').textContent = 'น้ำหนักตัวจริงเทียบกับ IBW:'; // ให้ label คงอยู่
        updateResultValue(resultIbwDiffAwElement, "ข้อมูลไม่เพียงพอ", true); // แสดงข้อความ error สำหรับช่องนี้
    }


    // --- ABW Calculation ---
    // ตรวจสอบข้อมูลที่จำเป็นสำหรับการคำนวณ ABW: ต้องมี IBW, ActualWeight ที่ถูกต้อง (มากกว่า 0)
    if (!isNaN(ibw) && !isNaN(actualWeight) && actualWeight > 0) {
        abw = ibw + 0.4 * (actualWeight - ibw);
        updateResultValue(resultAbwElement, `${abw.toFixed(2)} kg`);
    } else {
        updateResultValue(resultAbwElement, "ข้อมูลไม่เพียงพอ", true); // แสดงข้อความ error สำหรับช่องนี้
    }

    // --- BMI Calculation ---
    // ตรวจสอบข้อมูลที่จำเป็นสำหรับการคำนวณ BMI: ต้องมีส่วนสูงและน้ำหนักตัวจริงที่ถูกต้อง (มากกว่า 0)
    if (!isNaN(heightCm) && heightCm > 0 && !isNaN(actualWeight) && actualWeight > 0) {
        const heightM = heightCm / 100;
        const bmi = actualWeight / (heightM * heightM);
        let bmiCategory = "";
        if (bmi < 18.5) { bmiCategory = "น้ำหนักน้อยกว่าเกณฑ์"; }
        else if (bmi <= 22.9) { bmiCategory = "น้ำหนักปกติ"; }
        else if (bmi <= 24.9) { bmiCategory = "น้ำหนักเกิน"; }
        else if (bmi <= 29.9) { bmiCategory = "โรคอ้วนระดับ 1"; }
        else { bmiCategory = "โรคอ้วนระดับ 2"; }
        updateResultValue(resultBmiElement, `${bmi.toFixed(2)} (${bmiCategory})`);
    } else {
        updateResultValue(resultBmiElement, "ข้อมูลไม่เพียงพอ", true); // แสดงข้อความ error สำหรับช่องนี้
    }

    // --- BSA Calculation ---
    let bsa = NaN;
    // ตรวจสอบข้อมูลที่จำเป็นสำหรับการคำนวณ BSA: ต้องมีส่วนสูงและน้ำหนักตัวจริงที่ถูกต้อง (มากกว่า 0)
    if (!isNaN(heightCm) && heightCm > 0 && !isNaN(actualWeight) && actualWeight > 0) {
        bsa = Math.sqrt((heightCm * actualWeight) / 3600);
        updateResultValue(resultBsaElement, `${bsa.toFixed(3)} m²`);
    } else {
        updateResultValue(resultBsaElement, "ข้อมูลไม่เพียงพอ", true); // แสดงข้อความ error สำหรับช่องนี้
    }

    // Store calculated weights in localStorage
    if (!isNaN(ibw)) {
        localStorage.setItem('ibw', ibw.toFixed(2));
    } else {
        localStorage.removeItem('ibw');
    }
    if (!isNaN(abw)) {
        localStorage.setItem('abw', abw.toFixed(2));
    } else {
        localStorage.removeItem('abw');
    }
    if (!isNaN(actualWeight)) {
        localStorage.setItem('actualWeight', actualWeight.toFixed(2));
    } else {
        localStorage.removeItem('actualWeight');
    }

    // Store selected gender in localStorage
    if (gender !== "") {
        localStorage.setItem('selectedGender', gender);
    } else {
        localStorage.removeItem('selectedGender');
    }
}

// Function to calculate CrCl using Cockcroft-Gault formula
function calculateCrCl() {
    const gender = document.getElementById('gender-crcl').value;
    const age = parseFloat(document.getElementById('age-crcl').value);
    const weight = parseFloat(document.getElementById('weight-crcl').value);
    const scr = parseFloat(document.getElementById('scr-crcl').value);
    const scrUnit = document.getElementById('scr-unit').value;
    const resultCrclElement = document.getElementById('result-crcl');

    // ฟังก์ชันย่อยสำหรับอัปเดตค่าใน .result-value สำหรับ CrCl
    const updateCrClResultValue = (value, isError = false) => {
        const valueSpan = resultCrclElement.querySelector('.result-value');
        if (valueSpan) {
            if (isError) {
                valueSpan.innerHTML = `<span class="error-message">${value}</span>`;
            } else {
                valueSpan.textContent = value;
            }
        }
    };

    // กำหนด label เริ่มต้นและค่าว่างเปล่า
    resultCrclElement.innerHTML = `<span class="result-label">Creatinine Clearance (CrCl)</span><span class="result-value"></span>`;

    // ตรวจสอบว่ามีข้อมูลใดๆ ที่กรอกในส่วน CrCl หรือไม่ (ยกเว้นเพศที่อาจจะถูกเลือกเป็นค่าว่างได้)
    const isAnyCrClInputFilled = (document.getElementById('age-crcl').value !== "" || document.getElementById('weight-crcl').value !== "" || document.getElementById('scr-crcl').value !== "");

    if (!isAnyCrClInputFilled && gender === "") { // ถ้าไม่มีข้อมูลใดๆ เลย รวมถึงเพศด้วย
        updateCrClResultValue(""); // แสดงช่องว่าง
        return;
    }

    // ตรวจสอบข้อมูลที่จำเป็นสำหรับการคำนวณ CrCl: เพศ, อายุ, น้ำหนัก, SCr (ทั้งหมดต้องถูกต้องและมากกว่า 0)
    if (gender !== "" && !isNaN(age) && age > 0 && !isNaN(weight) && weight > 0 && !isNaN(scr) && scr > 0) {
        let scrInMgDl = scr;
        if (scrUnit === 'umol/L') {
            scrInMgDl = scr / 88.4;
        }
        let crcl;
        if (gender === 'male') {
            crcl = ((140 - age) * weight) / (scrInMgDl * 72);
        } else { // female
            crcl = ((140 - age) * weight) / (scrInMgDl * 72) * 0.85;
        }
        updateCrClResultValue(`${crcl.toFixed(2)} mL/min`);
    } else {
        updateCrClResultValue("ข้อมูลไม่เพียงพอ", true); // แสดงข้อความ error สำหรับช่องนี้
    }
}

// Function to fetch weight and gender from IBW/ABW section
function fetchWeightAndGenderForCrCl() {
    // Fetch Weight
    const weightTypeRadios = document.getElementsByName('crcl-weight-type');
    let selectedWeightType;
    for (const radio of weightTypeRadios) {
        if (radio.checked) {
            selectedWeightType = radio.value;
            break;
        }
    }

    let weightValue = NaN;
    let weightInput = document.getElementById('weight-crcl');

    if (selectedWeightType === 'actual') {
        weightValue = parseFloat(localStorage.getItem('actualWeight'));
    } else if (selectedWeightType === 'ibw') {
        weightValue = parseFloat(localStorage.getItem('ibw'));
    } else if (selectedWeightType === 'abw') {
        weightValue = parseFloat(localStorage.getItem('abw'));
    }

    if (!isNaN(weightValue)) {
        weightInput.value = weightValue.toFixed(2);
    } else {
        weightInput.value = '';
        alert('ไม่พบข้อมูลน้ำหนักที่เลือก กรุณาคำนวณในส่วน IBW/ABW ก่อน หรือป้อนค่าน้ำหนักด้วยตนเอง');
    }

    // Fetch Gender
    const genderCrClSelect = document.getElementById('gender-crcl');
    const storedGender = localStorage.getItem('selectedGender');

    if (storedGender) {
        genderCrClSelect.value = storedGender;
    } else {
        genderCrClSelect.value = ""; // Clear if no gender stored
    }

    calculateCrCl(); // Recalculate CrCl after fetching both weight and gender
}


// Attach event listeners to trigger calculation on input change
document.addEventListener('DOMContentLoaded', function() {
    // Initial calculation to display labels with empty values when the page loads
    calculateIBWABW();
    calculateCrCl();

    // IBW/ABW/BMI/BSA Calculator
    document.getElementById('gender-ibw').addEventListener('change', calculateIBWABW);
    document.getElementById('height-ibw').addEventListener('input', calculateIBWABW);
    document.getElementById('actual-weight-abw').addEventListener('input', calculateIBWABW);

    // CrCl Calculator
    document.getElementById('gender-crcl').addEventListener('change', calculateCrCl);
    document.getElementById('age-crcl').addEventListener('input', calculateCrCl);
    document.getElementById('scr-crcl').addEventListener('input', calculateCrCl);
    document.getElementById('scr-unit').addEventListener('change', calculateCrCl);

    // Event listener for the "ดึงน้ำหนักจากส่วนคำนวณ BW" button
    const fetchWeightBtn = document.getElementById('fetch-weight-btn');
    if (fetchWeightBtn) {
        fetchWeightBtn.addEventListener('click', fetchWeightAndGenderForCrCl);
    }

    // Event listeners for CrCl weight type radio buttons (to trigger CrCl calculation if selection changes)
    document.querySelectorAll('input[name="crcl-weight-type"]').forEach(radio => {
        radio.addEventListener('change', calculateCrCl);
    });

    // Also trigger CrCl calculation if the weight input is changed manually
    document.getElementById('weight-crcl').addEventListener('input', calculateCrCl);

    // --- START: Code for Toggle Formula functionality ---
    // Function to toggle formula visibility
    function toggleFormula(button) {
        const targetId = button.dataset.target;
        const targetDiv = document.getElementById(targetId);

        if (targetDiv) {
            if (targetDiv.style.display === 'block') {
                targetDiv.style.display = 'none';
                button.textContent = 'แสดงสูตร';
            } else {
                targetDiv.style.display = 'block';
                button.textContent = 'ซ่อนสูตร';
            }
        }
    }

    // Attach event listeners to all toggle buttons
    const toggleButtons = document.querySelectorAll('.toggle-formula-btn');
    toggleButtons.forEach(button => {
        button.addEventListener('click', function() {
            toggleFormula(this);
        });
    });
    // --- END: Code for Toggle Formula functionality ---
});