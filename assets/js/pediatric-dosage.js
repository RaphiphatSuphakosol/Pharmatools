document.addEventListener('DOMContentLoaded', function() {
    // --- Elements Caching ---
    const childWeightInput = document.getElementById('child-weight');
    const weightUnitSelect = document.getElementById('weight-unit');
    const treatmentDurationInput = document.getElementById('treatment-duration');
    const drugListBody = document.getElementById('drug-list-body');

    // ใช้ jQuery selector สำหรับ drugSearchInput (อันนี้ยังคงใช้ Select2)
    const drugSearchInput = $('#drug-search-input');
    const drugTagsContainer = document.getElementById('drug-tags-container');

    // --- Constants ---
    const ML_PER_TEASPOON = 5;
    const ML_PER_TABLESPOON = 15;

    // =====================================================================
    const DRUG_DATA_JSON_URL = 'https://RaphiphatSuphakosol.github.io/Pharmatools/assets/pediatric-dosage.json';
    // =====================================================================


    // --- Drug Data (จะถูกโหลดจาก GitHub Pages) ---
    let allDrugs = []; // เริ่มต้นด้วยอาร์เรย์ว่างเปล่า

    // --- State Variables ---
    let displayDrugs = [];
    let editModeEnabled = false;
    let firstSearchDone = false;

    // --- Helper Functions ---

    function createDrugInstance(drugTemplate) {
        // ค้นหา initialConcentration object โดยใช้ mgPerMl
        const initialConcObject = drugTemplate.concentrations.find(
            c => c.mgPerMl === drugTemplate.initialConcentration
        );
        // ใช้ defaultVolumeMl จาก initialConcObject หรือค่าเริ่มต้น 60 หากไม่พบ
        const initialVolume = initialConcObject?.defaultVolumeMl || 60;


        return {
            name: drugTemplate.name,
            concentrations: drugTemplate.concentrations,
            currentConcentration: drugTemplate.initialConcentration, // initialConcentration เป็นค่า mgPerMl อยู่แล้ว
            dosageOptions: drugTemplate.dosageOptions,
            currentDosageOption: { ...drugTemplate.initialDosageOption }, // ใช้ initialDosageOption ที่สร้างเป็น object เต็มๆ แล้ว
            frequencyOptions: drugTemplate.frequencyOptions,
            currentFrequencyOption: { ...drugTemplate.initialFrequencyOption }, // ใช้ initialFrequencyOption ที่สร้างเป็น object เต็มๆ แล้ว
            dispenseType: drugTemplate.dispenseType || "regular",
            packageSizes: drugTemplate.packageSizes || [],
            currentVolumePerBottle: initialVolume
        };
    }

    function calculateVolumeFromDoseAndConc(doseMg, concentrationMgPerMl) {
        if (isNaN(doseMg) || doseMg <= 0 || isNaN(concentrationMgPerMl) || concentrationMgPerMl <= 0) {
            return NaN;
        }
        return doseMg / concentrationMgPerMl;
    }

    function convertMlToSpoons(ml) {
        if (isNaN(ml) || ml <= 0) return '0 ช้อนชา';

        const roundToNearestHalf = (num) => Math.round(num * 2) / 2;

        const mlForTablespoon = roundToNearestHalf(ml / ML_PER_TABLESPOON);
        const mlForTeaspoon = roundToNearestHalf(ml / ML_PER_TEASPOON);

        // Calculate actual ML values for comparison
        const actualMlTablespoon = mlForTablespoon * ML_PER_TABLESPOON;
        const actualMlTeaspoon = mlForTeaspoon * ML_PER_TEASPOON;

        // Choose the unit that results in the minimum number of spoons,
        // prioritizing tablespoon if it's 1 or more, otherwise teaspoon.
        // Also ensure the chosen unit value is reasonably close to the original ml.

        // Option 1: Tablespoons
        if (mlForTablespoon >= 1) { // If it's 1 tablespoon or more
            return `${mlForTablespoon} ช้อนโต๊ะ`;
        } else { // If less than 1 tablespoon, try teaspoons
            return `${mlForTeaspoon} ช้อนชา`;
        }
    }

    function renderDrugTags() {
        drugTagsContainer.innerHTML = '';

        if (editModeEnabled) {
            displayDrugs.sort((a, b) => a.name.localeCompare(b.name));

            displayDrugs.forEach((drug) => {
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

    /**
     * Renders (or re-renders) the drug list table.
     */
    function renderDrugList() {
        drugListBody.innerHTML = ''; // Clear existing rows

        let weight = parseFloat(childWeightInput.value);
        let unit = weightUnitSelect.value;
        let weightKg = (unit === 'lbs') ? weight * 0.453592 : weight;
        let treatmentDurationDays = parseInt(treatmentDurationInput.value);

        const isWeightValidAndPositive = !isNaN(weight) && weight > 0;
        const isTreatmentDurationValid = !isNaN(treatmentDurationDays) && treatmentDurationDays > 0;

        // เรียงลำดับ displayDrugs ก่อน render ลงตาราง
        displayDrugs.sort((a, b) => a.name.localeCompare(b.name));

        displayDrugs.forEach((drug, index) => {
            let doseMgDisplay = '';
            let volumeMlRangeDisplay = '';
            let intakeSummaryDisplay = '';
            let dispenseAmountBottlesDisplay = '';

            // ตรวจสอบ currentConcentration ใน concentrations array
            const currentConcObject = drug.concentrations.find(c => c.mgPerMl === drug.currentConcentration);
            const currentConcMgPerMl = currentConcObject ? currentConcObject.mgPerMl : drug.initialConcentration; // Fallback to initial if not found

            const currentMinDosePerKg = drug.currentDosageOption.min;
            const currentMaxDosePerKg = drug.currentDosageOption.max;
            const currentDosesPerDay = drug.currentFrequencyOption.dosesPerDay;
            const currentFrequencyDisplayAndText = `${drug.currentFrequencyOption.display} ${drug.currentFrequencyOption.text || ''}`.trim();
            const currentDoseUnit = drug.currentDosageOption.unit; // mg/dose หรือ mg/day
            const drugDispenseType = drug.dispenseType;
            const currentVolumePerBottle = drug.currentVolumePerBottle;

            let avgVolumePerDose = 0;
            let minTotalDoseMg = 0;
            let maxTotalDoseMg = 0;
            let minDoseMgPerDose = 0;
            let maxDoseMgPerDose = 0;

            if (isWeightValidAndPositive) {
                minTotalDoseMg = currentMinDosePerKg * weightKg;
                maxTotalDoseMg = currentMaxDosePerKg * weightKg;

                // กำหนดหน่วยของขนาดยาที่คำนวณได้ตาม currentDoseUnit
                doseMgDisplay = `<span class="text-info">${minTotalDoseMg.toFixed(2)} - ${maxTotalDoseMg.toFixed(2)}</span><br>${currentDoseUnit}`;

                // คำนวณปริมาตรต่อครั้ง
                if (currentDoseUnit === "mg/dose") {
                    minDoseMgPerDose = minTotalDoseMg;
                    maxDoseMgPerDose = maxTotalDoseMg;
                } else if (currentDoseUnit === "mg/day") {
                    if (currentDosesPerDay > 0) {
                        minDoseMgPerDose = minTotalDoseMg / currentDosesPerDay;
                        maxDoseMgPerDose = maxTotalDoseMg / currentDosesPerDay;
                    } else {
                        minDoseMgPerDose = NaN;
                        maxDoseMgPerDose = NaN;
                    }
                } else {
                    minDoseMgPerDose = NaN;
                    maxDoseMgPerDose = NaN;
                }

                const minVolumeMlPerDose = calculateVolumeFromDoseAndConc(minDoseMgPerDose, currentConcMgPerMl);
                const maxVolumeMlPerDose = calculateVolumeFromDoseAndConc(maxDoseMgPerDose, currentConcMgPerMl);

                if (isNaN(minVolumeMlPerDose) || isNaN(maxVolumeMlPerDose)) {
                    volumeMlRangeDisplay = '<span class="text-danger">คำนวณไม่ได้</span>';
                    intakeSummaryDisplay = '<span class="text-danger">คำนวณไม่ได้</span>';
                    dispenseAmountBottlesDisplay = '<span class="text-danger">คำนวณไม่ได้</span>';
                } else {
                    // เปลี่ยนหน่วยเป็น ml/ครั้ง
                    volumeMlRangeDisplay = `<span class="text-info">${minVolumeMlPerDose.toFixed(2)} - ${maxVolumeMlPerDose.toFixed(2)}</span><br>ml/ครั้ง`;
                    avgVolumePerDose = (minVolumeMlPerDose + maxVolumeMlPerDose) / 2;
                    intakeSummaryDisplay = `<span class="text-info">${convertMlToSpoons(avgVolumePerDose)} ${currentFrequencyDisplayAndText}</span>`;

                    if (drugDispenseType === "regular") {
                        if (isTreatmentDurationValid && currentVolumePerBottle > 0) {
                            const totalVolumeNeededPerDay = (minVolumeMlPerDose + maxVolumeMlPerDose) / 2 * currentDosesPerDay; // ใช้ค่าเฉลี่ยต่อวัน
                            const totalVolumeNeeded = totalVolumeNeededPerDay * treatmentDurationDays;
                            const numberOfBottles = Math.ceil(totalVolumeNeeded / currentVolumePerBottle);
                            dispenseAmountBottlesDisplay = `<span class="text-info">${numberOfBottles}</span> ขวด`;
                        } else {
                            dispenseAmountBottlesDisplay = '<span class="text-info">กรอกระยะเวลา (วัน) และปริมาตรยาต่อขวด</span>';
                        }
                    } else if (drugDispenseType === "PRN") {
                        if (currentVolumePerBottle > 0) {
                            dispenseAmountBottlesDisplay = `<span class="text-info">1</span> ขวด <span class="text-info">(จ่ายตามอาการ)</span>`;
                        } else {
                            dispenseAmountBottlesDisplay = '<span class="text-info">กำหนดปริมาตรยาต่อขวด</span>';
                        }
                    } else {
                        dispenseAmountBottlesDisplay = '<span class="text-info">N/A</span>';
                    }
                }
            } else {
                doseMgDisplay = '<span class="text-info">-</span>';
                volumeMlRangeDisplay = '<span class="text-info">-</span>';
                intakeSummaryDisplay = '<span class="text-info">โปรดกรอกน้ำหนัก</span>';
                dispenseAmountBottlesDisplay = '<span class="text-info">-</span>';
            }

            // --- HTML for native dropdowns (not Select2) ---
            // สร้าง options สำหรับ Concentration
            const concOptions = drug.concentrations.map(conc => {
                const isSelected = conc.mgPerMl === drug.currentConcentration;
                return `<option value="${conc.mgPerMl}" ${isSelected ? 'selected' : ''}>${conc.display}</option>`;
            }).join('');
            const concDropdownHtml = `<select class="form-control table-dropdown" data-drug-index="${index}" data-type="concentration">${concOptions}</select>`;

            // สร้าง HTML สำหรับ Volume Per Bottle Input
            const volumePerBottleInputHtml = `
                <input type="number" class="form-control form-control-sm volume-per-bottle-input no-spin-buttons"
                        data-drug-index="${index}"
                        value="${currentVolumePerBottle}" step="1" min="1">
                <span> ml</span>
            `;

            // สร้าง options สำหรับ Dosage
            const dosageOptions = drug.dosageOptions.map(option => `
                <option value="${option.min}-${option.max}-${option.unit}" ${option.min === drug.currentDosageOption.min && option.max === drug.currentDosageOption.max && option.unit === drug.currentDosageOption.unit ? 'selected' : ''}>
                    ${option.display}
                </option>
            `).join('');
            const dosageDropdownHtml = `<select class="form-control table-dropdown" data-drug-index="${index}" data-type="dosage">${dosageOptions}</select>`;

            // สร้าง options สำหรับ Frequency
            const frequencyOptions = drug.frequencyOptions.map(option => `
                <option value="${option.dosesPerDay}" ${option.dosesPerDay === drug.currentFrequencyOption.dosesPerDay ? 'selected' : ''}>
                    ${option.display} ${option.text || ''}
                </option>
            `).join('');
            const frequencyDropdownHtml = `<select class="form-control table-dropdown" data-drug-index="${index}" data-type="frequency">${frequencyOptions}</select>`;

            // --- End HTML for native dropdowns ---

            const row = drugListBody.insertRow();
            const drugNameCell = row.insertCell(0);
            drugNameCell.textContent = drug.name;
            drugNameCell.classList.add('sticky-col');

            row.insertCell(1).innerHTML = concDropdownHtml;
            row.insertCell(2).innerHTML = volumePerBottleInputHtml;
            row.insertCell(3).innerHTML = dosageDropdownHtml;
            row.insertCell(4).innerHTML = frequencyDropdownHtml;
            row.insertCell(5).innerHTML = doseMgDisplay;
            row.insertCell(6).innerHTML = volumeMlRangeDisplay;
            row.insertCell(7).innerHTML = intakeSummaryDisplay;
            row.insertCell(8).innerHTML = dispenseAmountBottlesDisplay;
        });
    }

    // --- Event Listeners Setup ---
    function setupEventListeners() {
        childWeightInput.addEventListener('input', renderDrugList);
        weightUnitSelect.addEventListener('change', renderDrugList);
        treatmentDurationInput.addEventListener('input', renderDrugList);

        // Event delegation for native dropdowns in the table
        document.addEventListener('change', function(event) {
            if (event.target.classList.contains('table-dropdown')) {
                const target = event.target;
                const drugIndex = parseInt(target.dataset.drugIndex);
                const drugType = target.dataset.type;

                // ค้นหา drug ที่ถูกต้องจากชื่อยา หลังจากที่ displayDrugs ถูก sort ไปแล้ว
                const drugName = displayDrugs[drugIndex].name;
                const drugToUpdate = displayDrugs.find(d => d.name === drugName);


                if (drugToUpdate) {
                    if (drugType === 'concentration') {
                        const selectedConcMgPerMl = parseFloat(target.value);
                        drugToUpdate.currentConcentration = selectedConcMgPerMl;
                        const selectedConcObject = drugToUpdate.concentrations.find(c => c.mgPerMl === selectedConcMgPerMl);
                        // อัปเดต currentVolumePerBottle ให้ตรงกับ defaultVolumeMl ของความเข้มข้นที่เลือก
                        drugToUpdate.currentVolumePerBottle = selectedConcObject?.defaultVolumeMl || 60;
                    } else if (drugType === 'dosage') {
                        const selectedValueParts = target.value.split('-');
                        const selectedDisplay = target.options[target.selectedIndex].text;
                        drugToUpdate.currentDosageOption = {
                            min: parseFloat(selectedValueParts[0]),
                            max: parseFloat(selectedValueParts[1]),
                            unit: selectedValueParts[2],
                            display: selectedDisplay
                        };
                    } else if (drugType === 'frequency') {
                        const selectedDosesPerDay = parseInt(target.value);
                        const foundFreqOption = drugToUpdate.frequencyOptions.find(opt => opt.dosesPerDay === selectedDosesPerDay);
                        if (foundFreqOption) {
                            drugToUpdate.currentFrequencyOption = foundFreqOption;
                        }
                    }
                    renderDrugList();
                }
            }
        });

        // Delegation for volume per bottle input
        document.addEventListener('input', function(event) {
            if (event.target.classList.contains('volume-per-bottle-input')) {
                const target = event.target;
                const drugIndex = parseInt(target.dataset.drugIndex);
                // ค้นหา drug ที่ถูกต้องจากชื่อยา หลังจากที่ displayDrugs ถูก sort ไปแล้ว
                const drugName = displayDrugs[drugIndex].name;
                const drugToUpdate = displayDrugs.find(d => d.name === drugName);
                const newValue = parseFloat(target.value);

                if (drugToUpdate && !isNaN(newValue) && newValue >= 1) {
                    drugToUpdate.currentVolumePerBottle = newValue;
                    renderDrugList();
                }
            }
        });

        // Event listener for removing drug tags
        drugTagsContainer.addEventListener('click', function(event) {
            if (event.target.classList.contains('remove-tag-btn') || event.target.closest('.remove-tag-btn')) {
                const button = event.target.classList.contains('remove-tag-btn') ? event.target : event.target.closest('.remove-tag-btn');
                const drugNameToRemove = button.dataset.drugName;
                const indexToRemove = displayDrugs.findIndex(d => d.name === drugNameToRemove);

                if (indexToRemove !== -1) {
                    displayDrugs.splice(indexToRemove, 1);
                    if (displayDrugs.length === 0) {
                        // หากไม่มียาเหลืออยู่ ให้กลับไปแสดงยาทั้งหมดเป็นค่าเริ่มต้น (เรียง A-Z ด้วย)
                        displayDrugs = allDrugs.map(drugTemplate => createDrugInstance(drugTemplate));
                        displayDrugs.sort((a, b) => a.name.localeCompare(b.name));
                        editModeEnabled = false;
                        firstSearchDone = false;
                    }
                    renderDrugTags();
                    renderDrugList();
                }
            }
        });

        // Event listener for drug search input (Select2)
        drugSearchInput.on('select2:select', function (e) {
            const selectedDrugName = e.params.data.id;
            if (!selectedDrugName) { return; }

            const drugToAdd = allDrugs.find(d => d.name.toLowerCase() === selectedDrugName.toLowerCase());
            if (drugToAdd) {
                if (!firstSearchDone || !editModeEnabled) {
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
            // Clear the Select2 input after selection
            $(this).val(null).trigger('change');
        });
    }


    // --- ฟังก์ชันสำหรับดึงข้อมูลยาจาก GitHub Pages ---
    async function fetchDrugData() {
        try {
            const response = await fetch(DRUG_DATA_URL);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status} from ${DRUG_DATA_URL}`);
            }
            allDrugs = await response.json();
            console.log("Drug data loaded successfully from GitHub Pages:", allDrugs);
            initializeApplication(); // เรียก initializeApplication หลังจากโหลดข้อมูลเสร็จ
        } catch (error) {
            console.error("Error fetching drug data from GitHub Pages:", error);
            // Fallback: ถ้าโหลดไม่ได้ ให้ใช้ข้อมูลยาแบบ embedded เก่า (ใส่ข้อมูลสำรองไว้ตรงนี้)
            allDrugs = [
                [
  {
    "name": "Paracetamol",
    "dispenseType": "PRN",
    "packageSizes": [
      60
    ],
    "concentrations": [
      {
        "display": "60mg/0.6ml",
        "mgPerMl": 100,
        "defaultVolumeMl": 15
      },
      {
        "display": "80mg/0.8ml",
        "mgPerMl": 100,
        "defaultVolumeMl": 15
      },
      {
        "display": "100 mg/1ml",
        "mgPerMl": 100,
        "defaultVolumeMl": 15
      },
      {
        "display": "120mg/5ml",
        "mgPerMl": 24,
        "defaultVolumeMl": 60
      },
      {
        "display": "125mg/5ml",
        "mgPerMl": 25,
        "defaultVolumeMl": 60
      },
      {
        "display": "160mg/5ml",
        "mgPerMl": 32,
        "defaultVolumeMl": 60
      },
      {
        "display": "250mg/5ml",
        "mgPerMl": 50,
        "defaultVolumeMl": 60
      }
    ],
    "dosageOptions": [
      {
        "display": "10-15 mg/kg/dose",
        "min": 10,
        "max": 15,
        "unit": "mg/dose"
      }
    ],
    "frequencyOptions": [
      {
        "display": "ทุก 4-6 ชั่วโมง",
        "dosesPerDay": 4,
        "text": "(ไม่เกิน 5 ครั้ง/วัน)",
        "frequencyText": "ทุก 4-6 ชม. เมื่อมีไข้หรือปวด"
      }
    ],
    "initialDosageOption": {
      "display": "10-15 mg/kg/dose",
      "min": 10,
      "max": 15,
      "unit": "mg/dose"
    },
    "initialFrequencyOption": {
      "display": "ทุก 4-6 ชั่วโมง",
      "dosesPerDay": 4,
      "text": "(ไม่เกิน 5 ครั้ง/วัน)",
      "frequencyText": "ทุก 4-6 ชม. เมื่อมีไข้หรือปวด"
    }
  },
  {
    "name": "Amoxicillin",
    "dispenseType": "regular",
    "packageSizes": [
      60
    ],
    "concentrations": [
      {
        "display": "250mg/5ml",
        "mgPerMl": 50,
        "defaultVolumeMl": 60
      },
      {
        "display": "125mg/5ml",
        "mgPerMl": 25,
        "defaultVolumeMl": 60
      }
    ],
    "dosageOptions": [
      {
        "display": "40-50 mg/kg/day",
        "min": 40,
        "max": 50,
        "unit": "mg/day"
      },
      {
        "display": "80-90 mg/kg/day",
        "min": 80,
        "max": 90,
        "unit": "mg/day"
      }
    ],
    "frequencyOptions": [
      {
        "display": "วันละ 1 ครั้ง",
        "dosesPerDay": 1,
        "text": "(เช้า)",
        "frequencyText": "วันละ 1 ครั้ง"
      },
      {
        "display": "วันละ 2 ครั้ง",
        "dosesPerDay": 2,
        "text": "(เช้า-เย็น)",
        "frequencyText": "วันละ 2 ครั้ง"
      },
      {
        "display": "วันละ 3 ครั้ง",
        "dosesPerDay": 3,
        "text": "(เช้า-กลางวัน-เย็น)",
        "frequencyText": "วันละ 3 ครั้ง"
      }
    ],
    "initialDosageOption": {
      "display": "40-50 mg/kg/day",
      "min": 40,
      "max": 50,
      "unit": "mg/day"
    },
    "initialFrequencyOption": {
      "display": "วันละ 2 ครั้ง",
      "dosesPerDay": 2,
      "text": "(เช้า-เย็น)",
      "frequencyText": "วันละ 2 ครั้ง"
    }
  },
  {
    "name": "Ibuprofen",
    "dispenseType": "PRN",
    "packageSizes": [
      60
    ],
    "concentrations": [
      {
        "display": "100mg/5ml",
        "mgPerMl": 20,
        "defaultVolumeMl": 60
      }
    ],
    "dosageOptions": [
      {
        "display": "5-10 mg/kg/dose",
        "min": 5,
        "max": 10,
        "unit": "mg/dose"
      }
    ],
    "frequencyOptions": [
      {
        "display": "ทุก 6-8 ชั่วโมง",
        "dosesPerDay": 3,
        "text": "(ไม่เกิน 4 ครั้ง/วัน)",
        "frequencyText": "ทุก 6-8 ชั่วโมง เมื่อมีไข้หรือปวด"
      }
    ],
    "initialDosageOption": {
      "display": "5-10 mg/kg/dose",
      "min": 5,
      "max": 10,
      "unit": "mg/dose"
    },
    "initialFrequencyOption": {
      "display": "ทุก 6-8 ชั่วโมง",
      "dosesPerDay": 3,
      "text": "(ไม่เกิน 4 ครั้ง/วัน)",
      "frequencyText": "ทุก 6-8 ชั่วโมง เมื่อมีไข้หรือปวด"
    }
  },
  {
    "name": "Dicloxacillin",
    "dispenseType": "regular",
    "packageSizes": [
      60
    ],
    "concentrations": [
      {
        "display": "125mg/5ml",
        "mgPerMl": 25,
        "defaultVolumeMl": 60
      }
    ],
    "dosageOptions": [
      {
        "display": "12.5-25 mg/kg/day",
        "min": 12.5,
        "max": 25,
        "unit": "mg/day"
      }
    ],
    "frequencyOptions": [
      {
        "display": "วันละ 4 ครั้ง",
        "dosesPerDay": 4,
        "text": "(ก่อนอาหาร เช้า เที่ยง เย็น ก่อนนอน)",
        "frequencyText": "วันละ 4 ครั้ง"
      }
    ],
    "initialDosageOption": {
      "display": "12.5-25 mg/kg/day",
      "min": 12.5,
      "max": 25,
      "unit": "mg/day"
    },
    "initialFrequencyOption": {
      "display": "วันละ 4 ครั้ง",
      "dosesPerDay": 4,
      "text": "(ก่อนอาหาร เช้า เที่ยง เย็น ก่อนนอน)",
      "frequencyText": "วันละ 4 ครั้ง"
    }
  },
  {
    "name": "Diphenhydramine ",
    "dispenseType": "PRN",
    "packageSizes": [
      60
    ],
    "concentrations": [
      {
        "display": "12.5mg/5ml",
        "mgPerMl": 2.5,
        "defaultVolumeMl": 60
      }
    ],
    "dosageOptions": [
      {
        "display": "1-2 mg/kg/dose",
        "min": 1,
        "max": 2,
        "unit": "mg/dose"
      }
    ],
    "frequencyOptions": [
      {
        "display": "วันละ 3 ครั้ง",
        "dosesPerDay": 3,
        "text": "(เช้า เที่ยง เย็น)",
        "frequencyText": "วันละ 3 ครั้ง"
      }
    ],
    "initialDosageOption": {
      "display": "1-2 mg/kg/dose",
      "min": 1,
      "max": 2,
      "unit": "mg/dose"
    },
    "initialFrequencyOption": {
      "display": "วันละ 3 ครั้ง",
      "dosesPerDay": 3,
      "text": "(เช้า เที่ยง เย็น)",
      "frequencyText": "วันละ 3 ครั้ง"
    }
  },
  {
    "name": "Hydroxyzine",
    "dispenseType": "PRN",
    "packageSizes": [
      60
    ],
    "concentrations": [
      {
        "display": "10mg/5ml",
        "mgPerMl": 2,
        "defaultVolumeMl": 60
      }
    ],
    "dosageOptions": [
      {
        "display": "0.6 mg/kg/day",
        "min": 0.6,
        "max": 0.6,
        "unit": "mg/day"
      }
    ],
    "frequencyOptions": [
      {
        "display": "วันละ 2 ครั้ง",
        "dosesPerDay": 2,
        "text": "(เช้า-เย็น)",
        "frequencyText": "วันละ 2 ครั้ง"
      },
      {
        "display": "วันละ 3 ครั้ง",
        "dosesPerDay": 3,
        "text": "(เช้า-กลางวัน-เย็น)",
        "frequencyText": "วันละ 3 ครั้ง"
      }
    ],
    "initialDosageOption": {
      "display": "0.6 mg/kg/day",
      "min": 0.6,
      "max": 0.6,
      "unit": "mg/day"
    },
    "initialFrequencyOption": {
      "display": "วันละ 2 ครั้ง",
      "dosesPerDay": 2,
      "text": "(เช้า-เย็น)",
      "frequencyText": "วันละ 2 ครั้ง"
    }
  },
  {
    "name": "Cetirizine",
    "dispenseType": "PRN",
    "packageSizes": [
      60
    ],
    "concentrations": [
      {
        "display": "5mg/5ml",
        "mgPerMl": 1,
        "defaultVolumeMl": 60
      }
    ],
    "dosageOptions": [
      {
        "display": "0.25 mg/kg/day",
        "min": 0.25,
        "max": 0.25,
        "unit": "mg/day"
      }
    ],
    "frequencyOptions": [
      {
        "display": "วันละ 1 ครั้ง",
        "dosesPerDay": 1,
        "text": "(ก่อนนอน)",
        "frequencyText": "วันละ 1 ครั้ง"
      }
    ],
    "initialDosageOption": {
      "display": "0.25 mg/kg/day",
      "min": 0.25,
      "max": 0.25,
      "unit": "mg/day"
    },
    "initialFrequencyOption": null
  },
  {
    "name": "Chlorpheniramine",
    "dispenseType": "PRN",
    "packageSizes": [
      60
    ],
    "concentrations": [
      {
        "display": "2mg/5ml",
        "mgPerMl": 0.4,
        "defaultVolumeMl": 60
      }
    ],
    "dosageOptions": [
      {
        "display": "0.35 mg/kg/day",
        "min": 0.35,
        "max": 0.35,
        "unit": "mg/day"
      }
    ],
    "frequencyOptions": [
      {
        "display": "วันละ 3 ครั้ง",
        "dosesPerDay": 3,
        "text": "(เช้า-กลางวัน-เย็น)",
        "frequencyText": "วันละ 3 ครั้ง"
      }
    ],
    "initialDosageOption": {
      "display": "0.35 mg/kg/day",
      "min": 0.35,
      "max": 0.35,
      "unit": "mg/day"
    },
    "initialFrequencyOption": {
      "display": "วันละ 3 ครั้ง",
      "dosesPerDay": 3,
      "text": "(เช้า-กลางวัน-เย็น)",
      "frequencyText": "วันละ 3 ครั้ง"
    }
  },
  {
    "name": "Brompheniramine",
    "dispenseType": "PRN",
    "packageSizes": [
      60
    ],
    "concentrations": [
      {
        "display": "2mg/5ml",
        "mgPerMl": 0.4,
        "defaultVolumeMl": 60
      },
      {
        "display": "4mg/5ml",
        "mgPerMl": 0.8,
        "defaultVolumeMl": 60
      }
    ],
    "dosageOptions": [
      {
        "display": "0.5 mg/kg/day",
        "min": 0.5,
        "max": 0.5,
        "unit": "mg/day"
      }
    ],
    "frequencyOptions": [
      {
        "display": "วันละ 3 ครั้ง",
        "dosesPerDay": 3,
        "text": "(เช้า-กลางวัน-เย็น)",
        "frequencyText": "วันละ 3 ครั้ง"
      }
    ],
    "initialDosageOption": {
      "display": "0.5 mg/kg/day",
      "min": 0.5,
      "max": 0.5,
      "unit": "mg/day"
    },
    "initialFrequencyOption": {
      "display": "วันละ 3 ครั้ง",
      "dosesPerDay": 3,
      "text": "(เช้า-กลางวัน-เย็น)",
      "frequencyText": "วันละ 3 ครั้ง"
    }
  },
  {
    "name": "Domperidone",
    "dispenseType": "PRN",
    "packageSizes": [
      60
    ],
    "concentrations": [
      {
        "display": "5mg/5ml",
        "mgPerMl": 1,
        "defaultVolumeMl": 60
      }
    ],
    "dosageOptions": [
      {
        "display": "0.2-0.4 mg/kg/day",
        "min": 0.2,
        "max": 0.4,
        "unit": "mg/dose"
      }
    ],
    "frequencyOptions": [
      {
        "display": "วันละ 3 ครั้ง",
        "dosesPerDay": 3,
        "text": "(เช้า-กลางวัน-เย็น)",
        "frequencyText": "วันละ 3 ครั้ง"
      }
    ],
    "initialDosageOption": null,
    "initialFrequencyOption": {
      "display": "วันละ 3 ครั้ง",
      "dosesPerDay": 3,
      "text": "(เช้า-กลางวัน-เย็น)",
      "frequencyText": "วันละ 3 ครั้ง"
    }
  },
  {
    "name": "Gauifenesin (<2 y)",
    "dispenseType": "PRN",
    "packageSizes": [
      60
    ],
    "concentrations": [
      {
        "display": "13.3mg/5ml",
        "mgPerMl": 2.66,
        "defaultVolumeMl": 60
      }
    ],
    "dosageOptions": [
      {
        "display": "12 mg/kg/day",
        "min": 12,
        "max": 12,
        "unit": "mg/day"
      }
    ],
    "frequencyOptions": [
      {
        "display": "วันละ 3 ครั้ง",
        "dosesPerDay": 3,
        "text": "(เช้า-กลางวัน-เย็น)",
        "frequencyText": "วันละ 3 ครั้ง"
      }
    ],
    "initialDosageOption": {
      "display": "12 mg/kg/day",
      "min": 12,
      "max": 12,
      "unit": "mg/day"
    },
    "initialFrequencyOption": {
      "display": "วันละ 3 ครั้ง",
      "dosesPerDay": 3,
      "text": "(เช้า-กลางวัน-เย็น)",
      "frequencyText": "วันละ 3 ครั้ง"
    }
  }
            ];
            initializeApplication(); // เรียก initializeApplication ด้วยข้อมูล fallback
        }
    }

    // --- Initial Application Load ---
    function initializeApplication() {
        // ตรวจสอบว่า allDrugs มีข้อมูลแล้วหรือไม่
        if (allDrugs.length === 0) {
            console.warn("allDrugs is empty when initializeApplication is called. Data fetching might have failed or is still in progress.");
            // หากเกิดข้อผิดพลาดในการโหลดข้อมูล (เช่น ไฟล์ไม่มีหรือ URL ผิด)
            // อาจจะต้องการแสดงข้อความแจ้งเตือนผู้ใช้ หรือใช้ข้อมูลสำรอง
            // ในที่นี้ ถ้า allDrugs ยังว่างอยู่หลังจาก fetch แล้ว ให้ใช้ข้อมูลสำรองที่ระบุใน catch block
            return; // ไม่ต้องทำต่อหากข้อมูลยังไม่พร้อม
        }


        if (displayDrugs.length === 0) {
            displayDrugs = allDrugs.map(drugTemplate => createDrugInstance(drugTemplate));
            displayDrugs.sort((a, b) => a.name.localeCompare(b.name)); // เรียงลำดับเริ่มต้น
            editModeEnabled = false;
            firstSearchDone = false;
        }

        renderDrugList();
        renderDrugTags();
        setupEventListeners();

        // Initialize Select2 for the main drug search input
        // เรียงลำดับข้อมูลสำหรับ Select2
        const sortedDrugData = allDrugs
            .map(drug => ({ id: drug.name, text: drug.name }))
            .sort((a, b) => a.text.localeCompare(b.text));

        drugSearchInput.select2({
            placeholder: "พิมพ์ชื่อยาเพื่อค้นหา...",
            allowClear: true,
            data: sortedDrugData, // ใช้ข้อมูลที่เรียงลำดับแล้ว
            theme: "default",
            width: '100%',
            dropdownParent: $('.drug-search-section')
        });

        // สำคัญ: เคลียร์ค่า Select2 ในตอนเริ่มต้นเพื่อให้ Placeholder แสดง
        drugSearchInput.val(null).trigger('change');
    }

    // เรียกฟังก์ชันดึงข้อมูลเมื่อ DOM โหลดเสร็จ
    // initializeApplication() จะถูกเรียกหลังจากข้อมูลถูกโหลดสำเร็จภายใน fetchDrugData()
    fetchDrugData();
});
