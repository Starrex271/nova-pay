// ================================================
// NOVAPAY — Full Application Logic
// ================================================

// ======= STATE =======
let currentUser = null;
let users = JSON.parse(localStorage.getItem('novapay_users') || '{}');
let transactions = [];
let withdrawals = [];
let savedBanks = [];
let balance = 0;

// ======= DATE =======
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
function setDate() {
    const now = new Date();
    const el = document.getElementById('top-date');
    if (el) el.textContent = DAYS[now.getDay()] + ', ' + MONTHS[now.getMonth()] + ' ' + now.getDate() + ', ' + now.getFullYear();
}
setDate();

// ======= UTILS =======
function fmt(n) { return '$' + parseFloat(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function genAccountNumber() { return 'NP' + Math.floor(1000000000 + Math.random() * 9000000000); }
function genCardNumber() {
    const parts = [4521, Math.floor(1000 + Math.random() * 9000), Math.floor(1000 + Math.random() * 9000), Math.floor(1000 + Math.random() * 9000)];
    return parts.join('  ');
}
function getInitials(name) { return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2); }
function getGreeting() {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
}
function showError(id, msg) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = msg;
    el.style.display = 'block';
}
function hideError(id) {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
}
function saveUsers() { localStorage.setItem('novapay_users', JSON.stringify(users)); }
function saveUserData() {
    if (!currentUser) return;
    users[currentUser.email].transactions = transactions;
    users[currentUser.email].withdrawals = withdrawals;
    users[currentUser.email].savedBanks = savedBanks;
    users[currentUser.email].balance = balance;
    saveUsers();
}

// ======= TOAST =======
let toastTimer;
function showToast(title, msg, icon = '✓') {
    document.getElementById('toast-icon').textContent = icon;
    document.getElementById('toast-title').textContent = title;
    document.getElementById('toast-msg').textContent = msg;
    const t = document.getElementById('toast');
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 3500);
}

// ======= AUTH TABS =======
function switchAuth(mode) {
    const isLogin = mode === 'login';
    document.getElementById('login-form').style.display = isLogin ? 'block' : 'none';
    document.getElementById('register-form').style.display = isLogin ? 'none' : 'block';
    document.getElementById('tab-login').classList.toggle('active', isLogin);
    document.getElementById('tab-register').classList.toggle('active', !isLogin);
    if (!isLogin) regGoStep(1);
}

// ======= LOGIN =======
function doLogin() {
    hideError('login-error');
    const email = document.getElementById('login-email').value.trim();
    const pass = document.getElementById('login-pass').value;
    if (!email || !pass) { showError('login-error', 'Please fill in all fields.'); return; }
    const user = users[email];
    if (!user) { showError('login-error', 'No account found with this email.'); return; }
    if (user.password !== btoa(pass)) { showError('login-error', 'Incorrect password.'); return; }

    const btn = document.getElementById('login-btn');
    btn.textContent = 'Signing in...'; btn.style.opacity = '0.7';

    setTimeout(() => {
        btn.textContent = 'Sign In →'; btn.style.opacity = '1';
        currentUser = user;
        transactions = user.transactions || [];
        withdrawals = user.withdrawals || [];
        savedBanks = user.savedBanks || [];
        balance = user.balance || 0;
        loadDashboard();
        document.getElementById('login-page').classList.remove('active');
        document.getElementById('dashboard-page').classList.add('active');
        showSection('dashboard', null);
        animateDashboard();
        showToast('Welcome back, ' + user.firstName + '!', 'You\'re now signed in.', '👋');
    }, 900);
}

// ======= REGISTER STEPS =======
let regCurrentStep = 1;
function regGoStep(n) {
    [1, 2, 3].forEach(i => {
        document.getElementById('reg-step' + i).style.display = i === n ? 'block' : 'none';
        const s = document.getElementById('rstep-' + i);
        s.classList.toggle('active', i === n);
        s.classList.toggle('done', i < n);
    });
    regCurrentStep = n;
}

function regStep1Next() {
    hideError('reg-error1');
    const first = document.getElementById('reg-first').value.trim();
    const last = document.getElementById('reg-last').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const phone = document.getElementById('reg-phone').value.trim();
    if (!first || !last) { showError('reg-error1', 'Please enter your full name.'); return; }
    if (!email || !email.includes('@')) { showError('reg-error1', 'Please enter a valid email.'); return; }
    if (users[email]) { showError('reg-error1', 'An account with this email already exists.'); return; }
    if (!phone) { showError('reg-error1', 'Please enter your phone number.'); return; }
    regGoStep(2);
}

function regStep2Next() {
    hideError('reg-error2');
    const pass = document.getElementById('reg-pass').value;
    const pass2 = document.getElementById('reg-pass2').value;
    if (pass.length < 8) { showError('reg-error2', 'Password must be at least 8 characters.'); return; }
    if (pass !== pass2) { showError('reg-error2', 'Passwords do not match.'); return; }
    regGoStep(3);
}

function doRegister() {
    hideError('reg-error3');
    if (!document.getElementById('reg-terms').checked) {
        showError('reg-error3', 'Please accept the Terms of Service.'); return;
    }
    const btn = document.getElementById('reg-submit-btn');
    btn.textContent = 'Creating account...'; btn.style.opacity = '0.7';

    const firstName = document.getElementById('reg-first').value.trim();
    const lastName = document.getElementById('reg-last').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const phone = document.getElementById('reg-phone').value.trim();
    const pass = document.getElementById('reg-pass').value;
    const accountType = document.getElementById('reg-type').value;
    const country = document.getElementById('reg-country').value;
    const dob = document.getElementById('reg-dob').value;

    setTimeout(() => {
        btn.textContent = 'Create Account →'; btn.style.opacity = '1';
        const newUser = {
            firstName, lastName, email, phone,
            password: btoa(pass),
            accountType, country, dob,
            accountNumber: genAccountNumber(),
            cardNumber: genCardNumber(),
            cardExpiry: '09/' + (new Date().getFullYear() + 4).toString().slice(-2),
            memberSince: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long' }),
            balance: 5000, // Referral bonus
            transactions: [{
                id: Date.now(), type: 'credit', name: 'Referral Bonus', amount: 5000,
                date: new Date().toLocaleDateString(), icon: '🎉', category: 'other'
            }],
            withdrawals: [], savedBanks: []
        };
        users[email] = newUser;
        saveUsers();
        showToast('Account Created!', 'Welcome to NovaPay, ' + firstName + '! $5,000 bonus added.', '🎉');
        // Auto-login
        currentUser = newUser;
        transactions = newUser.transactions;
        withdrawals = newUser.withdrawals;
        savedBanks = newUser.savedBanks;
        balance = newUser.balance;
        loadDashboard();
        document.getElementById('login-page').classList.remove('active');
        document.getElementById('dashboard-page').classList.add('active');
        showSection('dashboard', null);
        animateDashboard();
    }, 1200);
}

// Password strength indicator
document.getElementById('reg-pass')?.addEventListener('input', function () {
    const val = this.value;
    const bar = document.getElementById('pw-strength');
    let strength = 0;
    if (val.length >= 8) strength++;
    if (/[A-Z]/.test(val)) strength++;
    if (/[0-9]/.test(val)) strength++;
    if (/[^A-Za-z0-9]/.test(val)) strength++;
    const colors = ['', '#ef4444', '#f59e0b', '#10b981', '#00e5ff'];
    const widths = ['0%', '25%', '50%', '75%', '100%'];
    bar.style.cssText = `margin-top:6px;height:4px;border-radius:4px;background:rgba(255,255,255,0.06);overflow:hidden;`;
    bar.innerHTML = `<div style="width:${widths[strength]};height:100%;background:${colors[strength]};border-radius:4px;transition:all 0.4s;"></div>`;
});

// ======= LOGOUT =======
function doLogout() {
    saveUserData();
    currentUser = null; transactions = []; withdrawals = []; savedBanks = []; balance = 0;
    document.getElementById('dashboard-page').classList.remove('active');
    document.getElementById('login-page').classList.add('active');
    switchAuth('login');
    document.getElementById('login-email').value = '';
    document.getElementById('login-pass').value = '';
}

// ======= LOAD DASHBOARD =======
function loadDashboard() {
    if (!currentUser) return;
    const u = currentUser;
    const initials = getInitials(u.firstName + ' ' + u.lastName);

    // Sidebar + topbar
    document.getElementById('sidebar-avatar').textContent = initials;
    document.getElementById('topbar-avatar').textContent = initials;
    document.getElementById('sidebar-name').textContent = u.firstName + ' ' + u.lastName;
    document.getElementById('sidebar-role').textContent = u.accountType.charAt(0).toUpperCase() + u.accountType.slice(1) + ' Account';
    document.getElementById('topbar-greeting').textContent = getGreeting() + ', ' + u.firstName + ' 👋';

    // Virtual card
    document.getElementById('vc-number').textContent = u.cardNumber;
    document.getElementById('vc-name').textContent = (u.firstName + ' ' + u.lastName).toUpperCase();
    document.getElementById('vc-expiry').textContent = u.cardExpiry;

    // Profile page
    document.getElementById('profile-avatar').textContent = initials;
    document.getElementById('profile-fullname').textContent = u.firstName + ' ' + u.lastName;
    document.getElementById('profile-email-disp').textContent = u.email;
    document.getElementById('profile-type-badge').textContent = u.accountType.charAt(0).toUpperCase() + u.accountType.slice(1);
    document.getElementById('profile-acnum').textContent = u.accountNumber;
    document.getElementById('pi-name').textContent = u.firstName + ' ' + u.lastName;
    document.getElementById('pi-email').textContent = u.email;
    document.getElementById('pi-phone').textContent = u.phone;
    document.getElementById('pi-type').textContent = u.accountType;
    document.getElementById('pi-country').textContent = u.country;
    document.getElementById('pi-since').textContent = u.memberSince;

    renderTransactions();
    renderWithdrawHistory();
    renderSavedBanks();
    updateBalanceDisplays();
}

function updateBalanceDisplays() {
    if (!currentUser) return;
    document.getElementById('profile-balance').textContent = fmt(balance);
    document.getElementById('pi-balance') && (document.getElementById('pi-balance').textContent = fmt(balance));
}

// ======= SECTIONS =======
const SECTIONS = ['dashboard', 'withdraw', 'transactions', 'profile', 'cards', 'analytics', 'savings'];
function showSection(name, navEl) {
    SECTIONS.forEach(s => {
        const el = document.getElementById('section-' + s);
        if (el) el.style.display = s === name ? 'block' : 'none';
    });
    if (navEl) {
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        navEl.classList.add('active');
    }
    closeSidebar();
    if (name === 'withdraw') { wdGoStep(1); document.getElementById('wd-avail-bal').textContent = fmt(balance); }
    if (name === 'transactions') renderTransactions('all');
}

// ======= SIDEBAR / TOPBAR =======
function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
    document.getElementById('sidebar-overlay').classList.toggle('open');
}
function closeSidebar() {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebar-overlay').classList.remove('open');
}

// ======= FILTER TABS =======
function setFilter(el) {
    document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
    el.classList.add('active');
}

// ======= COUNTER ANIMATION =======
function animateCounter(el, target, prefix = '', duration = 1500) {
    if (!el) return;
    const start = performance.now();
    const update = (time) => {
        const progress = Math.min((time - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 4);
        const val = Math.floor(eased * target);
        el.textContent = prefix + val.toLocaleString();
        if (progress < 1) requestAnimationFrame(update);
    };
    requestAnimationFrame(update);
}

function animateDashboard() {
    setTimeout(() => {
        animateCounter(document.getElementById('balance-num'), balance);
        animateCounter(document.getElementById('income-num'), 6800, '$');
        animateCounter(document.getElementById('expense-num'), 2840, '$');
        animateCounter(document.getElementById('savings-num'), 18500, '$');
        animateCounter(document.getElementById('invest-num'), 12400, '$');
        setTimeout(() => {
            document.getElementById('d1').style.strokeDashoffset = 251.3 * (1 - 0.35);
            document.getElementById('d2').style.strokeDashoffset = 251.3 * (1 - 0.25);
            document.getElementById('d3').style.strokeDashoffset = 251.3 * (1 - 0.20);
            document.getElementById('d4').style.strokeDashoffset = 251.3 * (1 - 0.20);
        }, 400);
        setTimeout(() => {
            document.getElementById('bar1').style.width = '35%';
            document.getElementById('bar2').style.width = '25%';
            document.getElementById('bar3').style.width = '20%';
            document.getElementById('bar4').style.width = '20%';
        }, 600);
    }, 300);
}

// ======= QUICK TRANSFER (dashboard widget) =======
document.querySelectorAll('.contact-item').forEach(item => {
    item.addEventListener('click', function () {
        document.querySelectorAll('.contact-item').forEach(c => c.classList.remove('active'));
        this.classList.add('active');
    });
});

function doTransfer() {
    const amount = parseFloat(document.getElementById('transfer-amount').value);
    if (!amount || amount <= 0) { showToast('Error', 'Please enter a valid amount.', '⚠️'); return; }
    if (amount > balance) { showToast('Insufficient Funds', 'You don\'t have enough balance.', '⚠️'); return; }
    balance -= amount;
    const active = document.querySelector('.contact-item.active .contact-name');
    const name = active ? active.textContent : 'Contact';
    addTransaction({ type: 'debit', name: 'Transfer to ' + name, amount, icon: '↑', category: 'transfer' });
    showToast('Transfer Sent!', fmt(amount) + ' sent to ' + name, '✓');
    document.getElementById('transfer-amount').value = '';
    animateCounter(document.getElementById('balance-num'), balance);
}

// ======= TRANSACTIONS =======
function addTransaction(tx) {
    const entry = { id: Date.now(), date: new Date().toLocaleDateString(), ...tx };
    transactions.unshift(entry);
    saveUserData();
    renderTransactions();
    renderRecentTx();
}

function renderRecentTx() {
    const el = document.getElementById('recent-tx-list');
    if (!el) return;
    const recent = transactions.slice(0, 5);
    if (!recent.length) { el.innerHTML = '<div style="color:var(--muted);font-size:13px;padding:30px 0;text-align:center;">No transactions yet</div>'; return; }
    el.innerHTML = recent.map(tx => txHTML(tx)).join('');
}

function txHTML(tx) {
    const isCredit = tx.type === 'credit';
    const isWd = tx.type === 'withdrawal';
    const amtClass = isCredit ? 'credit' : isWd ? 'withdrawal' : 'debit';
    const sign = isCredit ? '+' : '-';
    return `<div class="transaction-item">
    <div class="tx-icon" style="background:rgba(${isCredit ? '16,185,129' : isWd ? '245,158,11' : '239,68,68'},0.12);font-size:18px;">${tx.icon || '💳'}</div>
    <div class="tx-info"><div class="tx-name">${tx.name}</div><div class="tx-date">${tx.date}</div></div>
    <div class="tx-amount ${amtClass}">${sign}${fmt(tx.amount)}</div>
  </div>`;
}

let currentTxFilter = 'all';
function filterTx(type, el) {
    currentTxFilter = type;
    if (el) { document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active')); el.classList.add('active'); }
    renderTransactions(type);
}

function renderTransactions(filter) {
    filter = filter || currentTxFilter;
    const el = document.getElementById('all-tx-list');
    if (!el) return;
    let list = transactions;
    if (filter !== 'all') list = transactions.filter(t => t.type === filter);
    if (!list.length) { el.innerHTML = '<div style="color:var(--muted);font-size:13px;padding:30px 0;text-align:center;">No transactions found</div>'; return; }
    el.innerHTML = list.map(tx => txHTML(tx)).join('');
    // badge
    const badge = document.getElementById('tx-badge');
    if (badge) { badge.textContent = transactions.length; badge.style.display = transactions.length ? 'block' : 'none'; }
}

// ======= BANK WITHDRAWAL =======
let wdCurrentStep = 1;

function wdGoStep(n) {
    [1, 2, 3].forEach(i => {
        document.getElementById('wd-step' + i).style.display = i === n ? 'block' : 'none';
        const p = document.getElementById('wdp' + i);
        const l = document.getElementById('wdl' + i);
        if (p) { p.classList.toggle('active', i === n); p.classList.toggle('done', i < n); }
        if (l) l.classList.toggle('done', i < n);
    });
    document.getElementById('wd-success').style.display = 'none';
    wdCurrentStep = n;
}

function wdStep1Next() {
    hideError('wd-error1');
    const bank = document.getElementById('wd-bank').value;
    const acname = document.getElementById('wd-acname').value.trim();
    const acnum = document.getElementById('wd-acnum').value.trim();
    const routing = document.getElementById('wd-routing').value.trim();
    if (!bank) { showError('wd-error1', 'Please select a bank.'); return; }
    if (!acname) { showError('wd-error1', 'Please enter the account holder name.'); return; }
    if (acnum.length < 8) { showError('wd-error1', 'Please enter a valid account number.'); return; }
    if (routing.length !== 9 || !/^\d+$/.test(routing)) { showError('wd-error1', 'Routing number must be exactly 9 digits.'); return; }
    document.getElementById('wd-avail-bal').textContent = fmt(balance);
    wdGoStep(2);
}

function setWdAmount(n) {
    document.getElementById('wd-amount').value = n;
    updateFeeBreakdown();
}

document.getElementById('wd-amount')?.addEventListener('input', updateFeeBreakdown);

function updateFeeBreakdown() {
    const amt = parseFloat(document.getElementById('wd-amount').value) || 0;
    document.getElementById('fee-amount').textContent = fmt(amt);
    document.getElementById('fee-total').textContent = fmt(amt);
}

function wdStep2Next() {
    hideError('wd-error2');
    const amount = parseFloat(document.getElementById('wd-amount').value);
    if (!amount || amount <= 0) { showError('wd-error2', 'Please enter a valid amount.'); return; }
    if (amount > balance) { showError('wd-error2', 'Amount exceeds your available balance of ' + fmt(balance) + '.'); return; }
    if (amount < 1) { showError('wd-error2', 'Minimum withdrawal is $1.00'); return; }

    // Fill confirm page
    document.getElementById('conf-bank').textContent = document.getElementById('wd-bank').value;
    document.getElementById('conf-name').textContent = document.getElementById('wd-acname').value;
    const acnum = document.getElementById('wd-acnum').value;
    document.getElementById('conf-acnum').textContent = '••••' + acnum.slice(-4);
    document.getElementById('conf-routing').textContent = '•••••' + document.getElementById('wd-routing').value.slice(-4);
    document.getElementById('conf-type').textContent = document.getElementById('wd-actype').value;
    document.getElementById('conf-amount').textContent = fmt(amount);
    const note = document.getElementById('wd-note').value.trim();
    document.getElementById('conf-note').textContent = note || '—';
    wdGoStep(3);
}

function wdConfirm() {
    hideError('wd-error3');
    const pass = document.getElementById('wd-confirm-pass').value;
    if (!pass) { showError('wd-error3', 'Please enter your password to confirm.'); return; }
    if (btoa(pass) !== currentUser.password) { showError('wd-error3', 'Incorrect password.'); return; }

    const amount = parseFloat(document.getElementById('wd-amount').value);
    const bank = document.getElementById('wd-bank').value;
    const acname = document.getElementById('wd-acname').value;
    const acnum = document.getElementById('wd-acnum').value;
    const actype = document.getElementById('wd-actype').value;
    const note = document.getElementById('wd-note').value.trim();

    // Deduct balance
    balance -= amount;
    updateBalanceDisplays();
    animateCounter(document.getElementById('balance-num'), balance);

    // Add transaction
    addTransaction({
        type: 'withdrawal', name: 'Withdrawal to ' + bank, amount, icon: '🏦', category: 'withdrawal',
        bank, acname, acnum, actype, note
    });

    // Save bank if checked
    if (document.getElementById('wd-save').checked) {
        const exists = savedBanks.find(b => b.acnum === acnum);
        if (!exists) {
            savedBanks.push({ bank, acname, acnum, actype });
            renderSavedBanks();
        }
    }

    // Add to withdrawal history
    withdrawals.unshift({ date: new Date().toLocaleDateString(), bank, amount, acnum, status: 'Processing' });
    renderWithdrawHistory();
    saveUserData();

    // Show success
    [1, 2, 3].forEach(i => document.getElementById('wd-step' + i).style.display = 'none');
    document.getElementById('wd-success').style.display = 'block';
    document.getElementById('wd-success-msg').textContent = fmt(amount) + ' → ' + bank + ' (••••' + acnum.slice(-4) + ')';
    showToast('Withdrawal Initiated!', fmt(amount) + ' is being processed.', '🏦');
}

function resetWithdraw() {
    ['wd-bank', 'wd-acname', 'wd-acnum', 'wd-routing', 'wd-amount', 'wd-note', 'wd-confirm-pass'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    document.getElementById('wd-save').checked = false;
    document.getElementById('fee-amount').textContent = '$0.00';
    document.getElementById('fee-total').textContent = '$0.00';
    document.getElementById('wd-avail-bal').textContent = fmt(balance);
    wdGoStep(1);
}

function renderSavedBanks() {
    const el = document.getElementById('saved-banks-list');
    if (!el) return;
    if (!savedBanks.length) { el.innerHTML = '<div style="color:var(--muted);font-size:13px;padding:16px 0;text-align:center;">No saved banks yet</div>'; return; }
    el.innerHTML = savedBanks.map((b, i) => `
    <div class="saved-bank-item" onclick="fillBankDetails(${i})">
      <div class="bank-icon">🏦</div>
      <div class="bank-info">
        <div class="bank-name">${b.bank}</div>
        <div class="bank-acnum">••••${b.acnum.slice(-4)} · ${b.actype}</div>
      </div>
      <div style="font-size:11px;color:var(--accent);cursor:pointer;">Use</div>
    </div>`).join('');
}

function fillBankDetails(i) {
    const b = savedBanks[i];
    if (!b) return;
    document.getElementById('wd-bank').value = b.bank;
    document.getElementById('wd-acname').value = b.acname;
    document.getElementById('wd-acnum').value = b.acnum;
    document.getElementById('wd-actype').value = b.actype;
    showToast('Bank Loaded', b.bank + ' details filled in.', '✓');
}

function renderWithdrawHistory() {
    const el = document.getElementById('wd-history-list');
    if (!el) return;
    if (!withdrawals.length) { el.innerHTML = '<div style="color:var(--muted);font-size:13px;padding:16px 0;text-align:center;">No withdrawals yet</div>'; return; }
    el.innerHTML = withdrawals.slice(0, 5).map(w => `
    <div class="wd-history-item">
      <div class="bank-icon" style="width:34px;height:34px;font-size:13px;border-radius:8px;">🏦</div>
      <div style="flex:1;">
        <div style="font-size:13px;font-weight:500;">${w.bank}</div>
        <div style="font-size:11px;color:var(--muted);">${w.date} · ••••${w.acnum.slice(-4)}</div>
      </div>
      <div style="text-align:right;">
        <div style="font-family:'Syne',sans-serif;font-size:13px;font-weight:700;color:var(--accent4);">-${fmt(w.amount)}</div>
        <div style="font-size:10px;color:var(--accent3);">${w.status}</div>
      </div>
    </div>`).join('');
}

// ======= RIPPLE =======
document.addEventListener('click', function (e) {
    const btn = e.target.closest('.btn-primary,.btn-secondary,.card-action-btn,.send-btn,.nav-item,.quick-amounts button');
    if (!btn) return;
    const r = document.createElement('span');
    r.className = 'ripple';
    const rect = btn.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    r.style.cssText = `position:absolute;border-radius:50%;background:rgba(255,255,255,0.15);width:${size}px;height:${size}px;left:${e.clientX - rect.left - size / 2}px;top:${e.clientY - rect.top - size / 2}px;transform:scale(0);animation:rippleAnim 0.6s linear;pointer-events:none;`;
    btn.style.position = 'relative'; btn.style.overflow = 'hidden';
    btn.appendChild(r);
    setTimeout(() => r.remove(), 600);
});

// ======= KEYBOARD =======
document.getElementById('login-pass')?.addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
document.getElementById('reg-pass2')?.addEventListener('keydown', e => { if (e.key === 'Enter') regStep2Next(); });
// ======= ADD FUNDS MODAL =======
function openAddFunds() {
    const modal = document.getElementById('add-funds-modal');
    modal.classList.add('open');
    // Prefill bank reference with user account number
    const refEl = document.getElementById('af-bank-ref');
    if (refEl && currentUser) refEl.textContent = currentUser.accountNumber;
    // Reset to card tab
    switchPayTab('card', document.querySelector('.pay-tab'));
}

function closeAddFunds(e) {
    if (e && e.target !== document.getElementById('add-funds-modal')) return;
    document.getElementById('add-funds-modal').classList.remove('open');
}

function switchPayTab(tab, el) {
    ['card', 'bank', 'crypto'].forEach(t => {
        document.getElementById('pay-tab-' + t).style.display = t === tab ? 'block' : 'none';
    });
    document.querySelectorAll('.pay-tab').forEach(b => b.classList.remove('active'));
    if (el) el.classList.add('active');
}

function setAfAmount(tab, val) {
    const el = document.getElementById('af-' + tab + '-amount');
    if (el) el.value = val;
}

function formatCardInput(input) {
    let val = input.value.replace(/\D/g, '').slice(0, 16);
    input.value = val.replace(/(.{4})/g, '$1 ').trim();
}

function formatExpiry(input) {
    let val = input.value.replace(/\D/g, '').slice(0, 4);
    if (val.length >= 3) val = val.slice(0, 2) + '/' + val.slice(2);
    input.value = val;
}

function copyAddr(el) {
    const addr = el.textContent.replace('tap to copy', '').trim();
    navigator.clipboard?.writeText(addr).then(() => showToast('Copied!', 'Wallet address copied to clipboard.', '✓'));
}

function processAddFunds(method) {
    hideError('af-' + method + '-error');

    if (method === 'card') {
        const name = document.getElementById('af-card-name').value.trim();
        const num = document.getElementById('af-card-num').value.replace(/\s/g, '');
        const expiry = document.getElementById('af-expiry').value.trim();
        const cvv = document.getElementById('af-cvv').value.trim();
        const amount = parseFloat(document.getElementById('af-card-amount').value);

        if (!name) { showError('af-card-error', 'Please enter the cardholder name.'); return; }
        if (num.length < 16) { showError('af-card-error', 'Please enter a valid 16-digit card number.'); return; }
        if (!expiry.match(/^\d{2}\/\d{2}$/)) { showError('af-card-error', 'Please enter a valid expiry date (MM/YY).'); return; }
        if (cvv.length < 3) { showError('af-card-error', 'Please enter a valid CVV.'); return; }
        if (!amount || amount < 1) { showError('af-card-error', 'Please enter a valid amount (minimum $1).'); return; }

        // Simulate processing
        const btn = document.querySelector('#pay-tab-card .btn-primary');
        btn.textContent = 'Processing…'; btn.style.opacity = '0.7';
        setTimeout(() => {
            btn.textContent = 'Add Funds →'; btn.style.opacity = '1';
            balance += amount;
            addTransaction({ type: 'credit', name: 'Card Deposit (•••• ' + num.slice(-4) + ')', amount, icon: '💳', category: 'deposit' });
            updateBalanceDisplays();
            animateCounter(document.getElementById('balance-num'), balance);
            document.getElementById('add-funds-modal').classList.remove('open');
            showToast('Funds Added!', fmt(amount) + ' has been added to your account.', '💰');
            // Reset fields
            ['af-card-name', 'af-card-num', 'af-expiry', 'af-cvv', 'af-card-amount'].forEach(id => {
                const el = document.getElementById(id); if (el) el.value = '';
            });
        }, 1500);
    }

    else if (method === 'bank') {
        const amount = parseFloat(document.getElementById('af-bank-amount').value);
        if (!amount || amount < 1) { showError('af-bank-error', 'Please enter a valid amount.'); return; }
        document.getElementById('add-funds-modal').classList.remove('open');
        showToast('Transfer Registered', 'We\'ll credit ' + fmt(amount) + ' once we receive your transfer (1-3 business days).', '🏦');
        document.getElementById('af-bank-amount').value = '';
    }

    else if (method === 'crypto') {
        const amount = parseFloat(document.getElementById('af-crypto-amount').value);
        if (!amount || amount < 10) { showError('af-crypto-error', 'Minimum crypto deposit is $10.'); return; }
        document.getElementById('add-funds-modal').classList.remove('open');
        showToast('Crypto Pending', fmt(amount) + ' will be credited after 3 network confirmations.', '₿');
        document.getElementById('af-crypto-amount').value = '';
    }
}

// ======= CONTACT SUPPORT MODAL =======
function openSupport() {
    document.getElementById('support-modal').classList.add('open');
}

function closeSupport(e) {
    if (e && e.target !== document.getElementById('support-modal')) return;
    document.getElementById('support-modal').classList.remove('open');
}

function submitSupport() {
    hideError('support-error');
    const subject = document.getElementById('support-subject').value;
    const message = document.getElementById('support-message').value.trim();
    if (!subject) { showError('support-error', 'Please select a subject.'); return; }
    if (message.length < 10) { showError('support-error', 'Please describe your issue (at least 10 characters).'); return; }

    const btn = document.querySelector('#support-modal .btn-primary');
    btn.textContent = 'Sending…'; btn.style.opacity = '0.7';
    setTimeout(() => {
        btn.textContent = 'Send Message →'; btn.style.opacity = '1';
        document.getElementById('support-subject').value = '';
        document.getElementById('support-message').value = '';
        document.getElementById('support-modal').classList.remove('open');
        showToast('Message Sent!', 'Our team will get back to you within 24 hours.', '✉️');
    }, 1200);
}

// Close modals on Escape key
document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
        document.getElementById('add-funds-modal')?.classList.remove('open');
        document.getElementById('support-modal')?.classList.remove('open');
    }
});