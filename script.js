let applications = JSON.parse(localStorage.getItem('worqueue_records') || localStorage.getItem('workq_records')) || [];
let openNotesId = null;
let pendingDeleteId = null;
let dateSortDirection = 'desc';
let followUpSortDirection = 'desc';
let activeSortColumn = 'applied';
let currentStatusFilter = 'ALL';
let currentView = 'all';
const themeToggle = document.getElementById('theme-toggle');

let maxExistingSeq = applications.reduce((max, item) => item.seqNumber ? Math.max(max, item.seqNumber) : max, 0);
applications = applications.map((item, idx) => {
    if (!item.seqNumber) {
        maxExistingSeq++;
        return { ...item, seqNumber: maxExistingSeq };
    }
    return item;
});

const jobForm = document.getElementById('job-form');
const jobListBody = document.getElementById('job-list-body');
const totalCount = document.getElementById('total-count');
const searchInput = document.getElementById('search-input');
const headerDateSort = document.getElementById('header-date-sort');
const dateSortIcon = document.getElementById('date-sort-icon');
const headerFollowUpSort = document.getElementById('header-follow-up-sort');
const followUpSortIcon = document.getElementById('follow-up-sort-icon');
const resultsCount = document.getElementById('results-count');
const viewTabs = document.querySelectorAll('.view-tab');

const statusHeaderToggle = document.getElementById('status-header-toggle');
const statusDropdownMenu = document.getElementById('status-dropdown-menu');
const statusHeaderLabel = document.getElementById('status-header-label');

const navDashboard = document.getElementById('nav-dashboard');
const navPipeline = document.getElementById('nav-pipeline');
const navAbout = document.getElementById('nav-about');
const tabDashboard = document.getElementById('tab-dashboard');
const tabPipeline = document.getElementById('tab-pipeline');
const tabAbout = document.getElementById('tab-about');
const privacyInfoToggle = document.getElementById('privacy-info-toggle');
const privacyInfoTooltip = document.getElementById('privacy-info-tooltip');
const btnExportData = document.getElementById('btn-export-data');
const btnImportData = document.getElementById('btn-import-data');
const importFile = document.getElementById('import-file');
const backupStatus = document.getElementById('backup-status');

const formModalOverlay = document.getElementById('form-modal-overlay');
const btnOpenAddModal = document.getElementById('btn-open-add-modal');
const btnCloseFormModal = document.getElementById('btn-close-form-modal');
const btnCancelModal = document.getElementById('btn-cancel-modal');

const editIdInput = document.getElementById('edit-id');
const salaryInput = document.getElementById('salary');
const currencySelect = document.getElementById('currency-select');
const salaryRateSelect = document.getElementById('salary-rate');
const appliedDateInput = document.getElementById('applied-date');
const jobLinkInput = document.getElementById('job-link');
const followUpDateInput = document.getElementById('follow-up-date');
const formTitle = document.getElementById('form-title');
const btnSubmitText = document.getElementById('btn-submit-text');

const deleteModalOverlay = document.getElementById('delete-modal-overlay');
const btnConfirmDelete = document.getElementById('btn-confirm-delete');
const btnCancelDelete = document.getElementById('btn-cancel-delete');

const dashTotal = document.getElementById('dash-total');
const dashInterview = document.getElementById('dash-interview');
const dashOffered = document.getElementById('dash-offered');
const dashRejected = document.getElementById('dash-rejected');

const countApplied = document.getElementById('count-applied');
const countInterview = document.getElementById('count-interview');
const countOffered = document.getElementById('count-offered');
const countRejected = document.getElementById('count-rejected');
const countWithdrawn = document.getElementById('count-withdrawn');

const barApplied = document.getElementById('bar-applied');
const barInterview = document.getElementById('bar-interview');
const barOffered = document.getElementById('bar-offered');
const barRejected = document.getElementById('bar-rejected');
const barWithdrawn = document.getElementById('bar-withdrawn');

function setTheme(theme) {
    document.body.dataset.theme = theme;
    themeToggle.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
    localStorage.setItem('worqueue_theme', theme);
}

themeToggle.addEventListener('click', () => {
    setTheme(document.body.dataset.theme === 'dark' ? 'light' : 'dark');
});

setTheme(localStorage.getItem('worqueue_theme') === 'dark' ? 'dark' : 'light');

salaryInput.addEventListener('input', function (e) {
    let rawValue = e.target.value.replace(/\D/g, '');
    if (rawValue) {
        e.target.value = Number(rawValue).toLocaleString('en-US');
    } else {
        e.target.value = '';
    }
});

navDashboard.addEventListener('click', () => switchTab('dashboard'));
navPipeline.addEventListener('click', () => switchTab('pipeline'));
navAbout.addEventListener('click', () => switchTab('about'));

function switchTab(tabName) {
    navDashboard.classList.remove('active');
    navPipeline.classList.remove('active');
    navAbout.classList.remove('active');
    tabDashboard.classList.remove('active');
    tabPipeline.classList.remove('active');
    tabAbout.classList.remove('active');

    if (tabName === 'dashboard') {
        navDashboard.classList.add('active');
        tabDashboard.classList.add('active');
        updateDashboard();
    } else if (tabName === 'pipeline') {
        navPipeline.classList.add('active');
        tabPipeline.classList.add('active');
    } else {
        navAbout.classList.add('active');
        tabAbout.classList.add('active');
    }
}

privacyInfoToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = privacyInfoTooltip.classList.toggle('active');
    privacyInfoToggle.setAttribute('aria-expanded', isOpen);
});

document.addEventListener('click', () => {
    privacyInfoTooltip.classList.remove('active');
    privacyInfoToggle.setAttribute('aria-expanded', 'false');
});

btnExportData.addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(applications, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `worqueue-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    backupStatus.textContent = 'Backup downloaded.';
});

btnImportData.addEventListener('click', () => importFile.click());

importFile.addEventListener('change', () => {
    const file = importFile.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
        try {
            const imported = JSON.parse(reader.result);
            if (!Array.isArray(imported) || imported.some(item => !item || typeof item !== 'object' || !item.company || !item.position || !item.status)) {
                throw new Error('Invalid backup format.');
            }
            applications = imported;
            persistData();
            renderPipeline(searchInput.value);
            updateDashboard();
            backupStatus.textContent = 'Backup imported successfully.';
        } catch (error) {
            backupStatus.textContent = error.message;
        }
        importFile.value = '';
    };
    reader.readAsText(file);
});

btnOpenAddModal.addEventListener('click', () => {
    resetFormState();
    formModalOverlay.classList.add('active');
});

btnCloseFormModal.addEventListener('click', closeFormModal);
btnCancelModal.addEventListener('click', closeFormModal);

function closeFormModal() {
    formModalOverlay.classList.remove('active');
    resetFormState();
}

function resetFormState() {
    jobForm.reset();
    editIdInput.value = '';
    currencySelect.value = 'PHP';
    salaryRateSelect.value = 'Month';
    appliedDateInput.value = new Date().toISOString().slice(0, 10);
    formTitle.textContent = "Add Application";
    btnSubmitText.textContent = "Save Application";
}

function updateDashboard() {
    const total = applications.length;
    const appliedCount = applications.filter(a => a.status === 'Applied').length;
    const interviewCount = applications.filter(a => a.status === 'Interviewing').length;
    const offeredCount = applications.filter(a => a.status === 'Offered').length;
    const rejectedCount = applications.filter(a => a.status === 'Rejected').length;
    const withdrawnCount = applications.filter(a => a.status === 'Withdrawn').length;

    dashTotal.textContent = total;
    dashInterview.textContent = interviewCount;
    dashOffered.textContent = offeredCount;
    dashRejected.textContent = rejectedCount;

    countApplied.textContent = appliedCount;
    countInterview.textContent = interviewCount;
    countOffered.textContent = offeredCount;
    countRejected.textContent = rejectedCount;
    countWithdrawn.textContent = withdrawnCount;

    barApplied.style.width = total > 0 ? `${(appliedCount / total) * 100}%` : '0%';
    barInterview.style.width = total > 0 ? `${(interviewCount / total) * 100}%` : '0%';
    barOffered.style.width = total > 0 ? `${(offeredCount / total) * 100}%` : '0%';
    barRejected.style.width = total > 0 ? `${(rejectedCount / total) * 100}%` : '0%';
    barWithdrawn.style.width = total > 0 ? `${(withdrawnCount / total) * 100}%` : '0%';
}

function getHostname(url) {
    try {
        const parsed = new URL(url);
        return parsed.hostname + (parsed.pathname !== '/' ? parsed.pathname : '');
    } catch {
        return url;
    }
}

function formatShortDate(dateValue) {
    if (!dateValue) return '—';
    const date = /^\d{4}-\d{2}-\d{2}$/.test(dateValue)
        ? new Date(`${dateValue}T00:00:00`)
        : new Date(dateValue);
    if (Number.isNaN(date.getTime())) return dateValue;
    return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
}

function getInputDate(dateValue) {
    if (!dateValue) return new Date().toISOString().slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) return dateValue;
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return new Date().toISOString().slice(0, 10);
    return date.toISOString().slice(0, 10);
}

headerDateSort.addEventListener('click', () => {
    if (activeSortColumn !== 'applied') {
        activeSortColumn = 'applied';
    } else {
        dateSortDirection = dateSortDirection === 'desc' ? 'asc' : 'desc';
    }
    dateSortIcon.textContent = dateSortDirection === 'desc' ? '↓' : '↑';
    renderPipeline(searchInput.value);
});

headerFollowUpSort.addEventListener('click', () => {
    if (activeSortColumn !== 'followUp') {
        activeSortColumn = 'followUp';
    } else {
        followUpSortDirection = followUpSortDirection === 'desc' ? 'asc' : 'desc';
    }
    followUpSortIcon.textContent = followUpSortDirection === 'desc' ? '↓' : '↑';
    renderPipeline(searchInput.value);
});

statusHeaderToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    statusDropdownMenu.classList.toggle('active');
});

document.addEventListener('click', () => {
    statusDropdownMenu.classList.remove('active');
});

document.querySelectorAll('.status-dropdown-item').forEach(item => {
    item.addEventListener('click', (e) => {
        e.stopPropagation();
        currentStatusFilter = item.getAttribute('data-status');
        
        document.querySelectorAll('.status-dropdown-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');

        if (currentStatusFilter === 'ALL') {
            statusHeaderLabel.textContent = 'Status';
        } else {
            statusHeaderLabel.textContent = `Status: ${currentStatusFilter}`;
        }

        statusDropdownMenu.classList.remove('active');
        renderPipeline(searchInput.value);
    });
});

searchInput.addEventListener('input', function (e) {
    renderPipeline(e.target.value);
});

viewTabs.forEach(tab => {
    tab.addEventListener('click', () => {
        currentView = tab.dataset.view;
        viewTabs.forEach(item => item.classList.toggle('active', item === tab));
        renderPipeline(searchInput.value);
    });
});

function isFollowUpDue(date) {
    return date && date <= new Date().toISOString().slice(0, 10);
}

function renderPipeline(query = '') {
    jobListBody.innerHTML = '';
    const mobileContainer = document.getElementById('mobile-card-container');
    mobileContainer.innerHTML = '';

    let filtered = applications.filter(item => {
        const matchesQuery = item.company.toLowerCase().includes(query.toLowerCase()) ||
                             item.position.toLowerCase().includes(query.toLowerCase());
        const matchesStatus = currentStatusFilter === 'ALL' || item.status === currentStatusFilter;
        const matchesView = currentView === 'all' || item.bookmarked;
        return matchesQuery && matchesStatus && matchesView;
    });

    resultsCount.textContent = `Showing ${filtered.length} of ${applications.length}`;

    filtered.sort((a, b) => {
        if (activeSortColumn === 'followUp') {
            const followUpA = a.followUpDate ? new Date(getInputDate(a.followUpDate)).getTime() : null;
            const followUpB = b.followUpDate ? new Date(getInputDate(b.followUpDate)).getTime() : null;

            if (followUpA === null && followUpB !== null) return 1;
            if (followUpA !== null && followUpB === null) return -1;
            if (followUpA === null && followUpB === null) return 0;
            return followUpSortDirection === 'desc' ? followUpB - followUpA : followUpA - followUpB;
        }

        const appliedA = new Date(getInputDate(a.appliedDate || a.dateAdded)).getTime();
        const appliedB = new Date(getInputDate(b.appliedDate || b.dateAdded)).getTime();
        return dateSortDirection === 'desc' ? appliedB - appliedA : appliedA - appliedB;
    });

    if (filtered.length === 0) {
        jobListBody.innerHTML = `
            <tr>
                <td colspan="8" class="empty-record">
                    ${query || currentStatusFilter !== 'ALL' || currentView !== 'all' ? 'No matching records found.' : 'No applications tracked yet.'}
                </td>
            </tr>`;
        mobileContainer.innerHTML = `<div class="empty-record">${query || currentStatusFilter !== 'ALL' || currentView !== 'all' ? 'No matching records found.' : 'No applications tracked yet.'}</div>`;
        totalCount.textContent = applications.length;
        updateDashboard();
        return;
    }

    const sectionTitle = currentView === 'bookmarked' ? 'Bookmarked Applications' : 'All Applications';
    const sectionDivider = document.createElement('tr');
    sectionDivider.className = 'section-divider-row';
    sectionDivider.innerHTML = `<td colspan="8">${sectionTitle}</td>`;
    jobListBody.appendChild(sectionDivider);

    const mobileSectionTitle = document.createElement('div');
    mobileSectionTitle.className = 'mobile-section-title';
    mobileSectionTitle.textContent = sectionTitle;
    mobileContainer.appendChild(mobileSectionTitle);

    filtered.forEach(app => {
        renderRow(app);
        renderMobileCard(app);
    });

    totalCount.textContent = applications.length;
    updateDashboard();
}

function renderRow(app) {
    const row = document.createElement('tr');
    row.className = 'job-row';

    let pillClass = 'status-applied';
    if (app.status === 'Interviewing') pillClass = 'status-interviewing';
    if (app.status === 'Offered') pillClass = 'status-offered';
    if (app.status === 'Rejected') pillClass = 'status-rejected';
    if (app.status === 'Withdrawn') pillClass = 'status-withdrawn';

    const isExpanded = openNotesId === app.id;
    const currencySymbol = app.currency === 'USD' ? '$' : '₱';
    const rateText = app.salaryRate === 'Hour' ? 'Hour' : 'Month';
    const formattedSalary = app.salary 
        ? `${currencySymbol}${escapeMarkup(app.salary)} / ${rateText}`
        : '—';
    const appliedDate = app.appliedDate || app.dateAdded;
    const followUpLabel = app.followUpDate
        ? `<span class="${isFollowUpDue(app.followUpDate) ? 'follow-up-due' : 'follow-up-date'}">${isFollowUpDue(app.followUpDate) ? 'Follow-up due' : formatShortDate(app.followUpDate)}</span>`
        : '—';

    row.innerHTML = `
        <td class="col-num">${app.seqNumber}</td>
        <td class="col-company" style="font-weight: 700;" title="${escapeMarkup(app.company)}">${escapeMarkup(app.company)}</td>
        <td class="col-role" title="${escapeMarkup(app.position)}">${escapeMarkup(app.position)}</td>
        <td class="col-salary" style="color: var(--text-muted); font-family: var(--font-mono); font-size: 0.8rem;">${formattedSalary}</td>
        <td class="col-date" style="color: var(--text-muted); font-size: 0.8rem;">${formatShortDate(appliedDate)}</td>
        <td class="col-follow-up">${followUpLabel}</td>
        <td class="col-status"><span class="status-pill ${pillClass}">${app.status}</span></td>
        <td class="align-right col-action">
            <div class="action-cell-wrapper">
                <div class="action-btn-group" onclick="event.stopPropagation();">
                    <button class="icon-btn icon-btn-bookmark ${app.bookmarked ? 'active' : ''}" onclick="toggleBookmark(${app.id})" title="${app.bookmarked ? 'Unbookmark' : 'Bookmark'}">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="${app.bookmarked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
                    </button>
                    <button class="icon-btn" onclick="editApplication(${app.id})" title="Edit Application">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                    </button>
                    <button class="icon-btn icon-btn-delete" onclick="promptDelete(${app.id})" title="Delete Application">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                    </button>
                </div>
                <svg class="chevron-icon ${isExpanded ? 'open' : ''}" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
            </div>
        </td>
    `;

    row.addEventListener('click', () => toggleNotes(app.id));
    jobListBody.appendChild(row);

    if (isExpanded) {
        const notesRow = document.createElement('tr');
        notesRow.className = 'notes-row';
        
        let linkHtml = '';
        if (app.jobLink) {
            const displayUrl = getHostname(app.jobLink);
            linkHtml = `
                <div>
                    <div class="notes-label">Job Posting Link</div>
                    <a href="${escapeMarkup(app.jobLink)}" target="_blank" rel="noopener noreferrer" class="job-link-badge" onclick="event.stopPropagation();" title="${escapeMarkup(app.jobLink)}">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="flex-shrink: 0;"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                        ${escapeMarkup(displayUrl)}
                    </a>
                </div>
            `;
        }

        notesRow.innerHTML = `
            <td colspan="8" class="notes-cell">
                <div class="drawer-inner">
                    ${linkHtml}
                    <div>
                        <div class="notes-label">Notes / Details</div>
                        <div class="notes-content">${app.notes ? escapeMarkup(app.notes) : '<em>No notes added yet. Click Edit to add details.</em>'}</div>
                    </div>
                </div>
            </td>
        `;
        jobListBody.appendChild(notesRow);
    }
}

function renderMobileCard(app) {
    const mobileContainer = document.getElementById('mobile-card-container');
    const card = document.createElement('div');
    card.className = 'mobile-card';

    let pillClass = 'status-applied';
    if (app.status === 'Interviewing') pillClass = 'status-interviewing';
    if (app.status === 'Offered') pillClass = 'status-offered';
    if (app.status === 'Rejected') pillClass = 'status-rejected';
    if (app.status === 'Withdrawn') pillClass = 'status-withdrawn';

    const currencySymbol = app.currency === 'USD' ? '$' : '₱';
    const rateText = app.salaryRate === 'Hour' ? 'Hour' : 'Month';
    const formattedSalary = app.salary 
        ? `${currencySymbol}${escapeMarkup(app.salary)} / ${rateText}`
        : '—';
    const appliedDate = app.appliedDate || app.dateAdded;
    const followUpLabel = app.followUpDate
        ? `<span class="${isFollowUpDue(app.followUpDate) ? 'follow-up-due' : 'follow-up-date'}">${isFollowUpDue(app.followUpDate) ? 'Follow-up due' : formatShortDate(app.followUpDate)}</span>`
        : '—';

    let linkHtml = '';
    if (app.jobLink) {
        const displayUrl = getHostname(app.jobLink);
        linkHtml = `
            <div>
                <a href="${escapeMarkup(app.jobLink)}" target="_blank" rel="noopener noreferrer" class="job-link-badge" title="${escapeMarkup(app.jobLink)}">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="flex-shrink: 0;"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                    ${escapeMarkup(displayUrl)}
                </a>
            </div>
        `;
    }

    card.innerHTML = `
        <div class="mobile-card-header">
            <div>
                <div class="mobile-card-company"><span style="color: var(--text-muted); font-size: 0.9rem;">#${app.seqNumber}</span> ${escapeMarkup(app.company)}</div>
                <div class="mobile-card-role">${escapeMarkup(app.position)}</div>
            </div>
            <span class="status-pill ${pillClass}">${app.status}</span>
        </div>

        <div class="mobile-card-meta">
            <span style="font-family: var(--font-mono); font-weight: 700; color: var(--text-main);">${formattedSalary}</span>
            <span style="font-size: 0.75rem;">${formatShortDate(appliedDate)}</span>
        </div>
        <div class="mobile-card-follow-up">${followUpLabel}</div>

        ${linkHtml}

        ${app.notes ? `<div class="mobile-card-notes">${escapeMarkup(app.notes)}</div>` : ''}

        <div class="mobile-card-footer">
            <div class="action-btn-group">
                <button class="icon-btn icon-btn-bookmark ${app.bookmarked ? 'active' : ''}" onclick="toggleBookmark(${app.id})">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="${app.bookmarked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
                </button>
                <button class="icon-btn" onclick="editApplication(${app.id})">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                </button>
                <button class="icon-btn icon-btn-delete" onclick="promptDelete(${app.id})">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                </button>
            </div>
        </div>
    `;

    mobileContainer.appendChild(card);
}

function toggleNotes(id) {
    openNotesId = openNotesId === id ? null : id;
    renderPipeline(searchInput.value);
}

function toggleBookmark(id) {
    applications = applications.map(app => {
        if (app.id === id) {
            return { ...app, bookmarked: !app.bookmarked };
        }
        return app;
    });
    persistData();
    renderPipeline(searchInput.value);
}

jobForm.addEventListener('submit', function (e) {
    e.preventDefault();

    const editId = editIdInput.value;
    const company = document.getElementById('company').value.trim();
    const position = document.getElementById('position').value.trim();
    const currency = currencySelect.value;
    const salary = salaryInput.value.trim();
    const salaryRate = salaryRateSelect.value;
    const status = document.getElementById('status').value;
    const appliedDate = appliedDateInput.value;
    const jobLink = jobLinkInput.value.trim();
    const notes = document.getElementById('notes').value.trim();
    const followUpDate = followUpDateInput.value;

    if (editId) {
        applications = applications.map(app => {
            if (app.id === parseInt(editId)) {
                return { ...app, company, position, currency, salary, salaryRate, status, appliedDate, jobLink, notes, followUpDate };
            }
            return app;
        });
    } else {
        const nextSeq = applications.reduce((max, item) => item.seqNumber ? Math.max(max, item.seqNumber) : max, 0) + 1;
        const newRecord = {
            id: Date.now(),
            seqNumber: nextSeq,
            company,
            position,
            currency,
            salary,
            salaryRate,
            status,
            appliedDate,
            jobLink,
            notes,
            followUpDate,
            bookmarked: false,
            dateAdded: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        };
        applications.unshift(newRecord);
    }

    persistData();
    renderPipeline();
    closeFormModal();
});

function editApplication(id) {
    const target = applications.find(app => app.id === id);
    if (!target) return;

    editIdInput.value = target.id;
    document.getElementById('company').value = target.company;
    document.getElementById('position').value = target.position;
    currencySelect.value = target.currency || 'PHP';
    salaryInput.value = target.salary || '';
    salaryRateSelect.value = target.salaryRate || 'Month';
    document.getElementById('status').value = target.status;
    appliedDateInput.value = getInputDate(target.appliedDate || target.dateAdded);
    jobLinkInput.value = target.jobLink || '';
    document.getElementById('notes').value = target.notes || '';
    followUpDateInput.value = target.followUpDate || '';

    formTitle.textContent = "Edit Application";
    btnSubmitText.textContent = "Update Application";

    formModalOverlay.classList.add('active');
}

function promptDelete(id) {
    pendingDeleteId = id;
    deleteModalOverlay.classList.add('active');
}

btnConfirmDelete.addEventListener('click', () => {
    if (pendingDeleteId) {
        applications = applications.filter(item => item.id !== pendingDeleteId);
        if (openNotesId === pendingDeleteId) openNotesId = null;
        persistData();
        renderPipeline(searchInput.value);
    }
    closeDeleteModal();
});

btnCancelDelete.addEventListener('click', closeDeleteModal);

function closeDeleteModal() {
    deleteModalOverlay.classList.remove('active');
    pendingDeleteId = null;
}

function persistData() {
    localStorage.setItem('worqueue_records', JSON.stringify(applications));
}

function escapeMarkup(text) {
    return text.replace(/[&<>"']/g, function (match) {
        return {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        }[match];
    });
}

renderPipeline();
updateDashboard();
