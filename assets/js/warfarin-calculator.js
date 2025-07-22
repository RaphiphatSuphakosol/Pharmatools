const currentDoseSelect = document.getElementById('currentDose');
const targetDoseSelect = document.getElementById('targetDose');
const buttons = document.querySelectorAll('.button-grid button');
const actualChangePercentOutput = document.getElementById('actualChangePercent');
const changedDoseOutput = document.getElementById('changedDose');
const percentIcon = document.getElementById('percentIcon');
const percentText = document.getElementById('percentText');
const doseIcon = document.getElementById('doseIcon');
const doseText = document.getElementById('doseText');

// Global variable to store calculated regimen (only pattern1 now)
let calculatedRegimen = null; // Will store the Weekend Priority Regimen

// Function to populate the dropdowns with values from 3.0 to 60.0, incrementing by 0.5
function populateDoseDropdowns() {
    const minDose = 3.0;
    const maxDose = 100.0;
    const increment = 0.5;

    // Clear existing options
    if (currentDoseSelect) currentDoseSelect.innerHTML = '';
    if (targetDoseSelect) targetDoseSelect.innerHTML = '';

    for (let i = minDose; i <= maxDose; i += increment) {
        const value = i.toFixed(1); // Format to one decimal place

        if (currentDoseSelect) {
            const optionCurrent = document.createElement('option');
            optionCurrent.value = value;
            optionCurrent.textContent = value;
            currentDoseSelect.appendChild(optionCurrent);
        }

        if (targetDoseSelect) {
            const optionTarget = document.createElement('option');
            optionTarget.value = value;
            optionTarget.textContent = value;
            targetDoseSelect.appendChild(optionTarget);
        }
    }

    // Set initial values after populating
    if (currentDoseSelect) currentDoseSelect.value = '11.0'; // Set default current dose
    if (targetDoseSelect) targetDoseSelect.value = '11.5'; // Set default target dose
}

// Function to round to nearest 0.5
function roundToNearestHalf(num) {
    return Math.round(num * 2) / 2;
}

function calculateWarfarin() {
    // Read values from select elements
    const currentDose = currentDoseSelect ? parseFloat(currentDoseSelect.value) : NaN;
    const targetDose = targetDoseSelect ? parseFloat(targetDoseSelect.value) : NaN;

    // ตรวจสอบค่าที่กรอกเข้ามา
    if (isNaN(currentDose) || isNaN(targetDose) || currentDose <= 0) {
        if (actualChangePercentOutput) actualChangePercentOutput.innerHTML = '<span style="color: red;">กรอกข้อมูลไม่ถูกต้อง</span>';
        if (changedDoseOutput) changedDoseOutput.innerHTML = '<span style="color: red;">กรอกข้อมูลไม่ถูกต้อง</span>';
        return;
    }

    const changeAmount = targetDose - currentDose;
    const changePercent = (changeAmount / currentDose) * 100;

    // ปัดเศษขนาดยาที่ต้องการให้เป็น 0.0 หรือ 0.5
    const roundedTargetDose = roundToNearestHalf(targetDose);

    // Update Percentage Display
    let percentIconChar = '';
    let percentDirection = '';
    let percentColor = '';

    if (changePercent > 0) {
        percentIconChar = '▲';
        percentDirection = 'เพิ่มขึ้น';
        percentColor = '#28a745'; // Green for increase (เหมือนเดิม)
        if (percentIcon) {
            percentIcon.classList.remove('decrease');
            percentIcon.classList.add('increase');
        }
    } else if (changePercent < 0) {
        percentIconChar = '▼';
        percentDirection = 'ลดลง';
        percentColor = '#dc3545'; // Red for decrease (เหมือนเดิม)
        if (percentIcon) {
            percentIcon.classList.remove('increase');
            percentIcon.classList.add('decrease');
        }
    } else {
        percentIconChar = '';
        percentDirection = 'เท่าเดิม';
        percentColor = '#0000FF'; // สีน้ำเงินสำหรับ "เท่าเดิม" ใน Percentage Display
        if (percentIcon) {
            percentIcon.classList.remove('increase', 'decrease');
        }
    }

    // อัปเดต HTML สำหรับ % การเปลี่ยนแปลงจริง
    if (actualChangePercentOutput) {
        actualChangePercentOutput.innerHTML = `
            <div class="label">ความเปลี่ยนแปลงจริง (%)</div>
            <div class="value" style="color: ${percentColor};">
                <span class="icon ${changePercent > 0 ? 'increase' : (changePercent < 0 ? 'decrease' : '')}">${percentIconChar}</span>
                <span id="percentText">${percentDirection}</span>
                ${Math.abs(changePercent).toFixed(2)}%
            </div>
        `;
    }

    // Update Changed Dose Display (ใช้ค่า roundedTargetDose)
    let doseIconChar = '';
    let doseDirection = '';
    let doseColor = '';

    if (changeAmount > 0) {
        doseIconChar = '▲';
        doseDirection = 'เพิ่มขึ้น';
        doseColor = '#28a745'; // Green for increase (เหมือนเดิม)
        if (doseIcon) {
            doseIcon.classList.remove('decrease');
            doseIcon.classList.add('increase');
        }
    } else if (changeAmount < 0) {
        doseIconChar = '▼';
        doseDirection = 'ลดลง';
        doseColor = '#dc3545'; // Red for decrease (เหมือนเดิม)
        if (doseIcon) {
            doseIcon.classList.remove('increase');
            doseIcon.classList.add('decrease');
        }
    } else {
        doseIconChar = '';
        doseDirection = 'เท่าเดิม';
        doseColor = '#0000FF'; // สีน้ำเงินสำหรับ "เท่าเดิม" ใน Changed Dose Display
        if (doseIcon) {
            doseIcon.classList.remove('increase', 'decrease');
        }
    }

    // อัปเดต HTML สำหรับขนาดยาที่เปลี่ยนแปลง
    if (changedDoseOutput) {
        changedDoseOutput.innerHTML = `
            <div class="label">ขนาดยาที่เปลี่ยนแปลง (mg/week)</div>
            <div class="value" style="color: ${doseColor};">
                <span class="icon ${changeAmount > 0 ? 'increase' : (changeAmount < 0 ? 'decrease' : '')}">${doseIconChar}</span>
                <span id="doseText">${doseDirection}</span>
                ${roundedTargetDose.toFixed(1)} mg/week
            </div>
        `;
    }

    // Ensure the targetDoseSelect also reflects the rounded value when calculated via buttons
    if (targetDoseSelect && parseFloat(targetDoseSelect.value) !== roundedTargetDose) {
        let optionExists = false;
        for (let i = 0; i < targetDoseSelect.options.length; i++) {
            if (parseFloat(targetDoseSelect.options[i].value) === roundedTargetDose) {
                optionExists = true;
                break;
            }
        }
        if (optionExists) {
            targetDoseSelect.value = roundedTargetDose.toFixed(1);
        } else {
            let closestValue = null;
            let minDiff = Infinity;

            for (let i = 0; i < targetDoseSelect.options.length; i++) {
                const optionValue = parseFloat(targetDoseSelect.options[i].value);
                const diff = Math.abs(optionValue - roundedTargetDose); // Corrected from newTargetDoseRounded
                if (diff < minDiff) {
                    minDiff = diff;
                    closestValue = optionValue;
                }
                if (diff === minDiff && optionValue > closestValue) { // Prefer larger if diff is same (optional)
                    closestValue = optionValue;
                }
            }
            if (closestValue !== null) {
                targetDoseSelect.value = closestValue.toFixed(1);
            }
        }
    }
}

function calculateByPercentage(percentage) {
    const currentDose = currentDoseSelect ? parseFloat(currentDoseSelect.value) : NaN;
    if (isNaN(currentDose) || currentDose <= 0) {
        alert('กรุณาเลือกขนาดยาปัจจุบันก่อน');
        return;
    }

    const newTargetDoseRaw = currentDose * (1 + percentage / 100);
    const newTargetDoseRounded = roundToNearestHalf(newTargetDoseRaw);

    if (targetDoseSelect) {
        let optionExists = false;
        for (let i = 0; i < targetDoseSelect.options.length; i++) {
            if (parseFloat(targetDoseSelect.options[i].value) === newTargetDoseRounded) {
                optionExists = true;
                break;
            }
        }

        if (optionExists) {
            targetDoseSelect.value = newTargetDoseRounded.toFixed(1);
        } else {
            let closestValue = null;
            let minDiff = Infinity;

            for (let i = 0; i < targetDoseSelect.options.length; i++) {
                const optionValue = parseFloat(targetDoseSelect.options[i].value);
                const diff = Math.abs(optionValue - newTargetDoseRounded);
                if (diff < minDiff) {
                    minDiff = diff;
                    closestValue = optionValue;
                }
                if (diff === minDiff && optionValue > closestValue) { // Prefer larger if diff is same (optional)
                    closestValue = optionValue;
                }
            }
            if (closestValue !== null) {
                targetDoseSelect.value = closestValue.toFixed(1);
            }
        }
    }

    calculateWarfarin(); // เรียกคำนวณหลังจากอัปเดตค่า targetDose
    calculateRegimen(); // เพิ่มการเรียกใช้ calculateRegimen() ที่นี่
}

// Event Listeners for select elements
if (currentDoseSelect) currentDoseSelect.addEventListener('change', calculateWarfarin);
if (targetDoseSelect) targetDoseSelect.addEventListener('change', calculateWarfarin);

// Event Listeners for percentage buttons
if (buttons) {
    buttons.forEach(button => {
        button.addEventListener('click', () => {
            const percentage = parseFloat(button.dataset.percentage);
            calculateByPercentage(percentage);
        });
    });
}


// ******************************************************
// APPOINTMENT CALCULATOR CODE
// ******************************************************

// Elements for Appointment Calculator
const systemTodayDateSpan = document.getElementById('systemTodayDate');
const startDateInput = document.getElementById('startDateInput');
const specificDateInput = document.getElementById('specificDateInput');
const daysInput = document.getElementById('daysInput');
const addDaysBtn = document.getElementById('addDaysBtn');
const subtractDaysBtn = document.getElementById('subtractDaysBtn');

// Function to format date in Thai
function formatDateThai(date) {
    return date.toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// Helper to format Date object to YYYY-MM-DD for input type="date"
function formatDateToYYYYMMDD(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Display system's current date and initialize the startDateInput
function displayTodayDateAndInitStartDate() {
    const today = new Date();
    if (systemTodayDateSpan) {
        systemTodayDateSpan.textContent = formatDateThai(today);
    }
    if (startDateInput) {
        startDateInput.value = formatDateToYYYYMMDD(today);
    }

    // Set specificDateInput to 7 days from today by default
    if (specificDateInput) {
        const datePlus7Days = new Date();
        datePlus7Days.setDate(today.getDate() + 7);
        specificDateInput.value = formatDateToYYYYMMDD(datePlus7Days);
        // Also set daysInput to 7 if specificDateInput is initialized this way
        if (daysInput) {
            daysInput.value = '7';
        }
    }
}

// Main function to update the appointment date (now only calculates, no display update)
function calculateAppointmentDateInternal() {
    if (!startDateInput || !specificDateInput || !daysInput) {
        return;
    }

    const startDate = new Date(startDateInput.value);
    let days = parseInt(daysInput.value);
    if (isNaN(days)) {
        days = 0;
    }

    let finalAppointmentDate = null;

    if (!isNaN(startDate.getTime())) {
        finalAppointmentDate = new Date(startDate.getTime());
        finalAppointmentDate.setDate(startDate.getDate() + days);
    }

    if (finalAppointmentDate && !isNaN(finalAppointmentDate.getTime())) {
        specificDateInput.value = formatDateToYYYYMMDD(finalAppointmentDate);
    } else {
        specificDateInput.value = ''; // Clear if invalid
    }
    // Call calculateRegimen here to update pill totals based on new appointment days
    calculateRegimen();
}

// Function to modify days input via buttons
function modifyDays(step) {
    if (!daysInput) return;
    let currentDays = parseInt(daysInput.value);
    if (isNaN(currentDays)) {
        currentDays = 0;
    }
    const newDays = currentDays + step;
    daysInput.value = newDays;
    calculateAppointmentDateInternal(); // Call the internal calculation
}

// Event Listeners for Appointment Calculator section
if (startDateInput) {
    startDateInput.addEventListener('change', calculateAppointmentDateInternal);
}

if (daysInput) {
    daysInput.addEventListener('change', calculateAppointmentDateInternal); // Simplified listener
    daysInput.addEventListener('keyup', (event) => {
        // Only trigger on keyup if it's a number key or navigation key
        if ((event.key >= '0' && event.key <= '9') || event.key === 'Backspace' || event.key === 'Delete' || event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
            calculateAppointmentDateInternal();
        }
    });
}
if (addDaysBtn) {
    addDaysBtn.addEventListener('click', () => modifyDays(1));
}
if (subtractDaysBtn) {
    subtractDaysBtn.addEventListener('click', () => modifyDays(-1));
}


// ******************************************************
// REGIMEN CALCULATOR CODE (UPDATED!)
// ******************************************************

// Elements for Regimen Calculator
const regimenTableBody = document.getElementById('regimenTableBody');
const pillImageRow = document.getElementById('pillImageRow');
const dailyDoseRow = document.getElementById('dailyDoseRow');
const regimenSummary = document.getElementById('regimenSummary');

// Elements for Pill Selection
const pill2mgCheckbox = document.getElementById('pill2mg');
const pill3mgCheckbox = document.getElementById('pill3mg');
const pill5mgCheckbox = document.getElementById('pill5mg');


// Define ALL possible warfarin pill sizes and their image paths (sorted descending for greedy approach)
// This list is used for displaying pill images, NOT for calculation which uses filtered pills.
const allPillInfos = [
    { value: 5.0, img: 'image/warf5.0.png' },
    { value: 3.0, img: 'image/warf3.0.png' },
    { value: 2.5, img: 'image/warf2.5.png' },
    { value: 2.0, img: 'image/warf2.0.png' },
    { value: 1.5, img: 'image/warf1.5.png' },
    { value: 1.25, img: 'image/warf1.25.png' },
    { value: 1.0, img: 'image/warf1.0.png' },
    { value: 0.75, img: 'image/warf0.75.png' },
    { value: 0.5, img: 'image/warf0.5.png' }
];

// Define which sub-pills are associated with each base pill size
const pillGroupings = {
    '2.0': [2.0, 1.0, 0.5],
    '3.0': [3.0, 1.5, 0.75],
    '5.0': [5.0, 2.5, 1.25]
};

// Function to get currently available pill sizes based on checkboxes
function getAvailablePillSizes() {
    const selectedAvailablePills = new Set(); // Use a Set to store unique pill values

    if (pill2mgCheckbox && pill2mgCheckbox.checked) {
        pillGroupings['2.0'].forEach(p => selectedAvailablePills.add(p));
    }
    if (pill3mgCheckbox && pill3mgCheckbox.checked) {
        pillGroupings['3.0'].forEach(p => selectedAvailablePills.add(p));
    }
    if (pill5mgCheckbox && pill5mgCheckbox.checked) {
        pillGroupings['5.0'].forEach(p => selectedAvailablePills.add(p));
    }

    // Filter allPillInfos to include only the selected pill sizes
    const currentPillInfosForCalculation = allPillInfos.filter(pill => selectedAvailablePills.has(pill.value));

    // Sort by value descending, as getBestPillsForDose expects this for the greedy algorithm
    return currentPillInfosForCalculation.sort((a, b) => b.value - a.value);
}

// Function to find the best combination of pills for a given dose
// It now returns null if a non-zero dose cannot be formed
function getBestPillsForDose(targetDose, currentPillInfos) {
    if (targetDose === 0) return []; // Explicitly handle 0 dose, no pills needed

    if (!currentPillInfos || currentPillInfos.length === 0) {
        return null; // Indicate impossibility if no pills are available for non-zero dose
    }

    let remainingDose = targetDose;
    const pillsToUse = {}; // { value: count }
    let totalPillsCount = 0;

    // Use a small tolerance for floating point comparisons
    const EPSILON = 0.001;

    for (const pill of currentPillInfos) { // Use the filtered list here
        while (remainingDose >= pill.value - EPSILON) {
            remainingDose = parseFloat((remainingDose - pill.value).toFixed(2)); // Use toFixed for precision
            pillsToUse[pill.value] = (pillsToUse[pill.value] || 0) + 1;
            totalPillsCount++;
            if (totalPillsCount > 10) break; // Prevent excessive pills for impossible combinations
        }
        if (totalPillsCount > 10) break; // Break from outer loop if too many pills
    }

    if (remainingDose > EPSILON) {
        // Cannot exactly form the targetDose with available pills
        return null; // Return null to explicitly indicate failure for non-zero targetDose
    }

    // Convert pillsToUse object to an array of pill values for display
    const pillList = [];
    for (const pillValue in pillsToUse) {
        for (let i = 0; i < pillsToUse[pillValue]; i++) {
            pillList.push(parseFloat(pillValue));
        }
    }
    return pillList.sort((a, b) => b - a); // Sort descending for display (largest pill first)
}

function calculateRegimen() {
    const targetDose = targetDoseSelect ? parseFloat(targetDoseSelect.value) : NaN;
    const daysAppointment = parseInt(daysInput.value); // Get the number of appointment days

    // Get the currently available pills based on user selection
    const currentPillInfosForCalculation = getAvailablePillSizes();

    // Clear previous regimen display and summary unconditionally at the start
    if (pillImageRow) pillImageRow.innerHTML = '<td class="row-label">รูปเม็ดยา</td><td colspan="7" style="text-align: center;">...กำลังคำนวณ...</td>';
    if (dailyDoseRow) dailyDoseRow.innerHTML = '<td class="row-label">ขนาดยาต่อวัน</td><td colspan="7" style="text-align: center;">...กำลังคำนวณ...</td>';
    if (regimenSummary) regimenSummary.innerHTML = '<p>กำลังคำนวณ...</p>';

    // Show error message if no pills are selected or target dose is invalid
    if (isNaN(targetDose) || targetDose < 0 || currentPillInfosForCalculation.length === 0) {
        const errorMessage = 'กรุณาเลือกขนาดยาที่ต้องการ หรือเลือกเม็ดยาที่โรงพยาบาลมี';
        if (pillImageRow) pillImageRow.innerHTML = `<td class="row-label">รูปเม็ดยา</td><td colspan="7" style="text-align: center; color: red;">${errorMessage}</td>`;
        if (dailyDoseRow) dailyDoseRow.innerHTML = `<td class="row-label">ขนาดยาต่อวัน</td><td colspan="7" style="text-align: center; color: red;">${errorMessage}</td>`;
        if (regimenSummary) regimenSummary.innerHTML = '<p style="color: red;">ไม่สามารถคำนวณรูปแบบการจัดยาได้ เนื่องจากไม่มีเม็ดยาที่เลือก หรือขนาดยาไม่ถูกต้อง</p>';
        calculatedRegimen = null; // Clear previous results
        return;
    }

    const daysOfWeekNames = ['จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์', 'อาทิตย์'];

    // Step 1: Calculate 7 provisional daily doses that sum up to targetDose
    // This distribution tries to make doses as even as possible, with 0.5mg increments.
    let dosesForDistribution = [];
    const totalHalfUnits = Math.round(targetDose * 2);
    const baseHalfUnitsPerDay = Math.floor(totalHalfUnits / 7);
    let remainderHalfUnits = totalHalfUnits % 7;

    for (let i = 0; i < 7; i++) {
        let dailyHalfUnits = baseHalfUnitsPerDay;
        if (remainderHalfUnits > 0) {
            dailyHalfUnits += 1; // Add 0.5 to this day
            remainderHalfUnits--;
        }
        dosesForDistribution.push(dailyHalfUnits / 2); // Convert back to mg
    }

    // --- Prepare data for Pattern 1 (Weekend Priority Regimen - จัดยาตามความซับซ้อนเม็ด) ---
    // Create base dosesWithPills from dosesForDistribution, using the available pills
    const baseDosesWithPills = dosesForDistribution.map(dose => {
        const pills = getBestPillsForDose(dose, currentPillInfosForCalculation);
        // isFormable is true if pills is an array (meaning it was successfully formed) OR if the dose is 0
        const isFormable = (pills !== null) || (dose === 0);
        const complexity = pills ? pills.length : Infinity; // If not formable, consider it very complex/impossible
        return { dose, pills: pills || [], complexity, isFormable };
    });

    // Check if all doses from the initial even distribution are formable
    const allDosesAreFormable = baseDosesWithPills.every(day => day.isFormable);

    if (!allDosesAreFormable) {
        // If even the simple distribution isn't entirely formable
        // Display "No Regimen Possible" and stop.
        const impossibilityMessage = 'ไม่มี Regimen ที่เป็นไปได้ ด้วยเม็ดยาที่เลือกและขนาดยาที่ต้องการ';
        if (pillImageRow) pillImageRow.innerHTML = `<td class="row-label">รูปเม็ดยา</td><td colspan="7" style="text-align: center; color: red;">${impossibilityMessage}</td>`;
        if (dailyDoseRow) dailyDoseRow.innerHTML = `<td class="row-label">ขนาดยาต่อวัน</td><td colspan="7" style="text-align: center; color: red;">${impossibilityMessage}</td>`;
        if (regimenSummary) regimenSummary.innerHTML = '<p style="color: red;">ไม่สามารถคำนวณรูปแบบการจัดยาได้ เนื่องจากไม่สามารถจัดยาตามรูปแบบที่กำหนดได้ด้วยเม็ดยาที่เลือก</p>';
        calculatedRegimen = null;
        return;
    }

    // Clone and sort by complexity (descending)
    const weekendPriorityDoses = [...baseDosesWithPills];
    weekendPriorityDoses.sort((a, b) => {
        if (b.complexity !== a.complexity) {
            return b.complexity - a.complexity;
        }
        return b.dose - a.dose; // Secondary sort by dose as tie-breaker
    });

    const prioritizedDays = ['เสาร์', 'อาทิตย์', 'ศุกร์', 'พฤหัสบดี', 'พุธ', 'อังคาร', 'จันทร์'];
    const weekendPriorityRegimenArray = new Array(7); // To store results in Mon-Sun order for rendering
    let pillsUsedPerWeekPattern1 = {}; // This will hold the pill counts for a STANDARD WEEK (7 days)

    // Assign doses (most complex first) to prioritized days
    for (let i = 0; i < prioritizedDays.length; i++) {
        const dayName = prioritizedDays[i];
        const assignedDose = weekendPriorityDoses.shift(); // Take the most complex remaining dose

        const originalDayIndex = daysOfWeekNames.indexOf(dayName); // Get Mon=0, Tue=1, ... index
        weekendPriorityRegimenArray[originalDayIndex] = {
            day: dayName,
            dose: assignedDose.dose,
            pills: assignedDose.pills
        };
        assignedDose.pills.forEach(pillValue => {
            pillsUsedPerWeekPattern1[pillValue] = (pillsUsedPerWeekPattern1[pillValue] || 0) + 1;
        });
    }

    // Calculate total pills needed for the *entire appointment period*
    let summaryForPeriod = {};
    if (daysAppointment > 0) {
        const weeksFactor = daysAppointment / 7; // e.g., 10 days / 7 = 1.428...
        for (const pillValue in pillsUsedPerWeekPattern1) {
            // Multiply pills per week by the weeksFactor, and round UP to ensure enough pills
            summaryForPeriod[pillValue] = Math.ceil(pillsUsedPerWeekPattern1[pillValue] * weeksFactor);
        }
    } else {
        // If appointment days is 0 or invalid, assume no pills needed for a period (though 0mg regimen still displayed)
        summaryForPeriod = pillsUsedPerWeekPattern1; // Just use weekly count if days is 0 for consistency
    }

    calculatedRegimen = { // Store the weekend priority pattern and the period summary
        details: weekendPriorityRegimenArray,
        summary: summaryForPeriod // Use the calculated summary for the *appointment period*
    };

    // --- Render the calculated regimen ---
    renderRegimen(calculatedRegimen);
}

// Function to normalize and format pill counts for display in the summary
function normalizePillCountsForDisplay(pillsUsedMap) {
    const aggregatedCounts = {
        '2': { totalMg: 0, img: 'image/warf2.0.png' }, // Base 2mg pill
        '3': { totalMg: 0, img: 'image/warf3.0.png' }, // Base 3mg pill
        '5': { totalMg: 0, img: 'image/warf5.0.png' }  // Base 5mg pill
    };

    // Aggregate total milligrams for each base pill family
    for (const pillValueStr in pillsUsedMap) {
        const pillValue = parseFloat(pillValueStr);
        const count = pillsUsedMap[pillValueStr];

        if ([2.0, 1.0, 0.5].includes(pillValue)) {
            aggregatedCounts['2'].totalMg += pillValue * count;
        } else if ([3.0, 1.5, 0.75].includes(pillValue)) {
            aggregatedCounts['3'].totalMg += pillValue * count;
        } else if ([5.0, 2.5, 1.25].includes(pillValue)) {
            aggregatedCounts['5'].totalMg += pillValue * count;
        }
    }

    const displayItems = [];

    // Function to format the display for a given base pill
    const formatPillItem = (baseMg, totalMg, imgPath) => {
        if (totalMg === 0) return null;

        // For display, we want to know how many *base pills* are equivalent to the total mg
        // Math.ceil ensures we always have enough pills.
        let countOfBasePills = Math.ceil(totalMg / baseMg);

        let countStr = `${countOfBasePills} เม็ด`;

        return {
            baseMg: baseMg,
            countStr: countStr,
            imgPath: imgPath
        };
    };

    const sortedBasePills = [5, 3, 2].sort((a,b) => b-a); // Sort descending (5mg, 3mg, 2mg) for display order

    for (const baseMg of sortedBasePills) {
        const formattedItem = formatPillItem(baseMg, aggregatedCounts[baseMg].totalMg, aggregatedCounts[baseMg].img);
        if (formattedItem) {
            displayItems.push(formattedItem);
        }
    }

    return displayItems;
}


// Function to render a specific regimen pattern to the table and summary
function renderRegimen(regimenToRender) {
    if (!regimenToRender || !regimenToRender.details || !regimenToRender.summary) {
        // Handle case where no valid regimen can be rendered
        if (pillImageRow) pillImageRow.innerHTML = '<td class="row-label">รูปเม็ดยา</td><td colspan="7" style="text-align: center; color: red;">ไม่สามารถแสดงรูปแบบการจัดยาได้</td>';
        if (dailyDoseRow) dailyDoseRow.innerHTML = '<td class="row-label">ขนาดยาต่อวัน</td><td colspan="7" style="text-align: center; color: red;">ไม่สามารถแสดงรูปแบบการจัดยาได้</td>';
        if (regimenSummary) regimenSummary.innerHTML = '<p style="color: red;">ไม่สามารถแสดงข้อมูลสรุปได้</p>';
        return;
    }

    const regimenDetails = regimenToRender.details;
    const pillsUsedForPeriod = regimenToRender.summary; // This is the total count for the appointment period

    let pillImagesCells = '';
    let dailyDoseCells = '';

    regimenDetails.forEach(dayInfo => {
        const pillImagesHTML = dayInfo.pills.map(pillValue => {
            // Use allPillInfos for image lookup, as it contains all possible pill images
            const pillImg = allPillInfos.find(p => p.value === pillValue)?.img;
            return pillImg ? `<img src="${pillImg}" alt="${pillValue} mg" class="pill-image">` : '';
        }).join('');

        pillImagesCells += `<td><div class="pill-images-wrapper">${pillImagesHTML || (dayInfo.dose === 0 ? 'งด' : 'ไม่สามารถจัดได้')}</div></td>`; // Added "งด" for 0mg
        dailyDoseCells += `<td>${dayInfo.dose.toFixed(1)} mg</td>`;
    });

    if (pillImageRow && dailyDoseRow) {
        pillImageRow.innerHTML = '<td class="row-label">รูปเม็ดยา</td>' + pillImagesCells;
        dailyDoseRow.innerHTML = '<td class="row-label">ขนาดยาต่อวัน</td>' + dailyDoseCells;
    }

    if (regimenSummary) {
        let summaryHTML = '<p>รวมขนาดยาต่อสัปดาห์: ' + targetDoseSelect.value + ' mg</p>';
        summaryHTML += '<p>เม็ดยาที่ต้องใช้สำหรับ ' + (daysInput ? daysInput.value : '0') + ' วัน:</p>'; // Display actual days input
        summaryHTML += '<ul>';

        const normalizedDisplayItems = normalizePillCountsForDisplay(pillsUsedForPeriod); // Use the period summary here

        if (normalizedDisplayItems.length === 0 && parseFloat(targetDoseSelect.value) > 0) {
            summaryHTML += '<li>ไม่สามารถจัดยาได้ตามขนาดยาที่ต้องการด้วยเม็ดยาที่เลือก</li>';
        } else if (normalizedDisplayItems.length === 0 && parseFloat(targetDoseSelect.value) === 0) {
            summaryHTML += '<li>ไม่มีเม็ดยาที่ใช้ (ขนาดยาเป้าหมายเป็น 0 mg)</li>';
        } else {
            normalizedDisplayItems.forEach(item => {
                summaryHTML += `<li><img src="${item.imgPath}" alt="${item.baseMg} mg" style="max-width: 30px; vertical-align: middle;"> ${item.baseMg} mg: ${item.countStr}</li>`;
            });
        }
        summaryHTML += '</ul>';
        regimenSummary.innerHTML = summaryHTML;
    }
}

// Attach event listeners for the new pill selection checkboxes
if (pill2mgCheckbox) pill2mgCheckbox.addEventListener('change', calculateRegimen);
if (pill3mgCheckbox) pill3mgCheckbox.addEventListener('change', calculateRegimen);
if (pill5mgCheckbox) pill5mgCheckbox.addEventListener('change', calculateRegimen);


// Initial setup when the DOM is fully loaded (Revised to include all calculators)
document.addEventListener('DOMContentLoaded', () => {
    // Existing warfarin calculator initial calls
    if (currentDoseSelect && targetDoseSelect) {
        populateDoseDropdowns();
        calculateWarfarin(); // Initial warfarin calculation
    }

    // New appointment calculator initial calls
    displayTodayDateAndInitStartDate(); // Call this here to ensure it's set on load
    if (startDateInput && specificDateInput && daysInput) {
        // daysInput.value is now set to '7' within displayTodayDateAndInitStartDate
        calculateAppointmentDateInternal(); // Call this to set specificDateInput based on 7 days (now handled by displayTodayDateAndInitStartDate)
    }

    // Initial Regimen Calculator call (after other initial setups)
    if (regimenTableBody && pillImageRow && dailyDoseRow && regimenSummary && targetDoseSelect && pill2mgCheckbox && pill3mgCheckbox && pill5mgCheckbox) {
        calculateRegimen(); // This now calculates and renders the Weekend Priority Regimen
    }
});

// Also update targetDoseSelect's change listener to ensure regimen is re-calculated and re-rendered
if (targetDoseSelect) {
    targetDoseSelect.addEventListener('change', () => {
        calculateWarfarin();
        calculateRegimen(); // Recalculate and render the regimen
    });
}