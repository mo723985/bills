/**
 * Professional Subscription Management System
 * Vanilla JS - LocalStorage - Offline Only
 */

// --- Data Structure Initialization ---
let db = {
    password: '123456',
    groups: [],
    packages: [],
    customers: [],
    payments: [],
    reminders: {} // { custId-month: count }
};

// --- Storage Utilities ---
const loadDB = () => {
    const data = localStorage.getItem('sub_manager_db');
    if (data) db = JSON.parse(data);
};

const saveDB = () => {
    localStorage.setItem('sub_manager_db', JSON.stringify(db));
};

// --- View Controller ---
const showScreen = (screenId) => {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
};

const showSection = (sectionId) => {
    document.querySelectorAll('.content-sec').forEach(s => s.classList.remove('active'));
    document.getElementById(sectionId).classList.add('active');
    document.querySelectorAll('#main-nav button').forEach(b => {
        b.classList.toggle('active', b.dataset.target === sectionId);
    });
    renderSection(sectionId);
};

// --- Modals Controller ---
const showModal = (id) => {
    document.getElementById(id).style.display = 'flex';
    if(id === 'customer-modal') updateCustomerDropdowns();
};
const closeModal = (id) => {
    document.getElementById(id).style.display = 'none';
    document.getElementById(id).querySelector('form')?.reset();
    document.getElementById(id).querySelector('input[type="hidden"]').value = '';
    if(id === 'customer-modal') document.getElementById('special-fields').classList.add('hidden');
};

// --- Auth System ---
document.getElementById('login-btn').addEventListener('click', () => {
    const pass = document.getElementById('login-password').value;
    if (pass === db.password) {
        showScreen('main-app');
        showSection('dashboard');
    } else {
        alert('كلمة المرور خاطئة!');
    }
});

document.getElementById('logout-btn').addEventListener('click', () => {
    document.getElementById('login-password').value = '';
    showScreen('login-screen');
});

// --- Logic & CRUD ---

// Groups
const handleGroupSubmit = (e) => {
    e.preventDefault();
    const id = document.getElementById('group-id').value;
    const groupData = {
        id: id || Date.now().toString(),
        groupName: document.getElementById('groupName').value,
        ownerName: document.getElementById('ownerName').value,
        ownerPhone: document.getElementById('ownerPhone').value,
        carrierName: document.getElementById('carrierName').value,
        carrierPhone: document.getElementById('carrierPhone').value,
        groupLimit: parseInt(document.getElementById('groupLimit').value)
    };

    if (id) {
        const idx = db.groups.findIndex(g => g.id === id);
        db.groups[idx] = groupData;
    } else {
        db.groups.push(groupData);
    }
    saveDB();
    closeModal('group-modal');
    renderSection('groups-sec');
};

// Packages
const handlePackageSubmit = (e) => {
    e.preventDefault();
    const id = document.getElementById('package-id').value;
    const pkgData = {
        id: id || Date.now().toString(),
        packageName: document.getElementById('packageName').value,
        packagePrice: parseFloat(document.getElementById('packagePrice').value),
        packageDesc: document.getElementById('packageDesc').value
    };

    if (id) {
        const idx = db.packages.findIndex(p => p.id === id);
        db.packages[idx] = pkgData;
    } else {
        db.packages.push(pkgData);
    }
    saveDB();
    closeModal('package-modal');
    renderSection('packages-sec');
};

// Customers
const handleCustomerSubmit = (e) => {
    e.preventDefault();
    const id = document.getElementById('customer-id').value;
    const isSpecial = document.getElementById('isSpecial').checked;
    
    const custData = {
        id: id || Date.now().toString(),
        name: document.getElementById('custName').value,
        phone: document.getElementById('custPhone').value,
        groupId: document.getElementById('custGroup').value,
        packageId: document.getElementById('custPackage').value,
        status: document.getElementById('custStatus').value,
        isSpecial: isSpecial,
        specialType: isSpecial ? document.getElementById('specialType').value : null,
        specialValue: isSpecial ? parseFloat(document.getElementById('specialValue').value || 0) : 0,
        specialNote: isSpecial ? document.getElementById('specialNote').value : '',
        createdAt: id ? (db.customers.find(c => c.id === id).createdAt) : new Date().toISOString()
    };

    // Check Group Limit (only if not "Extra" and active)
    if (custData.status === 'active' && custData.specialType !== 'extra') {
        const group = db.groups.find(g => g.id === custData.groupId);
        const groupCount = db.customers.filter(c => c.groupId === custData.groupId && c.status === 'active' && c.specialType !== 'extra' && c.id !== id).length;
        if (groupCount >= group.groupLimit) {
            if(!confirm('تجاوزت هذه المجموعة الحد الأقصى. هل تريد الاستمرار؟')) return;
        }
    }

    if (id) {
        const idx = db.customers.findIndex(c => c.id === id);
        db.customers[idx] = custData;
    } else {
        db.customers.push(custData);
    }
    saveDB();
    closeModal('customer-modal');
    renderSection('customers-sec');
};

// Payment Logic
const calculatePrice = (customer) => {
    const pkg = db.packages.find(p => p.id === customer.packageId);
    if (!pkg) return 0;
    
    if (!customer.isSpecial) return pkg.packagePrice;
    
    if (customer.specialType === 'discount') return Math.max(0, pkg.packagePrice - customer.specialValue);
    if (customer.specialType === 'customPrice') return customer.specialValue;
    return pkg.packagePrice; // Extra just counts as normal price usually
};

const generateMonthlyPayments = () => {
    const month = document.getElementById('payment-month-picker').value;
    if (!month) return alert('اختر الشهر أولاً');
    
    const activeCustomers = db.customers.filter(c => c.status === 'active');
    let addedCount = 0;

    activeCustomers.forEach(cust => {
        const exists = db.payments.some(p => p.customerId === cust.id && p.month === month);
        if (!exists) {
            db.payments.push({
                id: Date.now().toString() + Math.random(),
                customerId: cust.id,
                month: month,
                amount: calculatePrice(cust),
                status: 'unpaid',
                date: ''
            });
            addedCount++;
        }
    });

    saveDB();
    renderSection('payments-sec');
    alert(`تم إنشاء ${addedCount} سجلات جديدة`);
};

// --- Rendering Logic ---
const renderSection = (sectionId) => {
    if (sectionId === 'dashboard') {
        const active = db.customers.filter(c => c.status === 'active').length;
        const total = db.customers.length;
        const specials = db.customers.filter(c => c.isSpecial).length;
        const currentMonth = new Date().toISOString().slice(0, 7);
        const monthlyCollected = db.payments
            .filter(p => p.month === currentMonth && p.status === 'paid')
            .reduce((sum, p) => sum + p.amount, 0);

        document.getElementById('stats-container').innerHTML = `
            <div class="stat-card"><h4>إجمالي العملاء</h4><p>${total}</p></div>
            <div class="stat-card"><h4>النشطين</h4><p>${active}</p></div>
            <div class="stat-card"><h4>استثنائيين</h4><p>${specials}</p></div>
            <div class="stat-card"><h4>تحصيل ${currentMonth}</h4><p>${monthlyCollected} ج.م</p></div>
        `;
        
        let groupHTML = '<ul>';
        db.groups.forEach(g => {
            const count = db.customers.filter(c => c.groupId === g.id && c.status === 'active' && c.specialType !== 'extra').length;
            groupHTML += `<li>${g.groupName}: ${count} / ${g.groupLimit}</li>`;
        });
        document.getElementById('group-summary-list').innerHTML = groupHTML + '</ul>';
    }

    if (sectionId === 'groups-sec') {
        const tbody = document.querySelector('#groups-table tbody');
        tbody.innerHTML = db.groups.map(g => {
            const count = db.customers.filter(c => c.groupId === g.id && c.status === 'active' && c.specialType !== 'extra').length;
            return `
            <tr>
                <td>${g.groupName}</td>
                <td>${g.ownerName}</td>
                <td>${g.ownerPhone}</td>
                <td>${g.carrierName}</td>
                <td>${count} / ${g.groupLimit}</td>
                <td>
                    <button class="btn-action" onclick="editGroup('${g.id}')">تعديل</button>
                    <button class="btn-action btn-delete" onclick="deleteGroup('${g.id}')">حذف</button>
                </td>
            </tr>`;
        }).join('');
    }

    if (sectionId === 'packages-sec') {
        const tbody = document.querySelector('#packages-table tbody');
        tbody.innerHTML = db.packages.map(p => `
            <tr>
                <td>${p.packageName}</td>
                <td>${p.packagePrice} ج.م</td>
                <td>${p.packageDesc}</td>
                <td>
                    <button class="btn-action" onclick="editPackage('${p.id}')">تعديل</button>
                    <button class="btn-action btn-delete" onclick="deletePackage('${p.id}')">حذف</button>
                </td>
            </tr>`).join('');
    }

    if (sectionId === 'customers-sec') {
        const searchTerm = document.getElementById('customer-search').value.toLowerCase();
        const groupFilter = document.getElementById('filter-group-select').value;
        
        const tbody = document.querySelector('#customers-table tbody');
        const filtered = db.customers.filter(c => {
            const matchSearch = c.name.toLowerCase().includes(searchTerm) || c.phone.includes(searchTerm);
            const matchGroup = groupFilter === '' || c.groupId === groupFilter;
            return matchSearch && matchGroup;
        });

        tbody.innerHTML = filtered.map(c => {
            const group = db.groups.find(g => g.id === c.groupId)?.groupName || '---';
            const pkg = db.packages.find(p => p.id === c.packageId)?.packageName || '---';
            let typeBadge = '';
            if (c.specialType === 'extra') typeBadge = '<span class="badge badge-extra">إضافي Extra</span>';
            else if (c.isSpecial) typeBadge = '<span class="badge badge-special">استثنائي</span>';

            return `
            <tr class="${c.specialType === 'extra' ? 'row-extra' : ''}">
                <td>${c.name}</td>
                <td>${c.phone}</td>
                <td>${group}</td>
                <td>${pkg}</td>
                <td><span class="badge badge-${c.status}">${c.status === 'active' ? 'نشط' : 'موقوف'}</span></td>
                <td>${typeBadge}</td>
                <td>
                    <button class="btn-action" onclick="editCustomer('${c.id}')">تعديل</button>
                    <button class="btn-action btn-delete" onclick="deleteCustomer('${c.id}')">حذف</button>
                </td>
            </tr>`;
        }).join('');
    }

    if (sectionId === 'payments-sec') {
        const month = document.getElementById('payment-month-picker').value;
        const tbody = document.querySelector('#payments-table tbody');
        const payments = db.payments.filter(p => p.month === month);
        
        const total = payments.reduce((s, p) => s + p.amount, 0);
        const collected = payments.filter(p => p.status === 'paid').reduce((s, p) => s + p.amount, 0);
        
        document.getElementById('payment-summary').innerHTML = `إجمالي المطلوب لشهر ${month}: <b>${total} ج.م</b> | تم تحصيل: <b>${collected} ج.م</b>`;
        
        tbody.innerHTML = payments.map(p => {
            const cust = db.customers.find(c => c.id === p.customerId);
            const group = db.groups.find(g => g.id === cust?.groupId)?.groupName || '---';
            return `
            <tr>
                <td>${cust?.name || 'محذوف'}</td>
                <td>${group}</td>
                <td>${p.amount} ج.م</td>
                <td><span class="badge badge-${p.status === 'paid' ? 'active' : 'suspended'}">${p.status === 'paid' ? 'تم الدفع' : 'لم يدفع'}</span></td>
                <td>${p.date || '---'}</td>
                <td>
                    ${p.status === 'unpaid' ? `<button class="btn-action btn-pay" onclick="markPaid('${p.id}')">تحصيل</button>` : `<button class="btn-action btn-delete" onclick="markUnpaid('${p.id}')">إلغاء التحصيل</button>`}
                </td>
            </tr>`;
        }).join('');
    }

    if (sectionId === 'late-sec') {
        const tbody = document.querySelector('#late-table tbody');
        const late = db.payments.filter(p => p.status === 'unpaid');
        
        tbody.innerHTML = late.map(p => {
            const cust = db.customers.find(c => c.id === p.customerId);
            const remKey = `${p.customerId}-${p.month}`;
            const remInfo = db.reminders[remKey] || { count: 0, date: 'لم يتم' };
            
            return `
            <tr>
                <td>${cust?.name}</td>
                <td>${cust?.phone}</td>
                <td>${p.month}</td>
                <td>${p.amount} ج.م</td>
                <td>${remInfo.date}</td>
                <td>${remInfo.count}</td>
                <td>
                    <button class="btn-action" onclick="sendReminder('${p.customerId}', '${p.month}', '${cust?.phone}', ${p.amount})">WhatsApp</button>
                </td>
            </tr>`;
        }).join('');
    }
};

// --- Actions Helpers ---
window.editGroup = (id) => {
    const g = db.groups.find(x => x.id === id);
    document.getElementById('group-id').value = g.id;
    document.getElementById('groupName').value = g.groupName;
    document.getElementById('ownerName').value = g.ownerName;
    document.getElementById('ownerPhone').value = g.ownerPhone;
    document.getElementById('carrierName').value = g.carrierName;
    document.getElementById('carrierPhone').value = g.carrierPhone;
    document.getElementById('groupLimit').value = g.groupLimit;
    showModal('group-modal');
};

window.deleteGroup = (id) => {
    if(confirm('سيتم حذف المجموعة، لن يتم حذف العملاء المرتبطين بها. استمرار؟')) {
        db.groups = db.groups.filter(x => x.id !== id);
        saveDB();
        renderSection('groups-sec');
    }
};

window.editPackage = (id) => {
    const p = db.packages.find(x => x.id === id);
    document.getElementById('package-id').value = p.id;
    document.getElementById('packageName').value = p.packageName;
    document.getElementById('packagePrice').value = p.packagePrice;
    document.getElementById('packageDesc').value = p.packageDesc;
    showModal('package-modal');
};

window.deletePackage = (id) => {
    if(confirm('حذف الباقة؟')) {
        db.packages = db.packages.filter(x => x.id !== id);
        saveDB();
        renderSection('packages-sec');
    }
};

window.editCustomer = (id) => {
    const c = db.customers.find(x => x.id === id);
    updateCustomerDropdowns();
    document.getElementById('customer-id').value = c.id;
    document.getElementById('custName').value = c.name;
    document.getElementById('custPhone').value = c.phone;
    document.getElementById('custGroup').value = c.groupId;
    document.getElementById('custPackage').value = c.packageId;
    document.getElementById('custStatus').value = c.status;
    document.getElementById('isSpecial').checked = c.isSpecial;
    if (c.isSpecial) {
        document.getElementById('special-fields').classList.remove('hidden');
        document.getElementById('specialType').value = c.specialType;
        document.getElementById('specialValue').value = c.specialValue;
        document.getElementById('specialNote').value = c.specialNote;
    }
    showModal('customer-modal');
};

window.deleteCustomer = (id) => {
    if(confirm('حذف العميل وسجلاته المالية نهائيًا؟')) {
        db.customers = db.customers.filter(x => x.id !== id);
        db.payments = db.payments.filter(p => p.customerId !== id);
        saveDB();
        renderSection('customers-sec');
    }
};

window.markPaid = (pid) => {
    if(!confirm('تأكيد التحصيل؟')) return;
    const pay = db.payments.find(p => p.id === pid);
    pay.status = 'paid';
    pay.date = new Date().toLocaleDateString('en-GB');
    saveDB();
    renderSection('payments-sec');
};

window.markUnpaid = (pid) => {
    if(!confirm('إلغاء التحصيل؟')) return;
    const pay = db.payments.find(p => p.id === pid);
    pay.status = 'unpaid';
    pay.date = '';
    saveDB();
    renderSection('payments-sec');
};

window.sendReminder = (custId, month, phone, amount) => {
    const msg = encodeURIComponent(`عزيزي العميل، يرجى سداد اشتراك شهر ${month} وقيمته ${amount} ج.م.`);
    window.open(`https://wa.me/2${phone}?text=${msg}`, '_blank');
    
    const key = `${custId}-${month}`;
    if(!db.reminders[key]) db.reminders[key] = { count: 0, date: '' };
    db.reminders[key].count++;
    db.reminders[key].date = new Date().toLocaleDateString('en-GB');
    saveDB();
    renderSection('late-sec');
};

const updateCustomerDropdowns = () => {
    const gSelect = document.getElementById('custGroup');
    const pSelect = document.getElementById('custPackage');
    const fSelect = document.getElementById('filter-group-select');

    const gOptions = db.groups.map(g => `<option value="${g.id}">${g.groupName}</option>`).join('');
    gSelect.innerHTML = gOptions;
    fSelect.innerHTML = '<option value="">كل المجموعات</option>' + gOptions;
    pSelect.innerHTML = db.packages.map(p => `<option value="${p.id}">${p.packageName} (${p.packagePrice} ج.م)</option>`).join('');
};

// --- Event Listeners Setup ---
document.addEventListener('DOMContentLoaded', () => {
    loadDB();
    
    // Navigation
    document.getElementById('main-nav').addEventListener('click', (e) => {
        if (e.target.dataset.target) showSection(e.target.dataset.target);
    });

    // Form Submits
    document.getElementById('group-form').addEventListener('submit', handleGroupSubmit);
    document.getElementById('package-form').addEventListener('submit', handlePackageSubmit);
    document.getElementById('customer-form').addEventListener('submit', handleCustomerSubmit);
    
    // UI Interactions
    document.getElementById('isSpecial').addEventListener('change', (e) => {
        document.getElementById('special-fields').classList.toggle('hidden', !e.target.checked);
    });

    document.getElementById('customer-search').addEventListener('input', () => renderSection('customers-sec'));
    document.getElementById('filter-group-select').addEventListener('change', () => renderSection('customers-sec'));
    
    document.getElementById('generate-payments-btn').addEventListener('click', generateMonthlyPayments);
    document.getElementById('payment-month-picker').value = new Date().toISOString().slice(0, 7);

    // Settings
    document.getElementById('update-pass-btn').addEventListener('click', () => {
        const newPass = document.getElementById('new-password').value;
        if(newPass.length < 4) return alert('كلمة المرور ضعيفة');
        db.password = newPass;
        saveDB();
        alert('تم التغيير بنجاح');
    });

    document.getElementById('export-btn').addEventListener('click', () => {
        const blob = new Blob([JSON.stringify(db)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `backup_${new Date().toISOString().slice(0,10)}.json`;
        a.click();
    });

    document.getElementById('import-btn').addEventListener('change', (e) => {
        if(!confirm('هل أنت متأكد؟ سيتم حذف جميع البيانات الحالية.')) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const imported = JSON.parse(event.target.result);
                db = imported;
                saveDB();
                location.reload();
            } catch(e) { alert('ملف غير صالح'); }
        };
        reader.readAsText(e.target.files[0]);
    });
});