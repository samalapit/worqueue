const VALID_STATUSES = ['Applied', 'Interviewing', 'Offered', 'Rejected', 'Withdrawn'];
const CLOSED_STATUSES = ['Rejected', 'Withdrawn'];

// Local-time YYYY-MM-DD (toISOString() would use UTC and be a day off in the Philippines overnight)
function toLocalISO(d = new Date()) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function daysFromToday(iso) {
    const [y, m, d] = iso.split('-').map(Number);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return Math.round((new Date(y, m - 1, d) - today) / 86400000);
}

function loadApplications() {
    try {
        const raw = localStorage.getItem('worqueue_records') || localStorage.getItem('workq_records');
        const data = JSON.parse(raw || '[]');
        return Array.isArray(data) ? data.filter(item => item && typeof item === 'object' && item.company && item.position) : [];
    } catch {
        return [];
    }
}

let applications = loadApplications();
let openNotesId = null;
let pendingDeleteId = null;
// Default order: entry # ascending (1 on top). Click a header to flip it.
const sortDirections = { number: 'asc', applied: 'desc', followUp: 'desc', interview: 'desc' };
let activeSortColumn = 'number';
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
const headerNumberSort = document.getElementById('header-number-sort');
const numberSortIcon = document.getElementById('number-sort-icon');
const mobileSort = document.getElementById('mobile-sort');
const headerDateSort = document.getElementById('header-date-sort');
const dateSortIcon = document.getElementById('date-sort-icon');
const headerFollowUpSort = document.getElementById('header-follow-up-sort');
const followUpSortIcon = document.getElementById('follow-up-sort-icon');
const headerInterviewSort = document.getElementById('header-interview-sort');
const interviewSortIcon = document.getElementById('interview-sort-icon');
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
const navProfile = document.getElementById('nav-profile');
const tabProfile = document.getElementById('tab-profile');
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
const followUpStateInput = document.getElementById('follow-up-state');
const formTitle = document.getElementById('form-title');
const btnSubmitText = document.getElementById('btn-submit-text');

const deleteModalOverlay = document.getElementById('delete-modal-overlay');
const btnConfirmDelete = document.getElementById('btn-confirm-delete');
const btnCancelDelete = document.getElementById('btn-cancel-delete');

const dashTotal = document.getElementById('dash-total');
const dashInterview = document.getElementById('dash-interview');
const dashOffered = document.getElementById('dash-offered');
const dashRejected = document.getElementById('dash-rejected');
const dashRate = document.getElementById('dash-rate');
const dashFollowUps = document.getElementById('dash-followups');
const attentionList = document.getElementById('attention-list');

const interviewDateInput = document.getElementById('interview-date');
const interviewStateInput = document.getElementById('interview-state');
const btnExportCsv = document.getElementById('btn-export-csv');
const btnLoadSample = document.getElementById('btn-load-sample');
const btnRemoveSample = document.getElementById('btn-remove-sample');
const sampleStatus = document.getElementById('sample-status');

const toastEl = document.getElementById('toast');
const toastMessage = document.getElementById('toast-message');
const toastAction = document.getElementById('toast-action');
let toastTimer = null;
let toastUndo = null;
let formDirty = false;

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
    const raw = e.target.value.replace(/[^\d.]/g, '');
    const [whole, ...rest] = raw.split('.');
    const hasDot = raw.includes('.');
    const decimals = rest.join('').slice(0, 2);
    const wholeText = whole ? Number(whole).toLocaleString('en-US') : (hasDot ? '0' : '');
    e.target.value = wholeText + (hasDot ? '.' + decimals : '');
});

navDashboard.addEventListener('click', () => switchTab('dashboard'));
navPipeline.addEventListener('click', () => switchTab('pipeline'));
navProfile.addEventListener('click', () => switchTab('profile'));
navAbout.addEventListener('click', () => switchTab('about'));

function switchTab(tabName) {
    const tabs = {
        dashboard: [navDashboard, tabDashboard],
        pipeline: [navPipeline, tabPipeline],
        profile: [navProfile, tabProfile],
        about: [navAbout, tabAbout]
    };
    Object.entries(tabs).forEach(([name, [nav, tab]]) => {
        nav.classList.toggle('active', name === tabName);
        tab.classList.toggle('active', name === tabName);
    });
    if (tabName === 'dashboard') updateDashboard();
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
    const backup = { app: 'worqueue', version: 2, exportedAt: new Date().toISOString(), applications, profile };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `worqueue-backup-${toLocalISO()}.json`;
    link.click();
    URL.revokeObjectURL(url);
    backupStatus.textContent = 'Backup downloaded.';
});

function normalizeImported(list) {
    let maxSeq = list.reduce((m, it) => Number.isFinite(it.seqNumber) ? Math.max(m, it.seqNumber) : m, 0);
    const usedIds = new Set();
    return list.map((item, i) => {
        let id = item.id != null && Number.isFinite(Number(item.id)) ? Number(item.id) : Date.now() + i;
        while (usedIds.has(id)) id++;
        usedIds.add(id);
        return {
            ...item,
            id,
            seqNumber: Number.isFinite(item.seqNumber) ? item.seqNumber : ++maxSeq,
            company: String(item.company),
            position: String(item.position),
            status: VALID_STATUSES.includes(item.status) ? item.status : 'Applied'
        };
    });
}

btnImportData.addEventListener('click', () => importFile.click());

importFile.addEventListener('change', () => {
    const file = importFile.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
        try {
            const parsed = JSON.parse(reader.result);
            // Old backups are a plain array; newer ones are { applications, profile }
            const imported = Array.isArray(parsed) ? parsed : (parsed && parsed.applications);
            const hasProfile = !Array.isArray(parsed) && parsed && parsed.profile && typeof parsed.profile === 'object';
            if (!Array.isArray(imported) || imported.some(item => !item || typeof item !== 'object' || !item.company || !item.position || !item.status)) {
                throw new Error('Invalid backup format.');
            }
            if (!confirm(`This will replace your ${applications.length} current application(s) with ${imported.length} from the backup${hasProfile ? ' (and replace your profile details)' : ''}. Continue?`)) {
                importFile.value = '';
                backupStatus.textContent = 'Import cancelled.';
                return;
            }
            applications = normalizeImported(imported);
            if (hasProfile) {
                profile = sanitizeProfile(parsed.profile);
                saveProfile();
                renderProfile();
            }
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
    document.getElementById('company').focus();
});

jobForm.addEventListener('input', () => { formDirty = true; });

// Close with Escape; click outside closes (the form only if nothing was typed)
document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (deleteModalOverlay.classList.contains('active')) closeDeleteModal();
    else if (formModalOverlay.classList.contains('active')) closeFormModal();
});
formModalOverlay.addEventListener('click', (e) => {
    if (e.target === formModalOverlay && !formDirty) closeFormModal();
});
deleteModalOverlay.addEventListener('click', (e) => {
    if (e.target === deleteModalOverlay) closeDeleteModal();
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
    appliedDateInput.value = toLocalISO();
    followUpStateInput.value = 'pending';
    interviewStateInput.value = 'pending';
    formDirty = false;
    formTitle.textContent = "Add Application";
    btnSubmitText.textContent = "Save Application";
}

function getAttentionItems() {
    const isoDate = /^\d{4}-\d{2}-\d{2}$/;
    const items = [];
    applications.forEach(app => {
        if (CLOSED_STATUSES.includes(app.status)) return;
        const actions = [];
        const interviewDiff = app.interviewDate && isoDate.test(app.interviewDate)
            ? daysFromToday(app.interviewDate)
            : null;
        const hasUpcomingInterview = interviewDiff !== null && interviewDiff >= 0 && interviewDiff <= 14;
        if (app.followUpState !== 'done' && app.followUpState !== 'cancelled' && app.followUpDate && isoDate.test(app.followUpDate)) {
            const diff = daysFromToday(app.followUpDate);
            if (diff <= 0) actions.push({ type: 'followup', diff });
        }
        if (app.interviewState !== 'done' && app.interviewState !== 'cancelled' && hasUpcomingInterview) {
            actions.push({ type: 'interview', diff: interviewDiff });
        }
        if (actions.length > 0) {
            items.push({ app, actions, sortDiff: Math.min(...actions.map(action => action.diff)) });
        }
    });
    return items.sort((a, b) => a.sortDiff - b.sortDiff);
}

function attentionLabel({ type, diff }) {
    if (type === 'followup') {
        if (diff === 0) return 'Your follow-up today';
        return `Your follow-up · ${-diff}d overdue`;
    }
    if (diff === 0) return 'Interview today';
    if (diff === 1) return 'Interview tomorrow';
    return `Interview in ${diff} days`;
}

function updateDashboard() {
    const total = applications.length;
    const count = status => applications.filter(a => a.status === status).length;
    const appliedCount = count('Applied');
    const interviewCount = count('Interviewing');
    const offeredCount = count('Offered');
    const rejectedCount = count('Rejected');
    const withdrawnCount = count('Withdrawn');

    dashTotal.textContent = total;
    dashInterview.textContent = interviewCount;
    dashOffered.textContent = offeredCount;
    dashRejected.textContent = rejectedCount;
    dashRate.textContent = total > 0 ? `${Math.round(((interviewCount + offeredCount) / total) * 100)}%` : '0%';

    countApplied.textContent = appliedCount;
    countInterview.textContent = interviewCount;
    countOffered.textContent = offeredCount;
    countRejected.textContent = rejectedCount;
    countWithdrawn.textContent = withdrawnCount;

    const pct = n => total > 0 ? `${(n / total) * 100}%` : '0%';
    barApplied.style.width = pct(appliedCount);
    barInterview.style.width = pct(interviewCount);
    barOffered.style.width = pct(offeredCount);
    barRejected.style.width = pct(rejectedCount);
    barWithdrawn.style.width = pct(withdrawnCount);

    const items = getAttentionItems();
    const followUpsDue = items.reduce((totalDue, item) => (
        totalDue + item.actions.filter(action => action.type === 'followup').length
    ), 0);
    dashFollowUps.textContent = followUpsDue;
    dashFollowUps.classList.toggle('text-rejected', followUpsDue > 0);

    if (items.length === 0) {
        attentionList.innerHTML = total === 0
            ? `<li class="attention-empty">Nothing here yet. Add an application, or <button type="button" class="link-btn" onclick="loadSampleData()">load sample data</button> to look around.</li>`
            : `<li class="attention-empty">You're all caught up. Nothing needs attention right now.</li>`;
        return;
    }

    attentionList.innerHTML = items.map(item => `
        <li>
            <button type="button" class="attention-item" onclick="openApplication(${item.app.id})">
                <span class="attention-tags">${item.actions.map(action => `
                    <span class="attention-tag attention-${action.type}${action.type === 'followup' && action.diff < 0 ? ' overdue' : ''}">${attentionLabel(action)}</span>
                `).join('')}</span>
                <span class="attention-main"><strong>${escapeMarkup(item.app.company)}</strong> · ${escapeMarkup(item.app.position)}</span>
            </button>
        </li>`).join('');
}

function resetFilters() {
    searchInput.value = '';
    currentStatusFilter = 'ALL';
    currentView = 'all';
    statusHeaderLabel.textContent = 'Status';
    document.querySelectorAll('.status-dropdown-item').forEach(i => i.classList.toggle('active', i.dataset.status === 'ALL'));
    viewTabs.forEach(item => item.classList.toggle('active', item.dataset.view === 'all'));
}

function openApplication(id) {
    resetFilters();
    openNotesId = id;
    switchTab('pipeline');
    renderPipeline();
    revealApplication(id);
}

// Scroll a record into view (and briefly highlight it for newly added ones)
function revealApplication(id, flash = false) {
    const target = Array.from(document.querySelectorAll(`[data-id="${id}"]`)).find(el => el.offsetParent !== null);
    if (!target) return;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    target.scrollIntoView({ block: 'center', behavior: reduceMotion ? 'auto' : 'smooth' });
    if (flash) {
        target.classList.add('row-flash');
        setTimeout(() => target.classList.remove('row-flash'), 1800);
    }
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
    if (!dateValue) return toLocalISO();
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) return dateValue;
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return toLocalISO();
    return toLocalISO(date);
}

const sortIcons = { number: numberSortIcon, applied: dateSortIcon, followUp: followUpSortIcon, interview: interviewSortIcon };
const sortHeaders = { number: headerNumberSort, applied: headerDateSort, followUp: headerFollowUpSort, interview: headerInterviewSort };

function refreshSortUI() {
    Object.keys(sortIcons).forEach(col => {
        sortIcons[col].textContent = sortDirections[col] === 'desc' ? '↓' : '↑';
        sortHeaders[col].classList.toggle('sort-active', col === activeSortColumn);
    });
    mobileSort.value = `${activeSortColumn}-${sortDirections[activeSortColumn]}`;
}

function applySort(column, direction) {
    activeSortColumn = column;
    if (direction) sortDirections[column] = direction;
    refreshSortUI();
    renderPipeline(searchInput.value);
}

// First click on a column sorts by it; clicking the active column flips its direction
function handleHeaderSort(column) {
    if (activeSortColumn !== column) applySort(column);
    else applySort(column, sortDirections[column] === 'desc' ? 'asc' : 'desc');
}

headerNumberSort.addEventListener('click', () => handleHeaderSort('number'));
headerDateSort.addEventListener('click', () => handleHeaderSort('applied'));
headerFollowUpSort.addEventListener('click', () => handleHeaderSort('followUp'));
headerInterviewSort.addEventListener('click', () => handleHeaderSort('interview'));
mobileSort.addEventListener('change', () => {
    const [column, direction] = mobileSort.value.split('-');
    applySort(column, direction);
});
refreshSortUI();

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

function isFollowUpDue(date, status, state = 'pending') {
    if (!date || CLOSED_STATUSES.includes(status) || state !== 'pending') return false;
    return date <= toLocalISO();
}

function statusClass(status) {
    return {
        Interviewing: 'status-interviewing',
        Offered: 'status-offered',
        Rejected: 'status-rejected',
        Withdrawn: 'status-withdrawn'
    }[status] || 'status-applied';
}

function statusSelect(app) {
    const options = VALID_STATUSES.map(st => `<option value="${st}"${st === app.status ? ' selected' : ''}>${st}</option>`).join('');
    return `<span class="status-pill status-select-wrap ${statusClass(app.status)}" onclick="event.stopPropagation();">
        <select class="status-select" aria-label="Change status for ${escapeMarkup(app.company)}" onchange="changeStatus(${app.id}, this.value)">${options}</select>
    </span>`;
}

function changeStatus(id, newStatus) {
    const target = applications.find(app => app.id === id);
    if (!target || target.status === newStatus || !VALID_STATUSES.includes(newStatus)) return;
    const previous = target.status;
    target.status = newStatus;
    persistData();
    renderPipeline(searchInput.value);
    showToast(`${target.company} moved to ${newStatus}.`, 'Undo', () => {
        const again = applications.find(app => app.id === id);
        if (again) {
            again.status = previous;
            persistData();
            renderPipeline(searchInput.value);
        }
    });
}

function reminderStateSelect(app, type) {
    const stateKey = type === 'followup' ? 'followUpState' : 'interviewState';
    const currentState = app[stateKey] || 'pending';
    const label = type === 'followup' ? 'follow-up' : 'interview';
    const date = type === 'followup' ? app.followUpDate : app.interviewDate;
    const options = date
        ? ['pending', 'done', 'cancelled'].map(state => (
            `<option value="${state}"${state === currentState ? ' selected' : ''}>${state[0].toUpperCase()}${state.slice(1)}</option>`
        )).join('')
        : '<option value="none" selected>None</option>';
    return `
        <label class="reminder-control" onclick="event.stopPropagation();">
            <span>${label}</span>
            <select aria-label="${label} status for ${escapeMarkup(app.company)}"${date ? '' : ' disabled'} onchange="changeReminderState(${app.id}, '${type}', this.value)">
                ${options}
            </select>
        </label>`;
}

function changeReminderState(id, type, state) {
    if (!['pending', 'done', 'cancelled'].includes(state)) return;
    const target = applications.find(app => app.id === id);
    if (!target) return;
    const stateKey = type === 'followup' ? 'followUpState' : 'interviewState';
    target[stateKey] = state;
    persistData();
    renderPipeline(searchInput.value);
    showToast(`${type === 'followup' ? 'Follow-up' : 'Interview'} marked ${state}.`);
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
        if (activeSortColumn === 'number') {
            const diff = (a.seqNumber || 0) - (b.seqNumber || 0);
            return sortDirections.number === 'asc' ? diff : -diff;
        }

        if (activeSortColumn === 'followUp') {
            const followUpA = a.followUpDate ? new Date(getInputDate(a.followUpDate)).getTime() : null;
            const followUpB = b.followUpDate ? new Date(getInputDate(b.followUpDate)).getTime() : null;

            if (followUpA === null && followUpB !== null) return 1;
            if (followUpA !== null && followUpB === null) return -1;
            if (followUpA === null && followUpB === null) return 0;
            return sortDirections.followUp === 'desc' ? followUpB - followUpA : followUpA - followUpB;
        }

        if (activeSortColumn === 'interview') {
            const interviewA = a.interviewDate ? new Date(getInputDate(a.interviewDate)).getTime() : null;
            const interviewB = b.interviewDate ? new Date(getInputDate(b.interviewDate)).getTime() : null;

            if (interviewA === null && interviewB !== null) return 1;
            if (interviewA !== null && interviewB === null) return -1;
            if (interviewA === null && interviewB === null) return 0;
            return sortDirections.interview === 'desc' ? interviewB - interviewA : interviewA - interviewB;
        }

        const appliedA = new Date(getInputDate(a.appliedDate || a.dateAdded)).getTime();
        const appliedB = new Date(getInputDate(b.appliedDate || b.dateAdded)).getTime();
        return (sortDirections.applied === 'desc' ? appliedB - appliedA : appliedA - appliedB) || (a.seqNumber || 0) - (b.seqNumber || 0);
    });

    if (filtered.length === 0) {
        const emptyMessage = applications.length === 0
            ? `No applications tracked yet.<div class="empty-actions"><button type="button" class="btn-cancel" onclick="loadSampleData()">Load sample data</button></div>`
            : 'No matching records found.';
        jobListBody.innerHTML = `
            <tr>
                <td colspan="9" class="empty-record">${emptyMessage}</td>
            </tr>`;
        mobileContainer.innerHTML = `<div class="empty-record">${emptyMessage}</div>`;
        totalCount.textContent = applications.length;
        updateDashboard();
        return;
    }

    const sectionTitle = currentView === 'bookmarked' ? 'Bookmarked Applications' : 'All Applications';
    const sectionDivider = document.createElement('tr');
    sectionDivider.className = 'section-divider-row';
    sectionDivider.innerHTML = `<td colspan="9">${sectionTitle}</td>`;
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

    const isExpanded = openNotesId === app.id;
    const currencySymbol = app.currency === 'USD' ? '$' : '₱';
    const rateText = app.salaryRate === 'Hour' ? 'Hour' : 'Month';
    const formattedSalary = app.salary 
        ? `${currencySymbol}${escapeMarkup(app.salary)} / ${rateText}`
        : '—';
    const appliedDate = app.appliedDate || app.dateAdded;
    const followUpLabel = app.followUpDate
        ? `<span class="${isFollowUpDue(app.followUpDate, app.status, app.followUpState) ? 'follow-up-due' : 'follow-up-date'}">${formatShortDate(app.followUpDate)}</span>`
        : '—';

    row.innerHTML = `
        <td class="col-num">${app.seqNumber}</td>
        <td class="col-company company-cell" title="${escapeMarkup(app.company)}">${escapeMarkup(app.company)}</td>
        <td class="col-role" title="${escapeMarkup(app.position)}">${escapeMarkup(app.position)}</td>
        <td class="col-salary table-muted-cell">${formattedSalary}</td>
        <td class="col-date table-muted-cell">${formatShortDate(appliedDate)}</td>
        <td class="col-follow-up">${followUpLabel}</td>
        <td class="col-interview table-muted-cell">${app.interviewDate ? formatShortDate(app.interviewDate) : '—'}</td>
        <td class="col-status">${statusSelect(app)}</td>
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

    row.dataset.id = app.id;
    row.tabIndex = 0;
    row.setAttribute('aria-expanded', isExpanded);
    row.addEventListener('click', () => toggleNotes(app.id));
    row.addEventListener('keydown', (e) => {
        if (e.target === row && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            toggleNotes(app.id, true);
        }
    });
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
            <td colspan="9" class="notes-cell">
                <div class="drawer-inner">
                    ${linkHtml}
                    <div class="reminder-controls">
                        ${reminderStateSelect(app, 'followup')}
                        ${reminderStateSelect(app, 'interview')}
                    </div>
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
    card.dataset.id = app.id;

    const currencySymbol = app.currency === 'USD' ? '$' : '₱';
    const rateText = app.salaryRate === 'Hour' ? 'Hour' : 'Month';
    const formattedSalary = app.salary 
        ? `${currencySymbol}${escapeMarkup(app.salary)} / ${rateText}`
        : '—';
    const appliedDate = app.appliedDate || app.dateAdded;
    const followUpLabel = app.followUpDate
        ? `<span class="${isFollowUpDue(app.followUpDate, app.status, app.followUpState) ? 'follow-up-due' : 'follow-up-date'}">${formatShortDate(app.followUpDate)}</span>`
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
                <div class="mobile-card-company"><span class="mobile-card-number">#${app.seqNumber}</span> ${escapeMarkup(app.company)}</div>
                <div class="mobile-card-role">${escapeMarkup(app.position)}</div>
            </div>
            ${statusSelect(app)}
        </div>

        <div class="mobile-card-meta">
            <span class="mobile-card-salary">${formattedSalary}</span>
            <span>${formatShortDate(appliedDate)}</span>
        </div>
        <div class="mobile-card-follow-up">${followUpLabel}</div>
        ${app.interviewDate ? `<div class="mobile-card-follow-up">Interview: ${formatShortDate(app.interviewDate)}</div>` : ''}
        <div class="reminder-controls mobile-reminder-controls">
            ${reminderStateSelect(app, 'followup')}
            ${reminderStateSelect(app, 'interview')}
        </div>

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

function toggleNotes(id, fromKeyboard = false) {
    openNotesId = openNotesId === id ? null : id;
    renderPipeline(searchInput.value);
    if (fromKeyboard) {
        const row = document.querySelector(`.job-row[data-id="${id}"]`);
        if (row) row.focus();
    }
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
    const interviewDate = interviewDateInput.value;
    let addedId = null;

    if (editId) {
        applications = applications.map(app => {
            if (app.id === parseInt(editId)) {
                return { ...app, company, position, currency, salary, salaryRate, status, appliedDate, jobLink, notes, followUpDate, followUpState: followUpStateInput.value, interviewDate, interviewState: interviewStateInput.value };
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
            followUpState: followUpStateInput.value,
            interviewDate,
            interviewState: interviewStateInput.value,
            bookmarked: false,
            dateAdded: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        };
        applications.unshift(newRecord);
        addedId = newRecord.id;
    }

    persistData();
    renderPipeline(searchInput.value);
    closeFormModal();
    if (addedId) revealApplication(addedId, true);
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
    followUpStateInput.value = target.followUpState || 'pending';
    interviewDateInput.value = target.interviewDate || '';
    interviewStateInput.value = target.interviewState || 'pending';
    formDirty = false;

    formTitle.textContent = "Edit Application";
    btnSubmitText.textContent = "Update Application";

    formModalOverlay.classList.add('active');
    document.getElementById('company').focus();
}

function promptDelete(id) {
    pendingDeleteId = id;
    deleteModalOverlay.classList.add('active');
}

btnConfirmDelete.addEventListener('click', () => {
    if (pendingDeleteId) {
        const index = applications.findIndex(item => item.id === pendingDeleteId);
        if (index !== -1) {
            const [removed] = applications.splice(index, 1);
            if (openNotesId === pendingDeleteId) openNotesId = null;
            persistData();
            renderPipeline(searchInput.value);
            showToast('Application deleted.', 'Undo', () => {
                applications.splice(Math.min(index, applications.length), 0, removed);
                persistData();
                renderPipeline(searchInput.value);
            });
        }
    }
    closeDeleteModal();
});

btnCancelDelete.addEventListener('click', closeDeleteModal);

function closeDeleteModal() {
    deleteModalOverlay.classList.remove('active');
    pendingDeleteId = null;
}

function persistData() {
    try {
        localStorage.setItem('worqueue_records', JSON.stringify(applications));
    } catch {
        showToast('Could not save. Browser storage may be full or blocked.');
    }
}

function escapeMarkup(text) {
    return String(text ?? '').replace(/[&<>"']/g, function (match) {
        return {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        }[match];
    });
}

/* ---------- Toast ---------- */
function showToast(message, actionLabel, onAction) {
    toastMessage.textContent = message;
    toastUndo = onAction || null;
    toastAction.hidden = !onAction;
    toastAction.textContent = actionLabel || 'Undo';
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(hideToast, 6000);
}

function hideToast() {
    toastEl.classList.remove('show');
    toastUndo = null;
}

toastAction.addEventListener('click', () => {
    const action = toastUndo;
    hideToast();
    if (action) action();
});

/* ---------- CSV export ---------- */
function csvCell(value) {
    let text = String(value ?? '');
    if (/^[=+\-@\t\r]/.test(text)) text = "'" + text; // stop spreadsheet formulas
    return `"${text.replace(/"/g, '""')}"`;
}

btnExportCsv.addEventListener('click', () => {
    if (applications.length === 0) {
        backupStatus.textContent = 'Nothing to export yet.';
        return;
    }
    const header = ['#', 'Company', 'Role', 'Currency', 'Salary', 'Rate', 'Status', 'Applied', 'Follow-up', 'Follow-up status', 'Interview', 'Interview status', 'Job link', 'Notes', 'Bookmarked'];
    const rows = applications.map(app => [
        app.seqNumber, app.company, app.position, app.currency || 'PHP', app.salary || '', app.salaryRate || 'Month',
        app.status, getInputDate(app.appliedDate || app.dateAdded), app.followUpDate || '', app.followUpState || 'pending', app.interviewDate || '', app.interviewState || 'pending',
        app.jobLink || '', app.notes || '', app.bookmarked ? 'Yes' : 'No'
    ]);
    const csv = '\ufeff' + [header, ...rows].map(row => row.map(csvCell).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `worqueue-applications-${toLocalISO()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    backupStatus.textContent = 'CSV downloaded.';
});

/* ---------- Sample data ---------- */
function buildSampleData() {
    const day = offset => {
        const d = new Date();
        d.setDate(d.getDate() + offset);
        return toLocalISO(d);
    };
    const note = text => `Sample data: ${text}`;
    // Listed oldest to newest, so entry #1 is the oldest application
    const samples = [
        { company: 'Orbital Works', position: 'Embedded Systems Intern', currency: 'PHP', salary: '18,000', salaryRate: 'Month', status: 'Offered', applied: -30, interview: -20, bookmarked: true, notes: note('offer received. Reply before the end of the week.') },
        { company: 'Pixelharbor', position: 'QA Tester', currency: 'PHP', salary: '20,000', salaryRate: 'Month', status: 'Rejected', applied: -25, notes: note('position was filled internally.') },
        { company: 'Tindahan Tech', position: 'IT Support Specialist', currency: 'PHP', salary: '23,000', salaryRate: 'Month', status: 'Withdrawn', applied: -18, notes: note('schedule did not fit, withdrew application.') },
        { company: 'Brightline Studio', position: 'Junior Web Developer', currency: 'PHP', salary: '25,000', salaryRate: 'Month', status: 'Interviewing', applied: -12, follow: -1, interview: 2, bookmarked: true, notes: note('first-round call went well. Prepare a short walkthrough of a past project.') },
        { company: 'Mabuhay Cloud', position: 'Junior Python Developer', currency: 'USD', salary: '12.50', salaryRate: 'Hour', status: 'Interviewing', applied: -8, follow: 4, interview: 6, notes: note('technical interview next week. Review Python basics.') },
        { company: 'Kapitan Software', position: 'Software Engineer Trainee', currency: 'PHP', salary: '22,000', salaryRate: 'Month', status: 'Applied', applied: -5, follow: 3, notes: note('applied through the careers page.') },
        { company: 'Luzon Digital', position: 'Frontend Intern', currency: 'PHP', salary: '15,000', salaryRate: 'Month', status: 'Applied', applied: -3, follow: 0, notes: note('send a short follow-up email today.') }
    ];
    let seq = applications.reduce((max, item) => Math.max(max, item.seqNumber || 0), 0);
    const baseId = Date.now();
    return samples.map((item, i) => ({
        id: baseId + i,
        seqNumber: ++seq,
        company: item.company,
        position: item.position,
        currency: item.currency,
        salary: item.salary,
        salaryRate: item.salaryRate,
        status: item.status,
        appliedDate: day(item.applied),
        jobLink: 'https://example.com/careers',
        notes: item.notes,
        followUpDate: item.follow !== undefined ? day(item.follow) : '',
        interviewDate: item.interview !== undefined ? day(item.interview) : '',
        bookmarked: !!item.bookmarked,
        dateAdded: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        sample: true
    }));
}

function loadSampleData() {
    if (applications.some(app => app.sample)) {
        sampleStatus.textContent = 'Sample data is already loaded.';
        showToast('Sample data is already loaded.');
        return;
    }
    const samples = buildSampleData();
    applications = [...applications, ...samples];
    persistData();
    renderPipeline(searchInput.value);
    sampleStatus.textContent = `Loaded ${samples.length} sample applications.`;
    showToast(`Loaded ${samples.length} sample applications.`, 'Undo', removeSampleData);
}

function removeSampleData() {
    const before = applications.length;
    applications = applications.filter(app => !app.sample);
    const removed = before - applications.length;
    if (removed === 0) {
        sampleStatus.textContent = 'No sample data to remove.';
        return;
    }
    if (openNotesId && !applications.some(app => app.id === openNotesId)) openNotesId = null;
    persistData();
    renderPipeline(searchInput.value);
    sampleStatus.textContent = `Removed ${removed} sample applications.`;
}

btnLoadSample.addEventListener('click', loadSampleData);
btnRemoveSample.addEventListener('click', removeSampleData);

/* ---------- Profile ---------- */
const PROFILE_KEY = 'worqueue_profile';
const PROFILE_FIELDS = ['name', 'headline', 'email', 'phone', 'location', 'linkedin', 'github', 'portfolio'];
const URL_FIELDS = ['linkedin', 'github', 'portfolio'];
const MAX_CUSTOM_LINKS = 5;
const MAX_RESUME_BYTES = 5 * 1024 * 1024;
const COPY_ICON = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13"/><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/></svg>';
const TRASH_ICON = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>';

const profileStatus = document.getElementById('profile-status');
const profilePhoto = document.getElementById('profile-photo');
const profileInitials = document.getElementById('profile-initials');
const photoFile = document.getElementById('photo-file');
const btnPhotoUpload = document.getElementById('btn-photo-upload');
const btnPhotoCopy = document.getElementById('btn-photo-copy');
const btnPhotoDownload = document.getElementById('btn-photo-download');
const btnPhotoRemove = document.getElementById('btn-photo-remove');
const customLinksEl = document.getElementById('custom-links');
const btnAddLink = document.getElementById('btn-add-link');
const btnCopyAll = document.getElementById('btn-copy-all');
const resumeBox = document.getElementById('resume-box');
const resumeFile = document.getElementById('resume-file');
const resumeStatus = document.getElementById('resume-status');
const btnResumeUpload = document.getElementById('btn-resume-upload');
const btnResumeOpen = document.getElementById('btn-resume-open');
const btnResumeDownload = document.getElementById('btn-resume-download');
const btnResumeRemove = document.getElementById('btn-resume-remove');
const profileInputs = document.querySelectorAll('[data-profile]');

function emptyProfile() {
    return { name: '', headline: '', email: '', phone: '', location: '', linkedin: '', github: '', portfolio: '', links: [], photo: '' };
}

// Only keep known fields, so imported files can't inject anything unexpected
function sanitizeProfile(raw) {
    const clean = emptyProfile();
    if (!raw || typeof raw !== 'object') return clean;
    PROFILE_FIELDS.forEach(key => {
        if (typeof raw[key] === 'string') clean[key] = raw[key].slice(0, 300);
    });
    if (Array.isArray(raw.links)) {
        clean.links = raw.links
            .filter(link => link && typeof link === 'object')
            .slice(0, MAX_CUSTOM_LINKS)
            .map(link => ({ label: String(link.label || '').slice(0, 60), url: String(link.url || '').slice(0, 300) }));
    }
    if (typeof raw.photo === 'string' && raw.photo.length < 1500000 && /^data:image\/(jpeg|png|webp);base64,/.test(raw.photo)) {
        clean.photo = raw.photo;
    }
    return clean;
}

function loadProfile() {
    try {
        return sanitizeProfile(JSON.parse(localStorage.getItem(PROFILE_KEY) || '{}'));
    } catch {
        return emptyProfile();
    }
}

let profile = loadProfile();
let profileSaveTimer = null;

function saveProfile() {
    clearTimeout(profileSaveTimer);
    try {
        localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
        profileStatus.textContent = 'Saved';
    } catch {
        profileStatus.textContent = 'Not saved';
        showToast('Could not save your profile. Browser storage may be full or blocked.');
    }
}

function scheduleProfileSave() {
    profileStatus.textContent = 'Saving...';
    clearTimeout(profileSaveTimer);
    profileSaveTimer = setTimeout(saveProfile, 400);
}

// Add https:// to things that look like a web address, so they paste cleanly into forms
function normalizeUrl(value) {
    const text = value.trim();
    if (!text || /^[a-z][a-z0-9+.-]*:/i.test(text) || /\s/.test(text) || !text.includes('.')) return text;
    return `https://${text}`;
}

function getInitials(name) {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    const first = parts[0][0];
    const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
    return (first + last).toUpperCase();
}

function fileSlug() {
    return (profile.name || 'profile').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'profile';
}

/* Copy helpers */
function legacyCopy(text) {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.cssText = 'position:fixed;opacity:0;top:0;left:0;';
    document.body.appendChild(area);
    area.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch { ok = false; }
    area.remove();
    return ok;
}

async function copyText(text, label) {
    if (!text.trim()) {
        showToast(`Nothing to copy yet. Add your ${label.toLowerCase()} first.`);
        return;
    }
    let ok = false;
    try {
        await navigator.clipboard.writeText(text);
        ok = true;
    } catch {
        ok = legacyCopy(text);
    }
    showToast(ok ? `${label} copied.` : 'Could not copy. Select the text and copy it manually.');
}

function profileAsText() {
    const lines = [];
    if (profile.name.trim()) lines.push(profile.name.trim());
    if (profile.headline.trim()) lines.push(profile.headline.trim());
    if (lines.length) lines.push('');
    [['Email', 'email'], ['Phone', 'phone'], ['Location', 'location'], ['LinkedIn', 'linkedin'], ['GitHub', 'github'], ['Portfolio', 'portfolio']]
        .forEach(([label, key]) => {
            if (profile[key].trim()) lines.push(`${label}: ${profile[key].trim()}`);
        });
    profile.links.forEach(link => {
        if (link.url.trim()) lines.push(`${link.label.trim() || 'Link'}: ${link.url.trim()}`);
    });
    return lines.join('\n').trim();
}

/* Rendering */
function renderPhoto() {
    const hasPhoto = !!profile.photo;
    if (hasPhoto) profilePhoto.src = profile.photo;
    else profilePhoto.removeAttribute('src');
    profilePhoto.hidden = !hasPhoto;
    profilePhoto.alt = hasPhoto ? `${profile.name || 'Your'} profile photo` : '';
    profileInitials.hidden = hasPhoto;
    profileInitials.textContent = getInitials(profile.name);
    btnPhotoCopy.disabled = !hasPhoto;
    btnPhotoDownload.disabled = !hasPhoto;
    btnPhotoRemove.disabled = !hasPhoto;
    btnPhotoUpload.textContent = hasPhoto ? 'Replace photo' : 'Upload photo';
}

function renderCustomLinks() {
    customLinksEl.innerHTML = profile.links.map((link, i) => `
        <div class="custom-link-row">
            <input type="text" class="custom-link-label" data-index="${i}" value="${escapeMarkup(link.label)}" placeholder="Label" aria-label="Link label" autocomplete="off">
            <input type="text" class="custom-link-url" data-index="${i}" value="${escapeMarkup(link.url)}" placeholder="https://" aria-label="Link URL" autocomplete="off">
            <button type="button" class="icon-btn copy-btn" data-copy-link="${i}" aria-label="Copy link" title="Copy link">${COPY_ICON}</button>
            <button type="button" class="icon-btn icon-btn-delete" data-remove-link="${i}" aria-label="Remove link" title="Remove link">${TRASH_ICON}</button>
        </div>`).join('');
    btnAddLink.hidden = profile.links.length >= MAX_CUSTOM_LINKS;
}

function renderProfile() {
    profileInputs.forEach(input => { input.value = profile[input.dataset.profile] || ''; });
    renderPhoto();
    renderCustomLinks();
}

/* Field editing */
profileInputs.forEach(input => {
    const key = input.dataset.profile;
    input.addEventListener('input', () => {
        profile[key] = input.value;
        if (key === 'name') renderPhoto();
        scheduleProfileSave();
    });
    if (URL_FIELDS.includes(key)) {
        input.addEventListener('blur', () => {
            const fixed = normalizeUrl(input.value);
            if (fixed !== input.value) {
                input.value = fixed;
                profile[key] = fixed;
                scheduleProfileSave();
            }
        });
    }
});

document.querySelectorAll('[data-copy]').forEach(btn => {
    btn.addEventListener('click', () => {
        const input = document.getElementById(btn.dataset.copy);
        copyText(input.value, btn.dataset.label);
    });
});

btnCopyAll.addEventListener('click', () => copyText(profileAsText(), 'Profile details'));

/* Other links */
btnAddLink.addEventListener('click', () => {
    if (profile.links.length >= MAX_CUSTOM_LINKS) return;
    profile.links.push({ label: '', url: '' });
    renderCustomLinks();
    const rows = customLinksEl.querySelectorAll('.custom-link-label');
    rows[rows.length - 1].focus();
    scheduleProfileSave();
});

customLinksEl.addEventListener('input', (e) => {
    const index = Number(e.target.dataset.index);
    if (!profile.links[index]) return;
    if (e.target.classList.contains('custom-link-label')) profile.links[index].label = e.target.value;
    if (e.target.classList.contains('custom-link-url')) profile.links[index].url = e.target.value;
    scheduleProfileSave();
});

customLinksEl.addEventListener('focusout', (e) => {
    if (!e.target.classList.contains('custom-link-url')) return;
    const index = Number(e.target.dataset.index);
    const fixed = normalizeUrl(e.target.value);
    if (profile.links[index] && fixed !== e.target.value) {
        e.target.value = fixed;
        profile.links[index].url = fixed;
        scheduleProfileSave();
    }
});

customLinksEl.addEventListener('click', (e) => {
    const copyBtn = e.target.closest('[data-copy-link]');
    const removeBtn = e.target.closest('[data-remove-link]');
    if (copyBtn) {
        const link = profile.links[Number(copyBtn.dataset.copyLink)];
        if (link) copyText(link.url, link.label.trim() || 'Link');
    } else if (removeBtn) {
        profile.links.splice(Number(removeBtn.dataset.removeLink), 1);
        renderCustomLinks();
        scheduleProfileSave();
    }
});

/* Photo */
function cropToSquare(file, size = 512) {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
            try {
                const side = Math.min(img.naturalWidth, img.naturalHeight);
                const canvas = document.createElement('canvas');
                canvas.width = canvas.height = Math.min(size, side);
                const ctx = canvas.getContext('2d');
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL('image/jpeg', 0.88));
            } catch (error) {
                reject(error);
            } finally {
                URL.revokeObjectURL(url);
            }
        };
        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('Unreadable image'));
        };
        img.src = url;
    });
}

function dataUrlToPngBlob(dataUrl) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            canvas.getContext('2d').drawImage(img, 0, 0);
            canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Could not convert image')), 'image/png');
        };
        img.onerror = () => reject(new Error('Could not load image'));
        img.src = dataUrl;
    });
}

btnPhotoUpload.addEventListener('click', () => photoFile.click());

photoFile.addEventListener('change', async () => {
    const file = photoFile.files[0];
    photoFile.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
        showToast('Please choose an image file (JPG, PNG or WebP).');
        return;
    }
    try {
        profile.photo = await cropToSquare(file);
        saveProfile();
        renderPhoto();
        showToast('Photo updated.');
    } catch {
        showToast("Couldn't read that image. Try a JPG or PNG.");
    }
});

btnPhotoCopy.addEventListener('click', async () => {
    if (!profile.photo) return;
    if (!navigator.clipboard || !window.ClipboardItem) {
        showToast("This browser can't copy images here. Use Download instead.");
        return;
    }
    try {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': dataUrlToPngBlob(profile.photo) })]);
        showToast('Photo copied. Paste it where you need it.');
    } catch {
        showToast("Couldn't copy the photo. Use Download instead.");
    }
});

btnPhotoDownload.addEventListener('click', () => {
    if (!profile.photo) return;
    const link = document.createElement('a');
    link.href = profile.photo;
    link.download = `${fileSlug()}-photo.jpg`;
    link.click();
});

btnPhotoRemove.addEventListener('click', () => {
    const previous = profile.photo;
    if (!previous) return;
    profile.photo = '';
    saveProfile();
    renderPhoto();
    showToast('Photo removed.', 'Undo', () => {
        profile.photo = previous;
        saveProfile();
        renderPhoto();
    });
});

/* Resume (stored in IndexedDB because files are too big for localStorage) */
function openFilesDb() {
    return new Promise((resolve, reject) => {
        if (!window.indexedDB) {
            reject(new Error('IndexedDB unavailable'));
            return;
        }
        const request = indexedDB.open('worqueue', 1);
        request.onupgradeneeded = () => request.result.createObjectStore('files');
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

function filesTx(mode, action) {
    return openFilesDb().then(db => new Promise((resolve, reject) => {
        const tx = db.transaction('files', mode);
        const request = action(tx.objectStore('files'));
        tx.oncomplete = () => { db.close(); resolve(request.result); };
        tx.onerror = tx.onabort = () => { db.close(); reject(tx.error); };
    }));
}

const resumeStore = {
    get: () => filesTx('readonly', store => store.get('resume')),
    set: record => filesTx('readwrite', store => store.put(record, 'resume')),
    remove: () => filesTx('readwrite', store => store.delete('resume'))
};

let resumeRecord = null;
let resumeAvailable = true;

function formatBytes(bytes) {
    return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function isPdf(record) {
    return !!record && /\.pdf$/i.test(record.name);
}

function renderResume() {
    const has = !!resumeRecord;
    btnResumeUpload.disabled = !resumeAvailable;
    btnResumeOpen.hidden = !isPdf(resumeRecord);
    btnResumeDownload.disabled = !has;
    btnResumeRemove.disabled = !has;
    btnResumeUpload.textContent = has ? 'Replace resume' : 'Upload resume';

    if (!resumeAvailable) {
        resumeBox.textContent = 'Resume storage is not available in this browser mode (for example private browsing).';
    } else if (!has) {
        resumeBox.textContent = 'No resume uploaded yet.';
    } else {
        resumeBox.innerHTML = `
            <div>
                <div class="resume-name">${escapeMarkup(resumeRecord.name)}</div>
                <div class="resume-meta">${formatBytes(resumeRecord.size)} · Updated ${formatShortDate(resumeRecord.updated)}</div>
            </div>`;
    }
}

async function refreshResume() {
    try {
        resumeRecord = (await resumeStore.get()) || null;
        resumeAvailable = true;
    } catch {
        resumeRecord = null;
        resumeAvailable = false;
    }
    renderResume();
}

btnResumeUpload.addEventListener('click', () => resumeFile.click());

resumeFile.addEventListener('change', async () => {
    const file = resumeFile.files[0];
    resumeFile.value = '';
    if (!file) return;
    if (!/\.(pdf|doc|docx)$/i.test(file.name)) {
        resumeStatus.textContent = 'Please choose a PDF, DOC or DOCX file.';
        return;
    }
    if (file.size > MAX_RESUME_BYTES) {
        resumeStatus.textContent = `That file is ${formatBytes(file.size)}. The limit is 5 MB.`;
        return;
    }
    try {
        await resumeStore.set({ name: file.name, type: file.type, size: file.size, updated: new Date().toISOString(), blob: file });
        await refreshResume();
        resumeStatus.textContent = 'Resume saved.';
    } catch {
        resumeStatus.textContent = 'Could not save the resume. Browser storage may be full or blocked.';
    }
});

btnResumeDownload.addEventListener('click', () => {
    if (!resumeRecord) return;
    const url = URL.createObjectURL(resumeRecord.blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = resumeRecord.name;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
});

btnResumeOpen.addEventListener('click', () => {
    if (!isPdf(resumeRecord)) return;
    const url = URL.createObjectURL(new Blob([resumeRecord.blob], { type: 'application/pdf' }));
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 60000);
});

btnResumeRemove.addEventListener('click', async () => {
    const previous = resumeRecord;
    if (!previous) return;
    try {
        await resumeStore.remove();
        await refreshResume();
        resumeStatus.textContent = '';
        showToast('Resume removed.', 'Undo', async () => {
            try {
                await resumeStore.set(previous);
                await refreshResume();
            } catch {
                resumeStatus.textContent = 'Could not restore the resume.';
            }
        });
    } catch {
        resumeStatus.textContent = 'Could not remove the resume.';
    }
});

renderProfile();
refreshResume();

renderPipeline();
updateDashboard();