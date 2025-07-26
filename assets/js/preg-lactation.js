document.addEventListener('DOMContentLoaded', function() {
    // =========================================================
    // === RESTRICTED DRUGS TABLE ===
    // =========================================================

    let drugsData = []; // Data for restricted drugs
    let allTreatmentData = []; // Data for treatment guidelines

    // Function to fetch data from JSON file
    async function fetchData() {
        try {
            // Fetch the single combined JSON file
            const response = await fetch('assets/preg-lactation.json');
            const combinedData = await response.json();

            // Assign data to respective variables
            drugsData = combinedData.restrictedDrugs || [];
            allTreatmentData = combinedData.treatmentGuidelines || [];

            // Initialize tables after data is loaded
            initializeRestrictedDrugsTable();
            initializeTreatmentGuidelinesTable();
        } catch (error) {
            console.error('Error fetching data:', error);
            // Display error message to user
            document.getElementById('restricted-drugs-table-body').innerHTML = '<tr><td colspan="5" style="text-align: center; color: red;">ข้อผิดพลาดในการโหลดข้อมูลยา กรุณาลองใหม่ภายหลัง</td></tr>';
            document.querySelector('.treatment-table-container tbody').innerHTML = '<tr><td colspan="3" style="text-align: center; color: red;">ข้อผิดพลาดในการโหลดข้อมูลคำแนะนำ กรุณาลองใหม่ภายหลัง</td></tr>';
        }
    }

    const tableBody = document.getElementById('restricted-drugs-table-body');
    const drugSearchInput = $('#drug-search-input');
    const selectedDrugTagsContainer = document.getElementById('selected-drug-tags');
    const drugReferencesList = document.getElementById('drug-references-list');

    const entriesPerPageSelect = document.getElementById('entries-per-page');
    const paginationControls = document.getElementById('pagination-controls');
    const paginationInfo = document.getElementById('pagination-info');

    let selectedDrugs = [];
    let currentPage = 1;
    let rowsPerPage = 5;
    let currentSortColumn = 'name';
    let sortDirection = 'asc';
    let sortedDrugsData = []; // Initialized empty, will be set after fetch

    function sortData(column, direction) {
        sortedDrugsData.sort((a, b) => {
            let valA = a[column] || '';
            let valB = b[column] || '';

            if (typeof valA === 'string' && typeof valB === 'string') {
                return direction === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(a);
            }
            if (valA < valB) return direction === 'asc' ? -1 : 1;
            if (valA > valB) return direction === 'asc' ? 1 : -1;
            return 0;
        });
    }

    function renderTable(filterNames = [], page = 1) {
        tableBody.innerHTML = '';

        let drugsToDisplay = filterNames.length > 0
            ? sortedDrugsData.filter(drug => filterNames.includes(drug.name))
            : sortedDrugsData;

        const totalRows = drugsToDisplay.length;
        const totalPages = rowsPerPage === 'all' ? 1 : Math.ceil(totalRows / rowsPerPage);

        currentPage = (page > totalPages && totalPages > 0) ? totalPages : (totalPages === 0 ? 0 : page);

        let paginatedDrugs = rowsPerPage === 'all'
            ? drugsToDisplay
            : drugsToDisplay.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

        if (paginatedDrugs.length === 0) {
            tableBody.innerHTML = `<td colspan="5" style="text-align: center; color: red;">ไม่พบข้อมูลยาที่คุณค้นหา</td>`;
            renderPaginationControls(0, 0);
            renderPaginationInfo(0, 0, rowsPerPage);
            renderReferences([]);
            return;
        }

        const referencesForDisplay = [];
        let refCounter = 1;

        paginatedDrugs.forEach(drug => {
            const row = document.createElement('tr');
            row.id = `drug-row-${drug.name.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}`;

            let drugNameHtml = drug.name;
            if (drug.references && drug.references.length > 0) {
                const refNumbers = [];
                drug.references.forEach(refText => {
                    const existingRefIndex = referencesForDisplay.findIndex(item => item.text === refText);
                    if (existingRefIndex === -1) {
                        const refId = `ref-${refCounter}`;
                        referencesForDisplay.push({ id: refId, text: refText });
                        refNumbers.push(refCounter);
                        refCounter++;
                    } else {
                        refNumbers.push(referencesForDisplay[existingRefIndex].id.split('-')[1]);
                    }
                });
                drugNameHtml += `<sup>${refNumbers.map(num => `<a href="#ref-${num}">${num}</a>`).join(',')}</sup>`;
            }

            row.innerHTML = `
                <td data-label="ชื่อรายการยา">${drugNameHtml}</td>
                <td data-label="Preg Cat.">${drug.pregnancy}</td>
                <td data-label="ข้อมูลการให้ยาในหญิงตั้งครรภ์">${drug.pregnancyInfo}</td>
                <td data-label="Lactation Cat.">${drug.lactation}</td>
                <td data-label="ข้อมูลการให้ยาในหญิงให้นมบุตร">${drug.lactationInfo}</td>
            `;
            tableBody.appendChild(row);
        });

        const headers = document.querySelectorAll('#restricted-drugs-table th.sortable');
        headers.forEach(header => {
            const icon = header.querySelector('.sort-icon');
            header.removeAttribute('data-sort-active');

            if (header.dataset.sortBy === currentSortColumn) {
                header.setAttribute('data-sort-active', 'true');
                icon.className = sortDirection === 'asc' ? 'sort-icon fas fa-sort-up' : 'sort-icon fas fa-sort-down';
            } else {
                icon.className = 'sort-icon fas fa-sort';
            }
        });

        renderPaginationControls(totalPages, currentPage);
        renderPaginationInfo(totalRows, currentPage, rowsPerPage);
        renderReferences(referencesForDisplay);
    }

    function renderReferences(references) {
        drugReferencesList.innerHTML = '';
        if (references.length === 0) {
            document.getElementById('drug-references-section').style.display = 'none';
            return;
        }
        document.getElementById('drug-references-section').style.display = 'block';

        references.forEach(ref => {
            const li = document.createElement('li');
            li.id = ref.id;
            li.textContent = ref.text;
            drugReferencesList.appendChild(li);
        });
    }

    function renderPaginationControls(totalPages, currentPage) {
        paginationControls.innerHTML = '';

        if (totalPages <= 1 && rowsPerPage !== 'all') {
            paginationControls.style.display = 'none';
            return;
        }
        paginationControls.style.display = 'flex';

        const prevLi = document.createElement('li');
        prevLi.classList.add('page-item');
        if (currentPage <= 1) prevLi.classList.add('disabled');
        prevLi.innerHTML = `<a class="page-link" href="#" data-page="${currentPage - 1}">ก่อนหน้า</a>`;
        paginationControls.appendChild(prevLi);

        let startPage, endPage;
        if (totalPages <= 5) {
            startPage = 1;
            endPage = totalPages;
        } else {
            if (currentPage <= 3) {
                startPage = 1;
                endPage = 5;
            } else if (currentPage + 2 >= totalPages) {
                startPage = totalPages - 4;
                endPage = totalPages;
            } else {
                startPage = currentPage - 2;
                endPage = currentPage + 2;
            }
        }

        if (startPage > 1) {
            paginationControls.appendChild(Object.assign(document.createElement('li'), { innerHTML: `<a class="page-link" href="#" data-page="1">1</a>` }));
            if (startPage > 2) paginationControls.appendChild(Object.assign(document.createElement('li'), { innerHTML: `<span class="page-link">...</span>` }));
        }

        for (let i = startPage; i <= endPage; i++) {
            const li = document.createElement('li');
            li.classList.add('page-item');
            if (i === currentPage) li.classList.add('active');
            li.innerHTML = `<a class="page-link" href="#" data-page="${i}">${i}</a>`;
            paginationControls.appendChild(li);
        }

        if (endPage < totalPages) {
            if (endPage < totalPages - 1) paginationControls.appendChild(Object.assign(document.createElement('li'), { innerHTML: `<span class="page-link">...</span>` }));
            paginationControls.appendChild(Object.assign(document.createElement('li'), { innerHTML: `<a class="page-link" href="#" data-page="${totalPages}">${totalPages}</a>` }));
        }

        const nextLi = document.createElement('li');
        nextLi.classList.add('page-item');
        if (currentPage >= totalPages) nextLi.classList.add('disabled');
        nextLi.innerHTML = `<a class="page-link" href="#" data-page="${currentPage + 1}">ถัดไป</a>`;
        paginationControls.appendChild(nextLi);

        paginationControls.querySelectorAll('.page-link').forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                const newPage = parseInt(this.dataset.page);
                if (!this.closest('.page-item').classList.contains('disabled') && newPage !== currentPage) {
                    currentPage = newPage;
                    renderTable(selectedDrugs.length > 0 ? selectedDrugs : [], currentPage);
                }
            });
        });
    }

    function renderPaginationInfo(totalRows, currentPage, rowsPerPage) {
        if (totalRows === 0) {
            paginationInfo.textContent = 'ไม่พบข้อมูล';
            return;
        }

        if (rowsPerPage === 'all') {
            paginationInfo.textContent = `แสดงทั้งหมด ${totalRows} รายการ`;
        } else {
            let startEntry = (currentPage - 1) * rowsPerPage + 1;
            let endEntry = currentPage * rowsPerPage;
            if (endEntry > totalRows) {
                endEntry = totalRows;
            }
            paginationInfo.textContent = `แสดง ${startEntry} ถึง ${endEntry} จาก ${totalRows} รายการ`;
        }
    }

    function renderSelectedTags() {
        selectedDrugTagsContainer.innerHTML = '';
        selectedDrugs.forEach(drugName => {
            const tag = document.createElement('span');
            tag.classList.add('selected-tag');
            tag.innerHTML = `
                <span>${drugName}</span>
                <button type="button" class="remove-tag-btn" data-drug-name="${drugName}">
                    <img src="image/remove_icon_red.png" alt="Remove" style="width: 16px; height: 16px;">
                </button>
            `;
            tag.dataset.drugName = drugName;
            selectedDrugTagsContainer.appendChild(tag);
        });
        selectedDrugTagsContainer.style.display = selectedDrugs.length > 0 ? 'flex' : 'none';
    }

    function setupRestrictedDrugsEventListeners() {
        drugSearchInput.on('select2:select', function (e) {
            const selectedSearchTerm = e.params.data.id;
            if (!selectedSearchTerm) return;

            const matchingDrug = drugsData.find(d =>
                d.name === selectedSearchTerm ||
                (d.keywords && d.keywords.includes(selectedSearchTerm))
            );

            if (matchingDrug) {
                if (!selectedDrugs.includes(matchingDrug.name)) {
                    selectedDrugs.push(matchingDrug.name);
                }
                renderSelectedTags();
                currentPage = 1;
                renderTable(selectedDrugs, currentPage);
            }
            // Clear the input after selection to allow new searches
            $(this).val(null).trigger('change');
            // Ensure the dropdown closes after selection
            $(this).select2('close');
        });

        // Add event listener for when the dropdown is opened
        drugSearchInput.on('select2:opening', function() {
            // Ensure the input is cleared when opening to prevent stale text
            $(this).val(null).trigger('change');
        });

        // Add event listener for when the dropdown is closed
        // This can help re-focus or prevent issues if Select2 doesn't clean up properly
        drugSearchInput.on('select2:close', function() {
            // Optional: Re-focus the input if needed, but often not necessary
            // $(this).focus();
        });


        selectedDrugTagsContainer.addEventListener('click', function(event) {
            const button = event.target.closest('.remove-tag-btn');
            if (button) {
                const tag = button.closest('.selected-tag');
                if (tag) {
                    const drugNameToRemove = tag.dataset.drugName;
                    selectedDrugs = selectedDrugs.filter(name => name !== drugNameToRemove);

                    currentPage = 1;

                    renderTable(selectedDrugs.length === 0 ? [] : selectedDrugs, currentPage);
                    renderSelectedTags();
                }
            }
        });

        entriesPerPageSelect.addEventListener('change', function() {
            rowsPerPage = this.value === 'all' ? 'all' : parseInt(this.value);
            currentPage = 1;
            renderTable(selectedDrugs.length > 0 ? selectedDrugs : [], currentPage);
        });

        document.querySelectorAll('#restricted-drugs-table th.sortable').forEach(header => {
            header.addEventListener('click', function() {
                const column = this.dataset.sortBy;
                sortDirection = currentSortColumn === column ? (sortDirection === 'asc' ? 'desc' : 'asc') : 'asc';
                currentSortColumn = column;
                sortData(currentSortColumn, sortDirection);
                currentPage = 1;
                renderTable(selectedDrugs.length > 0 ? selectedDrugs : [], currentPage);
            });
        });
    }

    function initializeRestrictedDrugsTable() {
        sortedDrugsData = [...drugsData];
        const drugDataForSelect2 = [];
        drugsData.forEach(drug => {
            drugDataForSelect2.push({ id: drug.name, text: drug.name });
            if (drug.keywords) {
                drug.keywords.forEach(keyword => {
                    if (!drugDataForSelect2.some(item => item.id === keyword)) {
                         drugDataForSelect2.push({ id: keyword, text: keyword });
                    }
                });
            }
        });

        const uniqueSortedDrugDataForSelect2 = [...new Map(drugDataForSelect2.map(item => [item['id'], item])).values()]
            .sort((a, b) => a.text.localeCompare(b.text));

        drugSearchInput.select2({
            placeholder: "พิมพ์ชื่อยาเพื่อค้นหา...",
            allowClear: true,
            data: uniqueSortedDrugDataForSelect2,
            theme: "default",
            width: '100%',
            dropdownParent: drugSearchInput.closest('.search-container')
        });

        drugSearchInput.val(null).trigger('change');

        setupRestrictedDrugsEventListeners();

        sortData(currentSortColumn, sortDirection);
        renderTable([], currentPage);
        renderSelectedTags();
    }


    // =========================================================
    // === TREATMENT GUIDELINES TABLE ===
    // =========================================================

    const diseaseSearchInput = $('#disease-search-input');
    const selectedDiseaseTagsContainer = document.getElementById('selected-disease-tags');
    const treatmentTableBody = $('.treatment-table-container tbody');
    const entriesPerPageGuidelinesSelect = document.getElementById('entries-per-page-guidelines');
    const paginationGuidelinesControls = document.getElementById('pagination-guidelines');
    const paginationGuidelinesInfo = document.getElementById('pagination-info-guidelines');

    let selectedDiseases = [];
    let currentTreatmentData = [];
    let currentPageGuidelines = 1;
    let entriesPerPageGuidelines = parseInt(entriesPerPageGuidelinesSelect.value);
    let currentSortColumnGuidelines = 'disease';
    let sortDirectionGuidelines = 'asc';

    function sortTreatmentData(column, direction) {
        currentTreatmentData.sort((a, b) => {
            let valA, valB;
            if (column === 'disease') {
                valA = a.disease;
                valB = b.disease;
            } else if (column === 'pregnant-meds') {
                valA = a.pregnant_meds;
                valB = b.pregnant_meds;
            } else if (column === 'lactating-meds') {
                valA = a.lactating_meds;
                valB = b.lactating_meds;
            }
            return direction === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(a);
        });
    }

    function renderSelectedDiseaseTags() {
        selectedDiseaseTagsContainer.innerHTML = '';
        selectedDiseases.forEach(diseaseName => {
            const tag = document.createElement('div');
            tag.classList.add('selected-tag');
            tag.innerHTML = `
                <span>${diseaseName}</span>
                <button type="button" class="remove-tag-btn" data-disease-name="${diseaseName}">
                    <img src="image/remove_icon_red.png" alt="Remove">
                </button>
            `;
            tag.dataset.diseaseName = diseaseName; // Ensure data-disease-name is set on the tag itself
            selectedDiseaseTagsContainer.appendChild(tag);
        });
        selectedDiseaseTagsContainer.style.display = selectedDiseases.length > 0 ? 'flex' : 'none';
    }

    function renderTreatmentTable() {
        treatmentTableBody.empty();

        const totalRows = currentTreatmentData.length;
        const totalPages = entriesPerPageGuidelines === 'all' ? 1 : Math.ceil(totalRows / entriesPerPageGuidelines);

        currentPageGuidelines = (currentPageGuidelines > totalPages && totalPages > 0) ? totalPages : (totalPages === 0 ? 0 : currentPageGuidelines);

        const startIndex = (currentPageGuidelines - 1) * entriesPerPageGuidelines;
        const endIndex = entriesPerPageGuidelines === 'all' ? totalRows : startIndex + entriesPerPageGuidelines;
        const paginatedData = currentTreatmentData.slice(startIndex, endIndex);

        if (paginatedData.length === 0) {
            treatmentTableBody.append('<tr><td colspan="3" style="text-align: center;">ไม่พบข้อมูลตามที่ค้นหา</td></tr>');
        } else {
            paginatedData.forEach(item => {
                const row = `
                    <tr>
                        <td data-label="โรคและอาการ">${item.disease}</td>
                        <td data-label="ยาที่สามารถเลือกใช้ได้ในสตรีตั้งครรภ์">${formatMedications(item.pregnant_meds)}</td>
                        <td data-label="ยาที่สามารถเลือกใช้ได้ในหญิงให้นมบุตร">${formatMedications(item.lactating_meds)}</td>
                    </tr>
                `;
                treatmentTableBody.append(row);
            });
        }

        document.querySelectorAll('.treatment-table-container th.sortable').forEach(header => {
            const icon = header.querySelector('.sort-icon');
            header.removeAttribute('data-sort-active');
            if (header.dataset.sortBy === currentSortColumnGuidelines) {
                header.setAttribute('data-sort-active', 'true');
                icon.className = sortDirectionGuidelines === 'asc' ? 'sort-icon fas fa-sort-up' : 'sort-icon fas fa-sort-down';
            } else {
                icon.className = 'sort-icon fas fa-sort';
            }
        });

        updatePaginationGuidelines();
        updatePaginationInfoGuidelines();
    }

    function formatMedications(medicationsString) {
        if (!medicationsString) return '';

        const medicationParts = medicationsString.split(',').map(part => part.trim());
        let formattedParts = [];

        medicationParts.forEach(part => {
            let currentText = part;
            const sortedDrugsData = [...drugsData].sort((a, b) => b.name.length - a.name.length);

            for (const drug of sortedDrugsData) {
                const escapedDrugName = drug.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const nameRegex = new RegExp(`\\b(${escapedDrugName})\\b`, 'i');

                if (nameRegex.test(currentText) && !currentText.includes('<span class="clickable-medication"')) {
                    currentText = currentText.replace(nameRegex, `<span class="clickable-medication" data-med-name="${drug.name.trim()}">$1</span>`);
                } else if (drug.keywords && drug.keywords.length > 0) {
                    const sortedKeywords = [...drug.keywords].sort((a, b) => b.length - a.length);
                    for (const keyword of sortedKeywords) {
                        if (keyword === drug.name) continue;
                        const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                        const keywordRegex = new RegExp(`\\b(${escapedKeyword})\\b`, 'i');
                        if (keywordRegex.test(currentText) && !currentText.includes('<span class="clickable-medication"')) {
                            currentText = currentText.replace(keywordRegex, `<span class="clickable-medication" data-med-name="${drug.name.trim()}">$1</span>`);
                            break;
                        }
                    }
                }
            }
            formattedParts.push(currentText);
        });

        return formattedParts.join(', ');
    }

    function filterTreatmentTable() {
        currentTreatmentData = selectedDiseases.length === 0
            ? allTreatmentData
            : allTreatmentData.filter(item => selectedDiseases.some(selectedDisease =>
                item.disease.toLowerCase().includes(selectedDisease.toLowerCase())
            ));
        currentPageGuidelines = 1;
        sortTreatmentData(currentSortColumnGuidelines, sortDirectionGuidelines);
        renderTreatmentTable();
    }

    function updatePaginationGuidelines() {
        paginationGuidelinesControls.innerHTML = '';
        const totalPages = entriesPerPageGuidelines === 'all' ? 1 : Math.ceil(currentTreatmentData.length / entriesPerPageGuidelines);

        if (totalPages <= 1 && entriesPerPageGuidelines !== 'all') {
            paginationGuidelinesControls.style.display = 'none';
            return;
        }
        paginationGuidelinesControls.style.display = 'flex';

        const prevLi = document.createElement('li');
        prevLi.classList.add('page-item');
        if (currentPageGuidelines <= 1) prevLi.classList.add('disabled');
        prevLi.innerHTML = `<a class="page-link" href="#" data-page="${currentPageGuidelines - 1}">ก่อนหน้า</a>`;
        paginationGuidelinesControls.appendChild(prevLi);

        let startPage, endPage;
        if (totalPages <= 5) {
            startPage = 1;
            endPage = totalPages;
        } else {
            if (currentPageGuidelines <= 3) {
                startPage = 1;
                endPage = 5;
            } else if (currentPageGuidelines + 2 >= totalPages) {
                startPage = totalPages - 4;
                endPage = totalPages;
            } else {
                startPage = currentPageGuidelines - 2;
                endPage = currentPageGuidelines + 2;
            }
        }

        if (startPage > 1) {
            paginationGuidelinesControls.appendChild(Object.assign(document.createElement('li'), { innerHTML: `<a class="page-link" href="#" data-page="1">1</a>` }));
            if (startPage > 2) paginationGuidelinesControls.appendChild(Object.assign(document.createElement('li'), { innerHTML: `<span class="page-link">...</span>` }));
        }

        for (let i = startPage; i <= endPage; i++) {
            const li = document.createElement('li');
            li.classList.add('page-item');
            if (i === currentPageGuidelines) li.classList.add('active');
            li.innerHTML = `<a class="page-link" href="#" data-page="${i}">${i}</a>`;
            paginationGuidelinesControls.appendChild(li);
        }

        if (endPage < totalPages) {
            if (endPage < totalPages - 1) paginationGuidelinesControls.appendChild(Object.assign(document.createElement('li'), { innerHTML: `<span class="page-link">...</span>` }));
            paginationGuidelinesControls.appendChild(Object.assign(document.createElement('li'), { innerHTML: `<a class="page-link" href="#" data-page="${totalPages}">${totalPages}</a>` }));
        }

        const nextLi = document.createElement('li');
        nextLi.classList.add('page-item');
        if (currentPageGuidelines >= totalPages) nextLi.classList.add('disabled');
        nextLi.innerHTML = `<a class="page-link" href="#" data-page="${currentPageGuidelines + 1}">ถัดไป</a>`;
        paginationGuidelinesControls.appendChild(nextLi);

        paginationGuidelinesControls.querySelectorAll('.page-link').forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                const newPage = parseInt(this.dataset.page);
                if (!this.closest('.page-item').classList.contains('disabled') && newPage !== currentPageGuidelines) {
                    currentPageGuidelines = newPage;
                    renderTreatmentTable();
                }
            });
        });
    }

    function updatePaginationInfoGuidelines() {
        const totalEntries = currentTreatmentData.length;
        if (totalEntries === 0) {
            paginationGuidelinesInfo.textContent = 'ไม่พบข้อมูล';
            return;
        }

        if (entriesPerPageGuidelines === 'all') {
            paginationGuidelinesInfo.textContent = `แสดงทั้งหมด ${totalEntries} รายการ`;
        } else {
            let startEntry = (currentPageGuidelines - 1) * entriesPerPageGuidelines + 1;
            let endEntry = currentPageGuidelines * entriesPerPageGuidelines;
            if (endEntry > totalEntries) {
                endEntry = totalEntries;
            }
            paginationGuidelinesInfo.textContent = `แสดง ${startEntry} ถึง ${endEntry} จาก ${totalEntries} รายการ`;
        }
    }

    function setupTreatmentGuidelinesEventListeners() {
        // Prepare data for Select2 from allTreatmentData
        const diseaseOptionsForSelect2 = [...new Set(allTreatmentData.map(item => item.disease))]
            .sort()
            .map((disease) => ({ id: disease, text: disease }));

        diseaseSearchInput.select2({
            placeholder: "พิมพ์ชื่อโรคเพื่อค้นหา...",
            allowClear: true,
            data: diseaseOptionsForSelect2,
            theme: "default",
            width: '100%',
            dropdownParent: $('.treatment-guidelines-section .search-container')
        });

        diseaseSearchInput.on('select2:select', function(e) {
            const selectedDiseaseName = e.params.data.id;
            if (selectedDiseaseName && !selectedDiseases.includes(selectedDiseaseName)) {
                selectedDiseases.push(selectedDiseaseName);
                renderSelectedDiseaseTags();
                filterTreatmentTable();
            }
            // Clear the input after selection to allow new searches
            $(this).val(null).trigger('change');
            // Ensure the dropdown closes after selection
            $(this).select2('close');
        });

        // Add event listener for when the dropdown is opened
        diseaseSearchInput.on('select2:opening', function() {
            // Ensure the input is cleared when opening to prevent stale text
            $(this).val(null).trigger('change');
        });

        // Add event listener for when the dropdown is closed
        diseaseSearchInput.on('select2:close', function() {
            // Optional: Re-focus the input if needed, but often not necessary
            // $(this).focus();
        });

        // Corrected event listener for removing disease tags using jQuery .on() for event delegation
        // This attaches the listener to the parent container, and it will listen for clicks on any .remove-tag-btn inside it
        $(selectedDiseaseTagsContainer).on('click', '.remove-tag-btn', function(event) {
            const button = $(this); // 'this' refers to the clicked button
            const diseaseNameToRemove = button.data('diseaseName'); // Use .data() for data attributes
            if (diseaseNameToRemove) {
                selectedDiseases = selectedDiseases.filter(name => name !== diseaseNameToRemove);
                renderSelectedDiseaseTags();
                filterTreatmentTable();
            }
        });

        entriesPerPageGuidelinesSelect.addEventListener('change', function() {
            entriesPerPageGuidelines = this.value === 'all' ? 'all' : parseInt(this.value);
            currentPageGuidelines = 1;
            renderTreatmentTable();
        });

        document.querySelectorAll('.treatment-table-container th.sortable').forEach(header => {
            header.addEventListener('click', function() {
                const column = this.dataset.sortBy;
                sortDirectionGuidelines = currentSortColumnGuidelines === column ? (sortDirectionGuidelines === 'asc' ? 'desc' : 'asc') : 'asc';
                currentSortColumnGuidelines = column;
                sortTreatmentData(currentSortColumnGuidelines, sortDirectionGuidelines);
                currentPageGuidelines = 1;
                renderTreatmentTable();
            });
        });

        treatmentTableBody[0].addEventListener('click', function(event) {
            if (event.target.classList.contains('clickable-medication')) {
                const clickedMedName = event.target.dataset.medName;

                if (!selectedDrugs.includes(clickedMedName)) {
                    selectedDrugs.push(clickedMedName);
                    renderSelectedTags();
                    currentPage = 1;
                    renderTable(selectedDrugs, currentPage);
                }

                const targetSection = document.getElementById('restricted-drugs-table-section');
                if (targetSection) {
                    targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }

                setTimeout(() => {
                    const targetId = `drug-row-${clickedMedName.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}`;
                    const targetRow = document.getElementById(targetId);
                    if (targetRow) {
                        targetRow.classList.add('highlight-row');
                        setTimeout(() => {
                            targetRow.classList.remove('highlight-row');
                        }, 2000);
                        targetRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                }, 700);
            }
        });
    }

    function initializeTreatmentGuidelinesTable() {
        currentTreatmentData = [...allTreatmentData];
        setupTreatmentGuidelinesEventListeners();
        sortTreatmentData(currentSortColumnGuidelines, sortDirectionGuidelines);
        filterTreatmentTable();
    }

    // --- Glossary Toggle ---
    const toggleGlossaryBtn = document.querySelector('.toggle-glossary-btn');
    const glossaryContent = document.querySelector('.glossary-content');
    const toggleIcon = toggleGlossaryBtn.querySelector('.toggle-icon');

    if (toggleGlossaryBtn && glossaryContent && toggleIcon) {
        toggleGlossaryBtn.addEventListener('click', function() {
            const isExpanded = glossaryContent.style.display === 'block';
            glossaryContent.style.display = isExpanded ? 'none' : 'block';
            toggleIcon.classList.toggle('fa-chevron-up', !isExpanded);
            toggleIcon.classList.toggle('fa-chevron-down', isExpanded);
        });
    }

    // === Global Initialization Call ===
    fetchData(); // เริ่มต้นดึงข้อมูลเมื่อ DOM พร้อม
});