// Authentication Guard
if (sessionStorage.getItem('wh_logged_in') !== 'true' && !window.location.pathname.includes('login.html')) {
    window.location.href = 'login.html';
}

document.addEventListener('DOMContentLoaded', () => {
    // --- API Configuration ---
    const isLocalFile = window.location.protocol === 'file:';
    const API_BASE_URL = isLocalFile ? 'http://localhost:8000/api' : '/api';
    const getToken = () => sessionStorage.getItem('wh_token');

    async function apiFetch(endpoint, options = {}) {
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getToken()}`,
            ...options.headers,
        };
        try {
            const response = await fetch(`${API_BASE_URL}${endpoint}`, { ...options, headers });

            if (response.status === 401) {
                window.logout();
                return null;
            }

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error('API Error:', response.status, errorData);
                const msg = errorData.detail || errorData.message || `Error ${response.status}`;
                if (window.showToast) window.showToast(`Cillad API: ${msg}`, 'error');
                return null;
            }

            return await response.json();
        } catch (err) {
            console.error('Fetch Error:', err);
            if (window.showToast) window.showToast(`Xiriirkii ayaa go'ay: ${err.message}`, 'error');
            return null;
        }
    }

    // Initialize state
    let masterItems = [];
    let activities = [];
    let masterUsers = [];

    async function loadInitialData() {
        try {
            // Check for legacy localStorage users to migrate
            const legacyUsers = localStorage.getItem('wh_master_users');
            if (legacyUsers) {
                const parsedUsers = JSON.parse(legacyUsers);
                if (parsedUsers.length > 0) {
                    await apiFetch('/migrate-users', {
                        method: 'POST',
                        body: JSON.stringify(parsedUsers)
                    });
                }
                localStorage.removeItem('wh_master_users');
            }

            const [items, acts, users] = await Promise.all([
                apiFetch('/items'),
                apiFetch('/activities'),
                apiFetch('/users')
            ]);

            masterItems = items || [];
            activities = acts || [];
            masterUsers = users || [];

            renderData();
            populateItemDropdowns();
            initializeRoleView();
        } catch (err) {
            console.error('Failed to load initial data:', err);
            showToast('Dhibaatid xogta lagu soo rarayo (Data load error)', 'error');
        }
    }

    // Current User State from Session
    const savedUser = JSON.parse(sessionStorage.getItem('wh_user')) || { name: 'Salah Abdi Ismail', role: 'storekeeper' };
    let currentUser = { ...savedUser, avatar: savedUser.role === 'storekeeper' ? 'S' : (savedUser.role === 'wasiir' ? 'W' : 'G') };

    // DOM Elements
    const userNameDisplay = document.getElementById('display-user-name');
    const userRoleDisplay = document.getElementById('display-user-role');
    const userAvatarDisplay = document.getElementById('display-user-avatar');
    const navLinks = document.querySelectorAll('.sidebar-nav a');
    const views = document.querySelectorAll('.app-view');
    const storekeeperElements = document.querySelectorAll('.storekeeper-only');

    const inItemSelect = document.getElementById('in-item-select');
    const outItemSelect = document.getElementById('out-item-select');

    // --- Inventory Grouping State ---
    window.expandedCategories = window.expandedCategories || new Set();
    window.toggleCategory = (category) => {
        if (window.expandedCategories.has(category)) {
            window.expandedCategories.delete(category);
        } else {
            window.expandedCategories.add(category);
        }
        renderData();
    };

    // --- Role Management ---
    function initializeRoleView() {
        if (currentUser.role === 'storekeeper') {
            storekeeperElements.forEach(el => el.classList.remove('hidden'));
        } else {
            storekeeperElements.forEach(el => el.classList.add('hidden'));
        }

        // Verification view ONLY for Agaasime
        const verificatonLink = document.querySelector('.verification-link');
        if (verificatonLink) {
            if (currentUser.role === 'agaasime') {
                verificatonLink.classList.remove('hidden');
            } else {
                verificatonLink.classList.add('hidden');
            }
        }

        // Show User Management actions for Wasiir as requested
        const addBtn = document.getElementById('btn-add-user');
        if (currentUser.role.toLowerCase() === 'wasiir') {
            if (addBtn) addBtn.classList.remove('hidden');
        } else {
            if (addBtn) addBtn.classList.add('hidden');
        }

        userNameDisplay.textContent = currentUser.name;
        userRoleDisplay.textContent = currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1);

        renderUsers();
        updateVerificationBadge();
    }

    // Logout Function
    window.logout = () => {
        sessionStorage.removeItem('wh_logged_in');
        sessionStorage.removeItem('wh_user');
        sessionStorage.removeItem('wh_token');
        window.location.href = 'login.html';
    };

    // --- Dropdown Management ---
    function populateItemDropdowns() {
        // Inbound: Populate Categories with normalization (trim and uniqueness)
        const categories = [...new Set(masterItems.map(item => (item.category || '').trim()))];
        const catOptions = '<option value="" disabled selected>Dooro Qaybta</option>' +
            categories.map(cat => `<option value="${cat}">${cat}</option>`).join('') +
            '<option value="NEW_CATEGORY">+ New Category...</option>';

        const inCatSelect = document.getElementById('in-existing-category');
        if (inCatSelect) inCatSelect.innerHTML = catOptions;

        const outCatSelect = document.getElementById('out-category-select');
        if (outCatSelect) {
            outCatSelect.innerHTML = '<option value="" disabled selected>Dooro Qaybta</option>' +
                categories.map(cat => `<option value="${cat}">${cat}</option>`).join('');
        }

        // Reset Item Selects
        if (inItemSelect) inItemSelect.innerHTML = '<option value="" disabled selected>Dooro Agabka</option>';
        if (outItemSelect) outItemSelect.innerHTML = '<option value="" disabled selected>Dooro Agabka</option>';

        const outStockDisplay = document.getElementById('out-stock-display');
        if (outStockDisplay) outStockDisplay.textContent = '';

        // Hide new item/category fields by default
        const newCatContainer = document.getElementById('in-new-cat-container');
        const newItemContainer = document.getElementById('in-new-item-container');
        if (newCatContainer) newCatContainer.style.display = 'none';
        if (newItemContainer) newItemContainer.style.display = 'none';
    }


    // --- View Navigation ---
    function updateReportUserFilter() {
        const reportUserSelect = document.getElementById('report-user-filter');
        if (!reportUserSelect) return;

        const storekeepers = masterUsers.filter(u => u.role === 'storekeeper');
        let options = '<option value="ALL">Dhamaan Storekeepers-ka</option>';
        storekeepers.forEach(u => {
            options += `<option value="${u.name}">${u.name}</option>`;
        });
        reportUserSelect.innerHTML = options;
    }

    function switchView(target) {
        views.forEach(view => view.classList.remove('active'));
        const targetView = document.getElementById(`view-${target}`);
        if (targetView) targetView.classList.add('active');

        navLinks.forEach(link => {
            link.parentElement.classList.remove('active');
            if (link.getAttribute('data-target') === target) {
                link.parentElement.classList.add('active');
            }
        });

        if (target === 'inventory') renderInventory();
        if (target === 'activity') renderActivities();
        if (target === 'users') renderUsers();
        if (target === 'reports') updateReportUserFilter();
        if (target === 'verification') renderVerificationView();
    }
    window.switchView = switchView;

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            switchView(link.getAttribute('data-target'));


            // Close sidebar on mobile after clicking a link
            if (window.innerWidth <= 1024) {
                document.querySelector('.sidebar').classList.remove('mobile-active');
                document.getElementById('sidebar-overlay').classList.remove('active');
            }
        });
    });

    // --- Mobile Sidebar Toggle ---
    const menuToggle = document.getElementById('menu-toggle');
    const sidebar = document.querySelector('.sidebar');
    const sidebarOverlay = document.getElementById('sidebar-overlay');

    if (menuToggle) {
        menuToggle.addEventListener('click', () => {
            sidebar.classList.add('mobile-active');
            sidebarOverlay.classList.add('active');
        });
    }

    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', () => {
            sidebar.classList.remove('mobile-active');
            sidebarOverlay.classList.remove('active');
        });
    }

    // --- Data Rendering & Logic ---
    function calculateInventory() {
        const inventory = {};
        // Use composite key "Name|Category" to distinguish items
        masterItems.forEach(item => {
            const key = `${item.name}|${item.category}`;
            inventory[key] = 0;
        });

        // ONLY process 'Approved' or transactions without a status (Legacy data)
        activities.filter(a => !a.status || a.status === 'Approved').forEach(act => {
            const parts = act.action.split(': ');
            if (parts.length < 2) return;
            const type = parts[0];
            const detail = parts[1].split(' ');
            const qtyStr = detail[0];
            const qty = parseInt(qtyStr);
            const itemName = detail.slice(1).join(' ');

            // Try to find the category from activity metadata first, otherwise fallback to master list
            const category = act.itemCategory || (masterItems.find(m => m.name === itemName)?.category) || 'General';
            const key = `${itemName}|${category}`;

            if (!isNaN(qty)) {
                if (type === 'Geliyay') inventory[key] = (inventory[key] || 0) + qty;
                else inventory[key] = (inventory[key] || 0) - qty;
            }
        });
        return inventory;
    }


    function renderData() {
        const inventory = calculateInventory();
        const today = new Date().toLocaleDateString('en-GB');

        let totalItems = 0;
        let inToday = 0;
        let outToday = 0;

        Object.values(inventory).forEach(q => totalItems += q);
        activities.forEach(act => {
            if (act.date === today) {
                const parts = act.action.split(': ');
                if (parts.length < 2) return;
                const qtyStr = parts[1].split(' ')[0];
                const qty = parseInt(qtyStr);
                if (!isNaN(qty)) {
                    if (act.action.includes('Geliyay')) inToday += qty;
                    else outToday += qty;
                }
            }
        });

        const statTotal = document.getElementById('stat-total');
        const statIn = document.getElementById('stat-in-today');
        const statOut = document.getElementById('stat-out-today');
        if (statTotal) statTotal.textContent = totalItems.toLocaleString();
        if (statIn) statIn.textContent = inToday.toLocaleString();
        if (statOut) statOut.textContent = outToday.toLocaleString();

        const activityList = document.getElementById('activity-list');
        if (activityList) {
            activityList.innerHTML = activities.slice(-5).reverse().map(act => `
                <tr>
                    <td>${act.date}</td>
                    <td>
                        <div class="${act.action.includes('Bixiyay') ? 'status-out' : 'status-in'}">${act.action}</div>
                        ${act.comment ? `<small class="activity-comment">${act.comment}</small>` : ''}
                    </td>
                    <td>${act.recipient}</td>
                    <td><strong>${act.user}</strong></td>
                    <td><span class="status-badge ${act.status === 'Approved' ? 'status-in' : (act.status === 'Rejected' ? 'status-out' : 'status-badge-pending')}">${act.status || 'Approved'}</span></td>
                </tr>
            `).join('');
        }


        const inventoryList = document.getElementById('inventory-list');
        if (inventoryList) {
            // Group inventory by category
            const groupedInventory = {};
            Object.entries(inventory).forEach(([key, qty]) => {
                const [itemName, category] = key.split('|');
                if (!groupedInventory[category]) {
                    groupedInventory[category] = { items: [], total: 0, latestIndex: -1 };
                }
                groupedInventory[category].items.push({ name: itemName, qty });
                groupedInventory[category].total += qty;

                // Track latest activity index for sorting
                const lastIdx = activities.findIndex(a => a.itemCategory === category);
                // Actually find the last occurrence
                let lastOccur = -1;
                for (let i = activities.length - 1; i >= 0; i--) {
                    if (activities[i].itemCategory === category) {
                        lastOccur = i;
                        break;
                    }
                }
                if (lastOccur > groupedInventory[category].latestIndex) {
                    groupedInventory[category].latestIndex = lastOccur;
                }
            });

            // Sort categories by latestIndex (newest first)
            const sortedCategories = Object.keys(groupedInventory).sort((a, b) => {
                return groupedInventory[b].latestIndex - groupedInventory[a].latestIndex;
            });

            let html = '';
            sortedCategories.forEach(cat => {
                const data = groupedInventory[cat];
                const isExpanded = window.expandedCategories?.has(cat);

                html += `
                <tr class="category-row ${isExpanded ? 'expanded' : ''}" onclick="toggleCategory('${cat}')">
                    <td colspan="2"><i class="fa-solid fa-chevron-right"></i>${cat}</td>
                    <td class="category-total">${data.total}</td>
                    <td><span class="status-badge ${data.total > 0 ? 'status-in' : 'status-out'}">${data.total > 0 ? 'In Stock' : 'Empty'}</span></td>
                </tr>
                `;

                data.items.forEach(item => {
                    html += `
                    <tr class="detail-row ${isExpanded ? 'visible' : ''}">
                        <td>${item.name}</td>
                        <td>${cat}</td>
                        <td>${item.qty}</td>
                        <td><span class="${item.qty > 10 ? 'status-in' : 'status-out'}">${item.qty > 10 ? 'Available' : 'Low Stock'}</span></td>
                    </tr>
                    `;
                });
            });
            inventoryList.innerHTML = html;
        }


        renderUsers();

        const inboundList = document.getElementById('inbound-list');
        if (inboundList) {
            inboundList.innerHTML = `<thead><tr><th>DATE</th><th>ITEM</th><th>CATEGORY</th><th>QTY</th><th>FROM</th><th>STATUS</th></tr></thead><tbody>` +
                activities.filter(a => a.action.includes('Geliyay')).reverse().map(a => {
                    const parts = a.action.split(': ');
                    const detail = parts[1].split(' ');
                    const qty = detail[0];
                    const itemName = detail.slice(1).join(' ');
                    const category = a.itemCategory || (masterItems.find(m => m.name === itemName)?.category) || 'General';
                    return `<tr><td>${a.date}</td><td>${itemName}</td><td>${category}</td><td>${qty}</td><td>${a.recipient}</td><td><span class="status-badge ${a.status === 'Approved' ? 'status-in' : (a.status === 'Rejected' ? 'status-out' : 'status-badge-pending')}">${a.status || 'Approved'}</span></td></tr>`;
                }).join('') + `</tbody>`;
        }

        const outboundList = document.getElementById('outbound-list');
        if (outboundList) {
            outboundList.innerHTML = `<thead><tr><th>DATE</th><th>ITEM</th><th>CATEGORY</th><th>QTY</th><th>TO</th><th>STATUS</th></tr></thead><tbody>` +
                activities.filter(a => a.action.includes('Bixiyay')).reverse().map(a => {
                    const parts = a.action.split(': ');
                    const detail = parts[1].split(' ');
                    const qty = detail[0];
                    const itemName = detail.slice(1).join(' ');
                    const category = a.itemCategory || (masterItems.find(m => m.name === itemName)?.category) || 'General';
                    return `<tr><td>${a.date}</td><td>${itemName}</td><td>${category}</td><td>${qty}</td><td>${a.recipient}</td><td><span class="status-badge ${a.status === 'Approved' ? 'status-in' : (a.status === 'Rejected' ? 'status-out' : 'status-badge-pending')}">${a.status || 'Approved'}</span></td></tr>`;
                }).join('') + `</tbody>`;
        }


        renderVerificationView();
        renderDashboardVerificationList();
    }

    function renderDashboardVerificationList() {
        const dashboardList = document.getElementById('dashboard-verification-list');
        if (!dashboardList) return;

        const pendingItems = activities
            .map((act, originalIndex) => ({ ...act, originalIndex }))
            .filter(a => a.status === 'Pending')
            .slice(0, 3); // Show only top 3 on dashboard

        if (pendingItems.length === 0) {
            dashboardList.innerHTML = `
                <div class="alert-item info">
                    <i class="fa-solid fa-check-circle"></i>
                    <span>Maya jiraan wax sugaya xaqiijin (No pending verifications).</span>
                </div>`;
            return;
        }

        const canVerify = currentUser.role === 'agaasime';

        dashboardList.innerHTML = pendingItems.map(req => `
            <div class="alert-item ${req.action.includes('Bixiyay') ? 'hazard' : 'info'} ${canVerify ? 'clickable' : ''}" 
                 ${canVerify ? `onclick="window.switchView('verification')"` : ''}>
                <i class="fa-solid ${req.action.includes('Bixiyay') ? 'fa-circle-exclamation' : 'fa-circle-info'}"></i>
                <div style="flex:1;">
                    <div style="font-weight:600; font-size: 0.9rem;">${req.action}</div>
                    <div style="font-size: 0.75rem; color: #64748b;">Loo diray: ${req.recipient} | Diray: ${req.user}</div>
                </div>
            </div>
        `).join('');
    }

    function updateVerificationBadge() {
        const badge = document.getElementById('verification-badge');
        if (badge) {
            const pendingCount = activities.filter(a => a.status === 'Pending').length;
            badge.textContent = pendingCount;
            badge.style.display = pendingCount > 0 ? 'inline-block' : 'none';
        }
    }

    function renderVerificationView() {
        const verificationList = document.getElementById('verification-list');
        if (!verificationList) return;

        const pendingItems = activities.filter(a => a.status === 'Pending');

        if (pendingItems.length === 0) {
            verificationList.innerHTML = '<tr><td colspan="6" style="text-align:center;">No pending requests</td></tr>';
            return;
        }

        verificationList.innerHTML = pendingItems.map((req) => `
            <tr>
                <td>${req.date}</td>
                <td>
                    <div class="${req.action.includes('Bixiyay') ? 'status-out' : 'status-in'}">
                        ${req.action}
                    </div>
                </td>
                <td>${req.recipient}</td>
                <td><strong>${req.user}</strong></td>
                <td>${req.comment || '-'}</td>
                <td>
                    <div class="action-buttons-cell">
                        <button class="btn-approve" onclick="approveRequest(${req.id})">Approve</button>
                        <button class="btn-reject" onclick="rejectRequest(${req.id})">Reject</button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    window.approveRequest = async (id) => {
        try {
            const updated = await apiFetch(`/activities/${id}`, {
                method: 'PATCH',
                body: JSON.stringify({ status: 'Approved' })
            });

            if (updated) {
                const index = activities.findIndex(a => a.id === id);
                if (index !== -1) activities[index].status = 'Approved';
                renderData();
                updateVerificationBadge();
                showToast('Agabka waa la fasaxay (Approved)!', 'success');
            }
        } catch (err) {
            console.error('Approval error:', err);
            showToast('Dhibaatid dhacday (Error processing approval)', 'error');
        }
    };

    window.rejectRequest = async (id) => {
        if (confirm('Ma xaqiijinaysaa inaad diidid codsigan?')) {
            try {
                const updated = await apiFetch(`/activities/${id}`, {
                    method: 'PATCH',
                    body: JSON.stringify({ status: 'Rejected' })
                });

                if (updated) {
                    const index = activities.findIndex(a => a.id === id);
                    if (index !== -1) activities[index].status = 'Rejected';
                    renderData();
                    updateVerificationBadge();
                    showToast('Codsiga waa la diiday (Rejected)!', 'info');
                }
            } catch (err) {
                console.error('Rejection error:', err);
                showToast('Dhibaatid dhacday (Error processing rejection)', 'error');
            }
        }
    };

    // --- Action Handlers ---
    window.requestTransaction = async (item, qty, type, target, comment = '', category = '') => {
        const today = new Date().toLocaleDateString('en-GB');
        const actionPrefix = type === 'in' ? 'Geliyay' : 'Bixiyay';
        try {
            const act = await apiFetch('/activities', {
                method: 'POST',
                body: JSON.stringify({
                    date: today,
                    action: `${actionPrefix}: ${qty} ${item}`,
                    item_category: category,
                    recipient: target,
                    user: currentUser.name,
                    comment: comment,
                    status: 'Pending'
                })
            });

            if (act) {
                activities.push(act);
                updateVerificationBadge();
                showToast('Codsigaga waxaa loo diray Agaasime si uu u aprove gareeyo. Waxaad ka arki kartaa Dashboard-ka.', 'success');
                renderData();
            }
        } catch (err) {
            console.error('Request transaction error:', err);
        }
    };

    window.addTransaction = async (item, qty, type, target, comment = '', category = '') => {
        const today = new Date().toLocaleDateString('en-GB');
        const actionPrefix = type === 'in' ? 'Geliyay' : 'Bixiyay';
        try {
            const act = await apiFetch('/activities', {
                method: 'POST',
                body: JSON.stringify({
                    date: today,
                    action: `${actionPrefix}: ${qty} ${item}`,
                    item_category: category,
                    recipient: target,
                    user: currentUser.name,
                    comment: comment,
                    status: 'Approved'
                })
            });

            if (act) {
                activities.push(act);
                renderData();
                showToast('Waa la xareeyay!', 'success');
            }
        } catch (err) {
            console.error('Add transaction error:', err);
        }
    };


    // --- Modal Management ---
    window.openModal = (id) => {
        if (id === 'modal-in' || id === 'modal-out') populateItemDropdowns();
        document.getElementById(id).style.display = 'block';
    };
    window.closeModal = (id) => document.getElementById(id).style.display = 'none';

    // --- Inbound Modal Logic ---
    const bookFields = document.getElementById('dynamic-book-fields-in');
    const laptopFields = document.getElementById('dynamic-laptop-fields-in');

    function resetInboundModal() {
        bookFields.style.display = 'none';
        laptopFields.style.display = 'none';
        document.getElementById('in-item-select-container').style.display = 'block';

        document.getElementById('in-book-subject').removeAttribute('required');
        document.getElementById('in-book-grade').removeAttribute('required');
        document.getElementById('in-laptop-brand').removeAttribute('required');

        document.getElementById('in-new-cat-input').removeAttribute('required');
        document.getElementById('in-new-item-input').removeAttribute('required');

        document.getElementById('in-new-cat-container').style.display = 'none';
        document.getElementById('in-new-item-container').style.display = 'none';
        inNewSubjectContainer.style.display = 'none';
        inNewGradeContainer.style.display = 'none';
        inNewSubjectInput.removeAttribute('required');
        inNewGradeInput.removeAttribute('required');

        inItemSelect.value = '';
    }

    document.getElementById('in-existing-category').addEventListener('change', (e) => {
        const catValue = e.target.value;
        const newCatContainer = document.getElementById('in-new-cat-container');
        const newCatInput = document.getElementById('in-new-cat-input');
        const newItemContainer = document.getElementById('in-new-item-container');
        const itemSelect = document.getElementById('in-item-select');
        const itemSelectContainer = document.getElementById('in-item-select-container');

        // Reset dynamic fields
        bookFields.style.display = 'none';
        laptopFields.style.display = 'none';
        newItemContainer.style.display = 'none';
        itemSelectContainer.style.display = 'block';

        document.getElementById('in-book-subject').removeAttribute('required');
        document.getElementById('in-book-grade').removeAttribute('required');
        document.getElementById('in-laptop-brand').removeAttribute('required');
        itemSelect.setAttribute('required', '');

        const lowerCat = catValue.trim().toLowerCase();
        const isBooks = lowerCat.includes('book');
        const isElec = lowerCat.includes('electronics') || lowerCat.includes('elektronik');

        console.log('Category Changed:', catValue, 'isBooks:', isBooks); // Debugging

        if (catValue === 'NEW_CATEGORY') {
            newCatContainer.style.display = 'block';
            newCatInput.setAttribute('required', '');
            itemSelect.innerHTML = '<option value="" disabled selected>Dooro Agabka</option>' +
                '<option value="NEW_ITEM">+ New Item...</option>';
        } else if (isBooks) {
            // Immediate Subject/Grade selection for Books
            itemSelectContainer.style.display = 'none';
            document.getElementById('dynamic-book-fields-in').style.display = 'block';
            document.getElementById('dynamic-laptop-fields-in').style.display = 'none';

            itemSelect.removeAttribute('required');
            document.getElementById('in-book-subject').setAttribute('required', '');
            document.getElementById('in-book-grade').setAttribute('required', '');
        } else {
            newCatContainer.style.display = 'none';
            newCatInput.removeAttribute('required');
            document.getElementById('dynamic-book-fields-in').style.display = 'none';
            if (isElec) {
                // Keep item select visible for Electronics (Laptops)
                itemSelectContainer.style.display = 'block';
            }

            // Filter items by category (case-insensitive and trimmed)
            const filteredItems = masterItems.filter(m => (m.category || '').trim().toLowerCase() === lowerCat);
            const itemOptions = '<option value="" disabled selected>Dooro Agabka</option>' +
                [...new Set(filteredItems.map(i => i.name))].map(name => `<option value="${name}">${name}</option>`).join('') +
                (isElec ? '<option value="Laptop"> + Add New Laptop Type</option>' : '') +
                '<option value="NEW_ITEM">+ New Item...</option>';

            itemSelect.innerHTML = itemOptions;
        }
    });

    inItemSelect.addEventListener('change', (e) => {
        const selectedItemName = e.target.value;
        const newItemContainer = document.getElementById('in-new-item-container');
        const newItemInput = document.getElementById('in-new-item-input');

        bookFields.style.display = 'none';
        laptopFields.style.display = 'none';
        newItemContainer.style.display = 'none';

        document.getElementById('in-book-subject').removeAttribute('required');
        document.getElementById('in-book-grade').removeAttribute('required');
        document.getElementById('in-laptop-brand').removeAttribute('required');
        newItemInput.removeAttribute('required');

        if (selectedItemName === 'Buug') {
            bookFields.style.display = 'block';
            document.getElementById('in-book-subject').setAttribute('required', '');
            document.getElementById('in-book-grade').setAttribute('required', '');
        } else if (selectedItemName === 'Laptop') {
            laptopFields.style.display = 'block';
            document.getElementById('in-laptop-brand').setAttribute('required', '');
        } else if (selectedItemName === 'NEW_ITEM') {
            newItemContainer.style.display = 'block';
            newItemInput.setAttribute('required', '');
        }
    });

    // --- Book Subject & Grade Custom Logic ---
    const inBookSubject = document.getElementById('in-book-subject');
    const inBookGrade = document.getElementById('in-book-grade');
    const inNewSubjectContainer = document.getElementById('in-new-subject-container');
    const inNewGradeContainer = document.getElementById('in-new-grade-container');
    const inNewSubjectInput = document.getElementById('in-new-subject-input');
    const inNewGradeInput = document.getElementById('in-new-grade-input');

    inBookSubject.addEventListener('change', (e) => {
        if (e.target.value === 'NEW_SUBJECT') {
            inNewSubjectContainer.style.display = 'block';
            inNewSubjectInput.setAttribute('required', '');
        } else {
            inNewSubjectContainer.style.display = 'none';
            inNewSubjectInput.removeAttribute('required');
        }
    });

    inBookGrade.addEventListener('change', (e) => {
        if (e.target.value === 'NEW_GRADE') {
            inNewGradeContainer.style.display = 'block';
            inNewGradeInput.setAttribute('required', '');
        } else {
            inNewGradeContainer.style.display = 'none';
            inNewGradeInput.removeAttribute('required');
        }
    });

    // --- Outbound Modal Category & Stock Logic ---
    const outCatSelect = document.getElementById('out-category-select');
    const outStockDisplay = document.getElementById('out-stock-display');

    if (outCatSelect) {
        outCatSelect.addEventListener('change', (e) => {
            const cat = e.target.value;
            const filtered = masterItems.filter(m => m.category === cat);
            outItemSelect.innerHTML = '<option value="" disabled selected>Dooro Agabka</option>' +
                filtered.map(item => `<option value="${item.name}">${item.name}</option>`).join('');
            outStockDisplay.textContent = '';
        });
    }

    if (outItemSelect) {
        outItemSelect.addEventListener('change', (e) => {
            const itemName = e.target.value;
            const category = outCatSelect.value;
            if (!itemName || !category) return;

            const inventory = calculateInventory();
            const key = `${itemName}|${category}`;
            const qty = inventory[key] || 0;
            outStockDisplay.textContent = `Kaydka hadda yaala: ${qty}`;

            // Suggest Max limit
            const outQtyInput = document.getElementById('out-qty');
            if (outQtyInput) {
                outQtyInput.placeholder = `Max: ${qty}`;
            }
        });
    }


    document.getElementById('form-in').addEventListener('submit', (e) => {
        e.preventDefault();
        let item = '';
        let category = document.getElementById('in-existing-category').value;
        const itemNameSelect = inItemSelect.value;

        const qty = document.getElementById('in-qty').value;
        const source = document.getElementById('in-source').value;
        const comment = document.getElementById('in-comment').value.trim();

        // 1. Determine Category
        if (category === 'NEW_CATEGORY') {
            category = document.getElementById('in-new-cat-input').value.trim();
        }

        // 2. Determine Item Name
        const lowerCat = category.trim().toLowerCase();
        const isBooks = lowerCat.includes('book');
        const isElec = lowerCat.includes('electronics') || lowerCat.includes('elektronik');

        if (isBooks) {
            let subject = document.getElementById('in-book-subject').value;
            let grade = document.getElementById('in-book-grade').value;

            if (subject === 'NEW_SUBJECT') {
                subject = document.getElementById('in-new-subject-input').value.trim();
            }
            if (grade === 'NEW_GRADE') {
                grade = document.getElementById('in-new-grade-input').value.trim();
            }

            if (subject && grade) {
                item = `${subject} ${grade}`;
            }
        } else if (isElec && itemNameSelect === 'Laptop') {
            const brand = document.getElementById('in-laptop-brand').value;
            item = `${brand} Laptop`;
        } else if (itemNameSelect === 'NEW_ITEM') {
            item = document.getElementById('in-new-item-input').value.trim();
        } else {
            item = itemNameSelect;
        }

        if (!item || !category) {
            showToast('Fadlan buuxi dhammaan meelaha loo baahanyahay! (Missing: ' + (!item ? 'Item' : 'Category') + ')', 'error');
            return;
        }

        // 3. Save to Master Items if new
        const existingItem = masterItems.find(m => m.name === item && m.category === category);
        if (!existingItem) {
            apiFetch('/items', {
                method: 'POST',
                body: JSON.stringify({ name: item, category: category })
            }).then(newItem => {
                if (newItem) {
                    masterItems.push(newItem);
                    populateItemDropdowns();
                    processTransaction();
                }
            }).catch(err => console.error('Item save error:', err));
        } else {
            processTransaction();
        }

        function processTransaction() {
            // 4. Record Transaction
            if (currentUser.role === 'storekeeper') {
                window.requestTransaction(item, qty, 'in', source, comment, category);
            } else {
                window.addTransaction(item, qty, 'in', source, comment, category);
            }

            closeModal('modal-in');
            e.target.reset();
            resetInboundModal();
        }
    });

    document.getElementById('form-out').addEventListener('submit', (e) => {
        e.preventDefault();
        const item = document.getElementById('out-item-select').value;
        const category = document.getElementById('out-category-select').value;
        const qty = parseInt(document.getElementById('out-qty').value);
        const target = document.getElementById('out-target').value;

        // Validation: Check if stock is sufficient
        const inventory = calculateInventory();
        const key = `${item}|${category}`;
        const availableStock = inventory[key] || 0;

        if (qty > availableStock) {
            showToast(`Ma jirto tiradaas aad rabto! Waxaa yaala kaliya: ${availableStock}`, 'error');
            return;
        }

        if (currentUser.role === 'storekeeper') {
            window.requestTransaction(item, qty, 'out', target, '', category);
        } else {
            window.addTransaction(item, qty, 'out', target, '', category);
        }
        closeModal('modal-out');
        e.target.reset();
        if (outStockDisplay) outStockDisplay.textContent = '';
    });



    function renderUsers() {
        const userList = document.getElementById('user-list');
        if (!userList) return;

        userList.innerHTML = masterUsers.map((user, index) => `
            <tr>
                <td>${user.name}</td>
                <td>${user.role.charAt(0).toUpperCase() + user.role.slice(1)}</td>
                <td><span class="${user.status === 'Active' ? 'status-in' : 'status-out'}">${user.status}</span></td>
                <td>
                    ${(currentUser.role.toLowerCase() === 'wasiir') ?
                `<button class="btn-icon" onclick="openUserEditModal(${index})" title="Edit" style="margin-right: 8px;"><i class="fa-solid fa-pen"></i></button>` +
                `<button class="btn-icon" onclick="deleteUser(${index})" title="Delete" style="color: #ef4444;"><i class="fa-solid fa-trash"></i></button>`
                : '<i class="fa-solid fa-lock" title="No Permission"></i>'}
                </td>
            </tr>
        `).join('');
    }

    window.deleteUser = async (index) => {
        const user = masterUsers[index];

        // Prevent self-deletion
        if (user.username === currentUser.username) {
            showToast("Ma tirtiri kartid account-kaaga adigu leedahay!", "error");
            return;
        }

        if (confirm(`Ma hubtaa inaad rabto inaad tirtirto user-ka: ${user.name}?`)) {
            try {
                const response = await apiFetch(`/users/${user.id}`, {
                    method: 'DELETE'
                });

                if (response && response.status === 'success') {
                    masterUsers.splice(index, 1);
                    showToast("User-ka waa la tirtiray.", "success");
                    renderUsers();
                } else {
                    showToast("Cillad ayaa dhacday markii user-ka la tirtirayay.", "error");
                }
            } catch (err) {
                console.error('Delete user error:', err);
                showToast("Cillad ayaa dhacday markii user-ka la tirtirayay.", "error");
            }
        }
    };

    window.resetUserForm = () => {
        document.getElementById('edit-user-index').value = '';
        document.getElementById('edit-user-name').value = '';
        document.getElementById('edit-user-username').value = '';
        document.getElementById('edit-user-password').value = '';
        document.getElementById('edit-user-role').value = 'storekeeper';
        document.getElementById('edit-user-status').value = 'Active';
        document.querySelector('#modal-user-edit h2').textContent = 'Kudar User Cusub';
        document.querySelector('#form-user-edit button[type="submit"]').textContent = 'Add User';

        // Hide delete button when adding new
        const deleteBtn = document.getElementById('btn-delete-user');
        if (deleteBtn) deleteBtn.classList.add('hidden');
    };

    window.handleDeleteMyAccount = () => {
        const myIndex = masterUsers.findIndex(u => u.username === currentUser.username);
        if (myIndex !== -1) {
            if (confirm("Ma hubtaa inaad rabto inaad tirtirto account-kaaga? Tallaabadan dib looma soo celin karo!")) {
                masterUsers.splice(myIndex, 1);
                showToast("Account-kaagii waa la tirtiray.", "success");
                setTimeout(() => window.logout(), 1500); // Logout after deletion
            }
        }
    };

    window.handleDeleteSelectedUser = async () => {
        const index = document.getElementById('edit-user-index').value;
        if (index !== '') {
            await deleteUser(index);
            closeModal('modal-user-edit');
        }
    };

    window.openUserEditModal = (index) => {
        const user = masterUsers[index];
        document.getElementById('edit-user-index').value = index;
        document.getElementById('edit-user-name').value = user.name;
        document.getElementById('edit-user-username').value = user.username;
        document.getElementById('edit-user-password').value = ''; // Don't show password
        document.getElementById('edit-user-role').value = user.role;
        document.getElementById('edit-user-status').value = user.status;
        document.querySelector('#modal-user-edit h2').textContent = 'Bedel Xogta User-ka';
        document.querySelector('#form-user-edit button[type="submit"]').textContent = 'Update User';

        // Show delete button for existing users (if not self)
        const deleteBtn = document.getElementById('btn-delete-user');
        if (deleteBtn) {
            if (user.username === currentUser.username) {
                deleteBtn.classList.add('hidden');
            } else {
                deleteBtn.classList.remove('hidden');
            }
        }

        openModal('modal-user-edit');
    };

    document.getElementById('form-user-edit').addEventListener('submit', async (e) => {
        e.preventDefault();
        const indexInput = document.getElementById('edit-user-index').value;
        const name = document.getElementById('edit-user-name').value;
        const username = document.getElementById('edit-user-username').value;
        const password = document.getElementById('edit-user-password').value;
        const role = document.getElementById('edit-user-role').value;
        const status = document.getElementById('edit-user-status').value;

        try {
            if (indexInput !== '') {
                // Update existing
                const index = parseInt(indexInput);
                const userId = masterUsers[index].id;
                const updatedUser = await apiFetch(`/users/${userId}`, {
                    method: 'PATCH',
                    body: JSON.stringify({ name, role, status, password, username })
                });

                if (updatedUser) {
                    masterUsers[index] = updatedUser;
                    showToast('Xogta user-ka waa la cusboonaysiiyay!', 'success');
                } else {
                    showToast('Cillad ayaa dhacday markii la cusboonaysiinayay user-ka.', 'error');
                }
            } else {
                // Add new
                if (!password) {
                    showToast('Fadlan gali password-ka user-ka cusub!', 'error');
                    return;
                }
                const newUser = await apiFetch('/users', {
                    method: 'POST',
                    body: JSON.stringify({ username, password, name, role, status })
                });

                if (newUser) {
                    masterUsers.push(newUser);
                    showToast('User cusub ayaa lagu daray! (v2.1)', 'success');
                } else {
                    showToast('Cillad ayaa dhacday markii xogta la keydinayay. (Err: API)', 'error');
                }
            }
            closeModal('modal-user-edit');
            try {
                renderUsers();
            } catch (err) {
                console.error('Render error:', err);
                showToast('Dhib ayaa dhacay markii la cusboonaysiinayay liiska. (v2.1)', 'error');
            }
        } catch (err) {
            console.error('User save error:', err);
        }
    });

    // --- Export & Preview Logic ---
    window.getFilteredReportData = () => {
        const type = document.getElementById('report-type').value;
        const startDateStr = document.getElementById('report-start-date').value;
        const endDateStr = document.getElementById('report-end-date').value;
        const userFilter = document.getElementById('report-user-filter').value;

        // Date Parsing Helper
        const parseDateString = (dStr) => {
            if (!dStr) return null;
            if (dStr.includes('-')) { // yyyy-mm-dd (from input)
                return new Date(dStr);
            } else if (dStr.includes('/')) { // dd/mm/yyyy (from storage)
                const [d, m, y] = dStr.split('/');
                return new Date(`${y}-${m}-${d}`);
            }
            return null;
        };

        const startDate = parseDateString(startDateStr);
        const endDate = parseDateString(endDateStr);

        let data = [];
        let headers = [];
        let title = "";
        let dateRangeTitle = "";

        if (startDate && endDate) {
            dateRangeTitle = `Range: ${startDate.toLocaleDateString('Somali')} - ${endDate.toLocaleDateString('Somali')}`;
        } else if (startDate) {
            dateRangeTitle = `Laga bilaabo: ${startDate.toLocaleDateString('Somali')}`;
        } else if (endDate) {
            dateRangeTitle = `Ku eg: ${endDate.toLocaleDateString('Somali')}`;
        }

        if (type === 'inventory') {
            const tempActivities = activities.filter(act => {
                const actDate = parseDateString(act.date);
                if (userFilter !== 'ALL' && act.user !== userFilter) return false;
                if (!actDate) return true;
                if (startDate && actDate < startDate) return false;
                if (endDate && actDate > endDate) return false;
                return true;
            });

            const inventory = {};
            masterItems.forEach(item => {
                const key = `${item.name}|${item.category}`;
                inventory[key] = 0;
            });

            tempActivities.filter(a => !a.status || a.status === 'Approved').forEach(act => {
                const parts = act.action.split(': ');
                if (parts.length < 2) return;
                const type = parts[0];
                const detail = parts[1].split(' ');
                const qtyStr = detail[0];
                const qty = parseInt(qtyStr);
                const itemName = detail.slice(1).join(' ');
                const category = act.itemCategory || (masterItems.find(m => m.name === itemName)?.category) || 'General';
                const key = `${itemName}|${category}`;
                if (!isNaN(qty)) {
                    if (type === 'Geliyay') inventory[key] = (inventory[key] || 0) + qty;
                    else inventory[key] = (inventory[key] || 0) - qty;
                }
            });

            title = "Inventory Summary Report";
            headers = ["Item Name", "Category", "Quantity"];
            data = Object.entries(inventory).map(([key, qty]) => {
                const [name, cat] = key.split('|');
                return [name, cat, qty];
            }).filter(item => item[2] !== 0);

        } else if (type === 'movement') {
            title = "Warbixinta Dhaqdhaqaaqa Hantida";
            headers = ["Date", "Activity", "Recipient/Source", "User", "Status"];
            data = activities.filter(act => {
                const actDate = parseDateString(act.date);
                if (userFilter !== 'ALL' && act.user !== userFilter) return false;
                if (!actDate) return true;
                if (startDate && actDate < startDate) return false;
                if (endDate && actDate > endDate) return false;
                return true;
            }).map(act => [act.date, act.action, act.recipient, act.user, act.status || 'Approved']);

        } else if (type === 'users') {
            title = "User Management Report";
            headers = ["Name", "Role", "Status"];
            data = masterUsers.map(user => [user.name, user.role, user.status]);
        }

        return { title, headers, data, dateRangeTitle };
    };

    window.handlePreview = () => {
        const { title, headers, data, dateRangeTitle } = getFilteredReportData();
        const previewCard = document.getElementById('preview-card');
        const previewContainer = document.getElementById('report-preview-container');

        if (data.length === 0) {
            previewContainer.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 20px;">Xog lama helin muddadaas aad dooratay.</p>';
            previewCard.style.display = 'block';
            return;
        }

        let tableHtml = `<table class="activity-table"><thead><tr>`;
        headers.forEach(h => tableHtml += `<th>${h}</th>`);
        tableHtml += `</tr></thead><tbody>`;

        data.forEach(row => {
            tableHtml += `<tr>`;
            row.forEach(cell => tableHtml += `<td>${cell}</td>`);
            tableHtml += `</tr>`;
        });

        tableHtml += `</tbody></table>`;
        previewContainer.innerHTML = tableHtml;

        // Show card after content is ready
        previewCard.style.display = 'block';
        previewCard.scrollIntoView({ behavior: 'smooth' });
    };

    window.handleExport = () => {
        const format = document.getElementById('report-format').value;
        const { title, headers, data, dateRangeTitle } = getFilteredReportData();

        if (data.length === 0) {
            showToast("Ma jirto xog la soo saaro!", "error");
            return;
        }

        if (format === 'pdf') {
            exportToPDF(title, headers, data, dateRangeTitle);
        } else {
            exportToExcel(title, headers, data, dateRangeTitle);
        }
    };



    function exportToPDF(title, headers, data, dateRangeTitle = "") {
        if (!window.jspdf) {
            showToast("PDF library is not loaded. Please check your internet connection.", "error");
            return;
        }
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        doc.setFont(undefined, 'bold');
        doc.setFontSize(18);
        doc.text(title, 14, 22);

        doc.setFont(undefined, 'normal');
        doc.setFontSize(11);
        doc.setTextColor(100);
        if (dateRangeTitle) {
            doc.text(dateRangeTitle, 14, 30);
            doc.text(`La soo saaray: ${new Date().toLocaleString()}`, 14, 37);
        } else {
            doc.text(`La soo saaray: ${new Date().toLocaleString()}`, 14, 30);
        }

        doc.autoTable({
            head: [headers],
            body: data,
            startY: dateRangeTitle ? 45 : 40,
            theme: 'grid',
            headStyles: { fillColor: [44, 62, 80], textColor: [255, 255, 255] }
        });

        doc.save(`${title.replace(/\s+/g, '_')}.pdf`);
    }

    function exportToExcel(title, headers, data, dateRangeTitle = "") {
        if (!window.XLSX) {
            showToast("Excel library is not loaded. Please check your internet connection.", "error");
            return;
        }
        const worksheetData = [[title], [dateRangeTitle], [], headers, ...data];
        const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Report");
        XLSX.writeFile(workbook, `${title.replace(/\s+/g, '_')}.xlsx`);
    }

    // Initialize
    loadInitialData();

    // --- Toast Notification System ---
    window.showToast = function (message, type = 'info') {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;

        let icon = 'fa-info-circle';
        if (type === 'success') icon = 'fa-check-circle';
        if (type === 'error') icon = 'fa-exclamation-circle';

        toast.innerHTML = `
            <i class="fa-solid ${icon}"></i>
            <span>${message}</span>
        `;

        container.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('fade-out');
            setTimeout(() => {
                toast.remove();
            }, 300);
        }, 5000);
    };
});
