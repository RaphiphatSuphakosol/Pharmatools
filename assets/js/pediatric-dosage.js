document.addEventListener('DOMContentLoaded', function() {
    const childWeightInput = document.getElementById('child-weight');
    const weightUnitSelect = document.getElementById('weight-unit');
    const drugListBody = document.getElementById('drug-list-body');
    const drugSearchSelect = document.getElementById('drug-search-select');
    const drugTagsContainer = document.getElementById('drug-tags-container'); // อ้างอิงถึง container สำหรับ tag

    // กำหนดค่าคงที่สำหรับหน่วยช้อน
    const ML_PER_TEASPOON = 5;
    const ML_PER_TABLESPOON = 15; // 1 ช้อนโต๊ะ = 15 mL

    // =====================================================================
    // URL สำหรับดึงข้อมูลยาจาก GitHub Pages ของคุณ
    // โปรดตรวจสอบว่า URL นี้ถูกต้องและชี้ไปยังไฟล์ drug-data.json บน GitHub Pages ของคุณ
    const DRUG_DATA_JSON_URL = 'https://RaphiphatSuphakosol.github.io/Pharmatools/assets/drug-data.json';
    // =====================================================================

    let allDrugs = []; // เปลี่ยนเป็น array ว่างเปล่า เพื่อรอโหลดข้อมูลจาก JSON
    let displayDrugs = []; // Array ที่เก็บยาที่แสดงในตาราง
    let editModeEnabled = false; // ตัวแปรควบคุมโหมดการแก้ไข/ลบ (ตอนนี้ควบคุมการแสดง/ซ่อน tag และ logic การคืนค่าเริ่มต้น)
    let firstSearchDone = false; // ตัวแปรควบคุมว่ามีการค้นหาเกิดขึ้นครั้งแรกหรือไม่

    // ฟังก์ชันสำหรับสร้าง object ยาที่มีสถานะปัจจุบัน (concentration, dosage, frequency)
    function createDrugInstance(drugTemplate) {
        return {
            name: drugTemplate.name,
            concentrations: drugTemplate.concentrations,
            currentConcentration: drugTemplate.initialConcentration,
            dosageOptions: drugTemplate.dosageOptions,
            currentDosageOption: { ...drugTemplate.initialDosageOption },
            frequencyOptions: drugTemplate.frequencyOptions,
            currentFrequencyOption: { ...drugTemplate.initialFrequencyOption }
        };
    }

    // ฟังก์ชันคำนวณปริมาตรยาจาก Dose (mg) และ Concentration (mg/ml)
    function calculateVolumeFromDoseAndConc(doseMg, concentrationMgPerMl) {
        if (isNaN(doseMg) || doseMg <= 0 || isNaN(concentrationMgPerMl) || concentrationMgPerMl <= 0) {
            return NaN;
        }
        return doseMg / concentrationMgPerMl;
    }

    // ฟังก์ชันช่วยแปลงปริมาตรเป็นช้อนชา/ช้อนโต๊ะ
    function convertMlToSpoons(ml) {
        if (isNaN(ml) || ml <= 0) return '0 ช้อนชา';

        const roundToNearestHalf = (num) => Math.round(num * 2) / 2;

        const tsp = roundToNearestHalf(ml / ML_PER_TEASPOON);
        const tbsp = roundToNearestHalf(ml / ML_PER_TABLESPOON);

        if (ml % ML_PER_TABLESPOON === 0 && ml > 0) {
            return `${ml / ML_PER_TABLESPOON} ช้อนโต๊ะ`;
        }
        // แก้ไข: ML_TEASPOON เป็น ML_PER_TEASPOON
        if (ml % ML_PER_TEASPOON === 0 && ml > 0 && ml < ML_PER_TABLESPOON) {
            return `${ml / ML_PER_TEASPOON} ช้อนชา`;
        }
        if (tbsp > 0 && (tbsp % 1 === 0 || tbsp % 0.5 === 0)) {
            if (tbsp * ML_PER_TABLESPOON >= ml * 0.9) {
                return `${tbsp} ช้อนโต๊ะ`;
            }
        }
        if (ml < ML_PER_TEASPOON || tsp < 0.5) {
            return `${ml.toFixed(2)} ml.`;
        }

        const fullTbsp = Math.floor(ml / ML_PER_TABLESPOON);
        let remainingMl = ml % ML_PER_TABLESPOON;

        let resultParts = [];
        if (fullTbsp >= 1) {
            resultParts.push(`${fullTbsp} ช้อนโต๊ะ`);
        }
        if (remainingMl > 0) {
            const remainingTsp = roundToNearestHalf(remainingMl / ML_PER_TEASPOON);
            if (remainingTsp > 0) {
                resultParts.push(`${remainingTsp} ช้อนชา`);
            }
        }
        if (resultParts.length === 0) {
            return `${ml.toFixed(2)} ml.`;
        }
        return resultParts.join(' ');
    }

    // ฟังก์ชันสำหรับ Render Drug Tags
    function renderDrugTags() {
        drugTagsContainer.innerHTML = ''; // เคลียร์ tag เก่า

        if (editModeEnabled) { // แสดง tags เมื่ออยู่ในโหมดแก้ไข
            displayDrugs.forEach((drug, index) => {
                const tag = document.createElement('div');
                tag.classList.add('drug-tag');
                tag.innerHTML = `
                    <span>${drug.name}</span>
                    <button type="button" class="remove-tag-btn" data-drug-name="${drug.name}">
                        <img src="image/remove_icon_red.png" alt="Remove" style="width: 20px; height: 20px;">
                    </button>
                `;
                drugTagsContainer.appendChild(tag);
            });
        }
    }


    // ฟังก์ชัน renderDrugList()
    function renderDrugList() {
        drugListBody.innerHTML = ''; // ล้างตารางเดิม

        // ตรวจสอบว่า displayDrugs ว่างเปล่าหรือไม่
        // ถ้า allDrugs ยังไม่ถูกโหลด หรือ allDrugs ว่างเปล่า ให้หยุดการทำงาน
        if (allDrugs.length === 0) {
            console.warn("allDrugs is empty. Data might not have loaded yet.");
            return;
        }

        if (displayDrugs.length === 0 && firstSearchDone) {
            // ถ้าลบยาออกจากตารางหมดแล้ว และเคยมีการค้นหาแล้ว
            // ให้กลับไปแสดงยาเริ่มต้นทั้งหมด
            allDrugs.forEach(drugTemplate => {
                displayDrugs.push(createDrugInstance(drugTemplate));
            });
            editModeEnabled = false; // ปิดโหมดแก้ไข
            firstSearchDone = false; // รีเซ็ต firstSearchDone
        } else if (displayDrugs.length === 0 && !firstSearchDone && allDrugs.length > 0) {
            // กรณีโหลดครั้งแรกและยังไม่มีการค้นหาใดๆ displayDrugs จะว่าง
            // ให้เติม displayDrugs ด้วย allDrugs ทั้งหมด
            allDrugs.forEach(drugTemplate => {
                displayDrugs.push(createDrugInstance(drugTemplate));
            });
        }


        let weight = parseFloat(childWeightInput.value);
        let unit = weightUnitSelect.value;
        let weightKg = 0;

        const isWeightValidAndPositive = !isNaN(weight) && weight > 0;

        if (isWeightValidAndPositive) {
            if (unit === 'lbs') {
                weightKg = weight * 0.453592; // แปลง lbs เป็น kg
            } else {
                weightKg = weight;
            }
        } else {
            weight = 0;
            weightKg = 0;
        }

        displayDrugs.forEach((drug, index) => {
            let doseMgDisplay = '';
            let volumeMlRangeDisplay = '';
            let intakeSummaryDisplay = '';

            let currentConcMgPerMl = drug.currentConcentration;
            let currentMinDosePerKg = drug.currentDosageOption.min;
            let currentMaxDosePerKg = drug.currentDosageOption.max;
            let currentDosesPerDay = drug.currentFrequencyOption.dosesPerDay;
            let currentFrequencyText = drug.currentFrequencyOption.frequencyText;
            let currentDoseUnit = drug.currentDosageOption.unit;

            // สร้าง Dropdown สำหรับความเข้มข้นยา
            const concDropdownHtml = `
                <select class="form-control select2-custom" id="conc-select-${drug.name.replace(/\s/g, '-')}-${index}" data-drug-index="${index}" style="width: 100%;">
                    ${drug.concentrations.map(conc => `
                        <option value="${conc.mgPerMl}" data-display="${conc.display}" ${conc.mgPerMl === drug.currentConcentration ? 'selected' : ''}>
                            ${conc.display}
                        </option>
                    `).join('')}
                </select>
            `;

            // สร้าง Dropdown สำหรับขนาดยาแนะนำ
            const dosageDropdownHtml = `
                <select class="form-control select2-custom" id="dosage-select-${drug.name.replace(/\s/g, '-')}-${index}" data-drug-index="${index}" style="width: 100%;">
                    ${drug.dosageOptions.map(option => `
                        <option value="${option.min}-${option.max}-${option.unit}" data-display="${option.display}" ${option.min === drug.currentDosageOption.min && option.max === drug.currentDosageOption.max && option.unit === drug.currentDosageOption.unit ? 'selected' : ''}>
                            ${option.display}
                        </option>
                    `).join('')}
                </select>
            `;

            // สร้าง Dropdown สำหรับวิธีการบริหาร
            const frequencyDropdownHtml = `
                <select class="form-control select2-custom" id="freq-select-${drug.name.replace(/\s/g, '-')}-${index}" data-drug-index="${index}" style="width: 100%;">
                    ${drug.frequencyOptions.map(option => `
                        <option value="${option.dosesPerDay}" data-display="${option.display} ${option.text || ''}" ${option.dosesPerDay === drug.currentFrequencyOption.dosesPerDay ? 'selected' : ''}>
                            ${option.display} ${option.text || ''}
                        </option>
                    `).join('')}
                </select>
            `;


            // Calculations if weight is valid
            if (isWeightValidAndPositive) {
                const minDoseMgTotal = currentMinDosePerKg * weightKg;
                const maxDoseMgTotal = currentMaxDosePerKg * weightKg;

                let minDoseMgPerDose = 0;
                let maxDoseMgPerDose = 0;

                if (currentDoseUnit === "mg/dose") {
                    minDoseMgPerDose = minDoseMgTotal;
                    maxDoseMgPerDose = maxDoseMgTotal;
                    doseMgDisplay = `<span class="highlight-result">${minDoseMgPerDose.toFixed(2)} - ${maxDoseMgPerDose.toFixed(2)}</span> mg/dose`;
                } else if (currentDoseUnit === "mg/day") {
                    if (currentDosesPerDay > 0) {
                        minDoseMgPerDose = minDoseMgTotal / currentDosesPerDay;
                        maxDoseMgPerDose = maxDoseMgTotal / currentDosesPerDay;
                    } else {
                        minDoseMgPerDose = NaN;
                        maxDoseMgPerDose = NaN;
                    }
                    doseMgDisplay = `<span class="highlight-result">${minDoseMgPerDose.toFixed(2)} - ${maxDoseMgPerDose.toFixed(2)}</span> mg/dose`;
                } else {
                    doseMgDisplay = `<span class="text-danger">หน่วยยาไม่ถูกต้อง</span>`;
                }

                const minVolumeMlPerDose = calculateVolumeFromDoseAndConc(minDoseMgPerDose, currentConcMgPerMl);
                const maxVolumeMlPerDose = calculateVolumeFromDoseAndConc(maxDoseMgPerDose, currentConcMgPerMl);

                const minVolumeMlPerDay = minVolumeMlPerDose * currentDosesPerDay;
                const maxVolumeMlPerDay = maxVolumeMlPerDose * currentDosesPerDay;

                if (isNaN(minVolumeMlPerDay) || isNaN(maxVolumeMlPerDay)) {
                    volumeMlRangeDisplay = '<span class="text-danger">คำนวณไม่ได้</span>';
                    intakeSummaryDisplay = '<span class="text-danger">คำนวณไม่ได้</span>';
                } else {
                    volumeMlRangeDisplay = `<span class="highlight-result">${minVolumeMlPerDay.toFixed(2)} - ${maxVolumeMlPerDay.toFixed(2)}</span> ml/day`;
                    const avgVolumePerDose = (minVolumeMlPerDose + maxVolumeMlPerDose) / 2;
                    intakeSummaryDisplay = `<span class="highlight-result">${convertMlToSpoons(avgVolumePerDose)} ${currentFrequencyText}</span>`;
                }
            } else {
                doseMgDisplay = '<span class="text-info">-</span>';
                volumeMlRangeDisplay = '<span class="text-info">-</span>';
                intakeSummaryDisplay = '<span class="text-info">โปรดกรอกน้ำหนัก</span>';
            }

            const row = drugListBody.insertRow();
            row.insertCell(0).textContent = drug.name;
            row.insertCell(1).innerHTML = concDropdownHtml;
            row.insertCell(2).innerHTML = dosageDropdownHtml;
            row.insertCell(3).innerHTML = frequencyDropdownHtml;
            row.insertCell(4).innerHTML = doseMgDisplay;
            row.insertCell(5).innerHTML = volumeMlRangeDisplay;
            row.insertCell(6).innerHTML = intakeSummaryDisplay;
        });

        if (typeof jQuery !== 'undefined' && typeof jQuery.fn.select2 !== 'undefined') {
            // Destroy existing Select2 instances for the drug table before re-initializing
            $('.select2-custom').each(function() {
                if ($(this).data('select2')) {
                    $(this).select2('destroy');
                }
            });

            // Initialize Select2 on all custom dropdowns in the table
            $('.select2-custom').select2({
                minimumResultsForSearch: Infinity,
                dropdownAutoWidth: true,
                width: 'resolve',
                templateSelection: function(data) {
                    return data.text;
                },
                templateResult: function(data) {
                    return $('<span>' + data.text + '</span>');
                }
            });

            // Re-attach Event Listeners for Dropdown changes
            $(drugListBody).off('change', '.select2-custom').on('change', '.select2-custom', function() {
                const drugIndex = parseInt($(this).data('drug-index'));
                const drugToUpdate = displayDrugs[drugIndex];

                if (drugToUpdate) {
                    if (this.id.startsWith('conc-select-')) {
                        drugToUpdate.currentConcentration = parseFloat($(this).val());
                    } else if (this.id.startsWith('dosage-select-')) {
                        const selectedValueParts = $(this).val().split('-');
                        const min = parseFloat(selectedValueParts[0]);
                        const max = parseFloat(selectedValueParts[1]);
                        const unit = selectedValueParts[2];
                        const selectedDisplay = $(this).find('option:selected').data('display');
                        drugToUpdate.currentDosageOption = { min: min, max: max, unit: unit, display: selectedDisplay };
                    } else if (this.id.startsWith('freq-select-')) {
                        const selectedDosesPerDay = parseInt($(this).val());
                        const foundFreqOption = drugToUpdate.frequencyOptions.find(opt => opt.dosesPerDay === selectedDosesPerDay);
                        if (foundFreqOption) {
                            drugToUpdate.currentFrequencyOption = foundFreqOption;
                        }
                    }
                    renderDrugList(); // Re-render the list to reflect changes
                }
            });

            // เพิ่ม Event listener สำหรับปุ่มลบใน Tag Area
            $(drugTagsContainer).off('click', '.remove-tag-btn').on('click', '.remove-tag-btn', function() {
                const drugNameToRemove = $(this).data('drug-name');
                const indexToRemove = displayDrugs.findIndex(d => d.name === drugNameToRemove);

                if (indexToRemove !== -1) {
                    displayDrugs.splice(indexToRemove, 1); // Remove drug from the array

                    if (displayDrugs.length === 0) {
                        // ถ้าลบจนหมด ให้กลับไปสถานะเริ่มต้น
                    }
                    renderDrugTags(); // อัปเดต Tags
                    renderDrugList(); // อัปเดตตาราง
                }
            });

        } else {
            console.warn("jQuery or Select2 not loaded. Please ensure they are included before this script.");
        }
    }

    // ฟังก์ชันสำหรับโหลดข้อมูลยาจาก JSON (ลบส่วน localStorage ออกแล้ว)
    async function loadDrugData() {
        console.log('กำลังดึงข้อมูลยาจาก GitHub Pages...');
        try {
            const response = await fetch(DRUG_DATA_JSON_URL);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            allDrugs = await response.json();

            console.log('ข้อมูลยาโหลดจาก GitHub Pages เรียบร้อยแล้ว.');

            initializeDrugSearchAndDisplay();
        } catch (error) {
            console.error('ไม่สามารถโหลดข้อมูลยาได้:', error);
            alert('ไม่สามารถโหลดข้อมูลยาได้ กรุณาลองใหม่อีกครั้ง หรือติดต่อผู้ดูแลระบบ');
        }
    }

    // ฟังก์ชันใหม่สำหรับจัดการการเริ่มต้น Select2 และการแสดงผลครั้งแรก
    function initializeDrugSearchAndDisplay() {
        if (typeof jQuery !== 'undefined' && typeof jQuery.fn.select2 !== 'undefined') {
            $(drugSearchSelect).select2({
                placeholder: "พิมพ์ชื่อยาเพื่อค้นหา...",
                allowClear: true,
                data: allDrugs.map(drug => ({ id: drug.name, text: drug.name })),
                templateResult: function(data) {
                    if (!data.id) { return data.text; }
                    return $('<span>' + data.text + '</span>');
                },
                templateSelection: function(data) {
                    return data.text;
                }
            });

            $(drugSearchSelect).off('select2:select').on('select2:select', function(e) {
                const selectedDrugName = e.params.data.id;
                const drugToAdd = allDrugs.find(d => d.name === selectedDrugName);

                if (drugToAdd) {
                    if (!firstSearchDone) {
                        displayDrugs = [];
                        firstSearchDone = true;
                    }

                    const isAlreadyDisplayed = displayDrugs.some(d => d.name === drugToAdd.name);
                    if (!isAlreadyDisplayed) {
                        displayDrugs.push(createDrugInstance(drugToAdd));
                    }

                    editModeEnabled = true;
                    renderDrugTags();
                    renderDrugList();
                }
                $(this).val(null).trigger('change');
            });
        } else {
            console.warn("jQuery or Select2 not loaded for search dropdown.");
        }

        if (displayDrugs.length === 0 || !firstSearchDone) {
            allDrugs.forEach(drugTemplate => {
                displayDrugs.push(createDrugInstance(drugTemplate));
            });
        }
        renderDrugList();
        renderDrugTags();
    }

    // Event listeners for weight input and unit change
    childWeightInput.addEventListener('input', renderDrugList);
    weightUnitSelect.addEventListener('change', renderDrugList);

    // =====================================================================
    // เรียก loadDrugData() เมื่อ DOM โหลดเสร็จ
    loadDrugData();
    // =====================================================================
});
