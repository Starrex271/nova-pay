// ================================================
// NOVAPAY — Full Application Logic (Enhanced)
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
    // Re-trigger shake animation
    el.style.animation = 'none';
    el.offsetHeight; // reflow
    el.style.animation = '';
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

// ======= FLOATING PARTICLES =======
function spawnParticles() {
    const container = document.getElementById('login-page');
    if (!container) return;
    const colors = ['rgba(0,229,255,', 'rgba(124,58,237,', 'rgba(16,185,129,'];
    for (let i = 0; i < 18; i++) {
        const p = document.createElement('div');
        p.className = 'particle';
        const size = Math.random() * 4 + 2;
        const color = colors[Math.floor(Math.random() * colors.length)];
        const delay = Math.random() * 10;
        const duration = Math.random() * 12 + 8;
        const left = Math.random() * 100;
        p.style.cssText = `
            width:${size}px;height:${size}px;
            left:${left}%;bottom:-10px;
            background:${color}${Math.random() * 0.5 + 0.2});
            box-shadow:0 0 ${size * 2}px ${color}0.4);
            animation-delay:${delay}s;
            animation-duration:${duration}s;
        `;
        container.appendChild(p);
    }
}
spawnParticles();

// ======= TOAST =======
let toastTimer;
function showToast(title, msg, icon = '✓') {
    document.getElementById('toast-icon').textContent = icon;
    document.getElementById('toast-title').textContent = title;
    document.getElementById('toast-msg').textContent = msg;
    const t = document.getElementById('toast');
    t.classList.remove('show');
    void t.offsetWidth; // reflow to re-trigger animation
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
    btn.textContent = 'Signing in…';
    btn.style.opacity = '0.7';
    btn.disabled = true;

    setTimeout(() => {
        btn.textContent = 'Sign In →';
        btn.style.opacity = '1';
        btn.disabled = false;
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
    btn.textContent = 'Creating account…';
    btn.style.opacity = '0.7';
    btn.disabled = true;

    const firstName = document.getElementById('reg-first').value.trim();
    const lastName = document.getElementById('reg-last').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const phone = document.getElementById('reg-phone').value.trim();
    const pass = document.getElementById('reg-pass').value;
    const accountType = document.getElementById('reg-type').value;
    const country = document.getElementById('reg-country').value;
    const dob = document.getElementById('reg-dob').value;

    setTimeout(() => {
        btn.textContent = 'Create Account →';
        btn.style.opacity = '1';
        btn.disabled = false;

        const newUser = {
            firstName, lastName, email, phone,
            password: btoa(pass),
            accountType, country, dob,
            accountNumber: genAccountNumber(),
            cardNumber: genCardNumber(),
            cardExpiry: '09/' + (new Date().getFullYear() + 4).toString().slice(-2),
            memberSince: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long' }),
            balance: 5000,
            transactions: [{
                id: Date.now(), type: 'credit', name: 'Welcome Bonus', amount: 5000,
                date: new Date().toLocaleDateString(), icon: '🎉', category: 'other'
            }],
            withdrawals: [], savedBanks: []
        };
        users[email] = newUser;
        saveUsers();
        showToast('Account Created!', 'Welcome to NovaPay, ' + firstName + '! $5,000 bonus added.', '🎉');
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

// ======= PASSWORD STRENGTH =======
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
    const labels = ['', 'Weak', 'Fair', 'Strong', 'Excellent'];
    bar.style.cssText = `margin-top:6px;height:4px;border-radius:4px;background:rgba(255,255,255,0.06);overflow:hidden;`;
    bar.innerHTML = `<div style="width:${widths[strength]};height:100%;background:${colors[strength]};border-radius:4px;transition:all 0.4s;"></div>`;
    bar.title = labels[strength];
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

    document.getElementById('sidebar-avatar').textContent = initials;
    document.getElementById('topbar-avatar').textContent = initials;
    document.getElementById('sidebar-name').textContent = u.firstName + ' ' + u.lastName;
    document.getElementById('sidebar-role').textContent = u.accountType.charAt(0).toUpperCase() + u.accountType.slice(1) + ' Account';
    document.getElementById('topbar-greeting').textContent = getGreeting() + ', ' + u.firstName + ' 👋';

    document.getElementById('vc-number').textContent = u.cardNumber;
    document.getElementById('vc-name').textContent = (u.firstName + ' ' + u.lastName).toUpperCase();
    document.getElementById('vc-expiry').textContent = u.cardExpiry;

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
    const profileBal = document.getElementById('profile-balance');
    if (profileBal) profileBal.textContent = fmt(balance);
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
    if (name === 'withdraw') {
        wdGoStep(1);
        const wdBal = document.getElementById('wd-avail-bal');
        if (wdBal) wdBal.textContent = fmt(balance);
    }
    if (name === 'transactions') renderTransactions('all');
}

// ======= SIDEBAR =======
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
        else el.textContent = prefix + target.toLocaleString(); // ensure exact final value
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
        // Donut segments
        setTimeout(() => {
            const circ = 251.3;
            const segs = [0.35, 0.25, 0.20, 0.20];
            ['d1', 'd2', 'd3', 'd4'].forEach((id, i) => {
                const el = document.getElementById(id);
                if (el) el.style.strokeDashoffset = circ * (1 - segs[i]);
            });
            const total = document.getElementById('donut-total');
            if (total) total.textContent = fmt(balance < 100 ? 5000 : balance);
        }, 400);
        // Spending bars
        setTimeout(() => {
            document.getElementById('bar1').style.width = '35%';
            document.getElementById('bar2').style.width = '25%';
            document.getElementById('bar3').style.width = '20%';
            document.getElementById('bar4').style.width = '20%';
            const spending = balance * 0.3;
            document.getElementById('bar1-label').textContent = fmt(spending * 0.35);
            document.getElementById('bar2-label').textContent = fmt(spending * 0.25);
            document.getElementById('bar3-label').textContent = fmt(spending * 0.20);
            document.getElementById('bar4-label').textContent = fmt(spending * 0.20);
        }, 600);
        renderRecentTx();
    }, 300);
}

// ======= QUICK TRANSFER =======
document.querySelectorAll('.contact-item').forEach(item => {
    item.addEventListener('click', function () {
        document.querySelectorAll('.contact-item').forEach(c => c.classList.remove('active'));
        this.classList.add('active');
    });
});

function doTransfer() {
    const amount = parseFloat(document.getElementById('transfer-amount').value);
    if (!amount || amount <= 0) { showToast('Error', 'Please enter a valid amount.', '⚠️'); return; }
    if (!currentUser) { showToast('Not logged in', 'Please sign in first.', '⚠️'); return; }
    if (amount > balance) { showToast('Insufficient Funds', 'You don\'t have enough balance.', '⚠️'); return; }
    balance -= amount;
    updateBalanceDisplays();
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
    if (!recent.length) {
        el.innerHTML = '<div style="color:var(--muted);font-size:13px;padding:30px 0;text-align:center;">No transactions yet</div>';
        return;
    }
    el.innerHTML = recent.map((tx, i) => txHTML(tx, i)).join('');
}

function txHTML(tx, animIdx = 0) {
    const isCredit = tx.type === 'credit';
    const isWd = tx.type === 'withdrawal';
    const amtClass = isCredit ? 'credit' : isWd ? 'withdrawal' : 'debit';
    const sign = isCredit ? '+' : '-';
    const delay = animIdx * 50;
    return `<div class="transaction-item" style="animation-delay:${delay}ms">
      <div class="tx-icon" style="background:rgba(${isCredit ? '16,185,129' : isWd ? '245,158,11' : '239,68,68'},0.12);font-size:18px;">${tx.icon || '💳'}</div>
      <div class="tx-info">
        <div class="tx-name">${tx.name}</div>
        <div class="tx-date">${tx.date}${tx.category ? ' · ' + tx.category : ''}</div>
      </div>
      <div class="tx-amount ${amtClass}">${sign}${fmt(tx.amount)}</div>
    </div>`;
}

let currentTxFilter = 'all';
function filterTx(type, el) {
    currentTxFilter = type;
    if (el) {
        document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
        el.classList.add('active');
    }
    renderTransactions(type);
}

function renderTransactions(filter) {
    filter = filter || currentTxFilter;
    const el = document.getElementById('all-tx-list');
    if (!el) return;
    let list = transactions;
    if (filter !== 'all') list = transactions.filter(t => t.type === filter);
    if (!list.length) {
        el.innerHTML = '<div style="color:var(--muted);font-size:13px;padding:30px 0;text-align:center;">No transactions found</div>';
        return;
    }
    el.innerHTML = list.map((tx, i) => txHTML(tx, i)).join('');
    const badge = document.getElementById('tx-badge');
    if (badge) {
        badge.textContent = transactions.length;
        badge.style.display = transactions.length ? 'block' : 'none';
    }
}

// ======= BANK WITHDRAWAL =======
let wdCurrentStep = 1;

function wdGoStep(n) {
    [1, 2, 3].forEach(i => {
        const step = document.getElementById('wd-step' + i);
        const p = document.getElementById('wdp' + i);
        const l = document.getElementById('wdl' + i);
        if (step) step.style.display = i === n ? 'block' : 'none';
        if (p) { p.classList.toggle('active', i === n); p.classList.toggle('done', i < n); }
        if (l) l.classList.toggle('done', i < n);
    });
    const success = document.getElementById('wd-success');
    if (success) success.style.display = 'none';
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
    if (acnum.length < 8) { showError('wd-error1', 'Please enter a valid account number (min 8 digits).'); return; }
    if (routing.length !== 9 || !/^\d+$/.test(routing)) { showError('wd-error1', 'Routing number must be exactly 9 digits.'); return; }
    const wdBal = document.getElementById('wd-avail-bal');
    if (wdBal) wdBal.textContent = fmt(balance);
    wdGoStep(2);
}

function setWdAmount(n) {
    const el = document.getElementById('wd-amount');
    if (el) { el.value = n; updateFeeBreakdown(); }
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

    balance -= amount;
    updateBalanceDisplays();
    animateCounter(document.getElementById('balance-num'), balance);

    addTransaction({
        type: 'withdrawal', name: 'Withdrawal to ' + bank, amount, icon: '🏦', category: 'withdrawal',
        bank, acname, acnum, actype, note
    });

    if (document.getElementById('wd-save').checked) {
        const exists = savedBanks.find(b => b.acnum === acnum);
        if (!exists) {
            savedBanks.push({ bank, acname, acnum, actype });
            renderSavedBanks();
        }
    }

    withdrawals.unshift({ date: new Date().toLocaleDateString(), bank, amount, acnum, status: 'Processing' });
    renderWithdrawHistory();
    saveUserData();

    [1, 2, 3].forEach(i => { const s = document.getElementById('wd-step' + i); if (s) s.style.display = 'none'; });
    const success = document.getElementById('wd-success');
    if (success) success.style.display = 'block';
    const msg = document.getElementById('wd-success-msg');
    if (msg) msg.textContent = fmt(amount) + ' → ' + bank + ' (••••' + acnum.slice(-4) + ')';
    showToast('Withdrawal Initiated!', fmt(amount) + ' is being processed.', '🏦');
}

function resetWithdraw() {
    ['wd-bank', 'wd-acname', 'wd-acnum', 'wd-routing', 'wd-amount', 'wd-note', 'wd-confirm-pass'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    const saveCb = document.getElementById('wd-save');
    if (saveCb) saveCb.checked = false;
    document.getElementById('fee-amount').textContent = '$0.00';
    document.getElementById('fee-total').textContent = '$0.00';
    const wdBal = document.getElementById('wd-avail-bal');
    if (wdBal) wdBal.textContent = fmt(balance);
    wdGoStep(1);
}

function renderSavedBanks() {
    const el = document.getElementById('saved-banks-list');
    if (!el) return;
    if (!savedBanks.length) {
        el.innerHTML = '<div style="color:var(--muted);font-size:13px;padding:16px 0;text-align:center;">No saved banks yet</div>';
        return;
    }
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
    showSection('withdraw', null);
    showToast('Bank Loaded', b.bank + ' details filled in.', '✓');
}

function renderWithdrawHistory() {
    const el = document.getElementById('wd-history-list');
    if (!el) return;
    if (!withdrawals.length) {
        el.innerHTML = '<div style="color:var(--muted);font-size:13px;padding:16px 0;text-align:center;">No withdrawals yet</div>';
        return;
    }
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
    btn.style.position = 'relative';
    btn.style.overflow = 'hidden';
    btn.appendChild(r);
    setTimeout(() => r.remove(), 600);
});

// ======= VIRTUAL CARD — MOUSE TILT =======
const vcCard = document.querySelector('.virtual-card');
if (vcCard) {
    vcCard.addEventListener('mousemove', function (e) {
        const rect = this.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;
        this.style.transform = `perspective(600px) rotateY(${x * 12}deg) rotateX(${-y * 8}deg) translateY(-4px)`;
    });
    vcCard.addEventListener('mouseleave', function () {
        this.style.transform = '';
    });
}

// ======= KEYBOARD =======
document.getElementById('login-pass')?.addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
document.getElementById('login-email')?.addEventListener('keydown', e => { if (e.key === 'Enter') document.getElementById('login-pass')?.focus(); });
document.getElementById('reg-pass2')?.addEventListener('keydown', e => { if (e.key === 'Enter') regStep2Next(); });

// ======= AUTO-FORMAT ROUTING NUMBER =======
document.getElementById('wd-routing')?.addEventListener('input', function () {
    this.value = this.value.replace(/\D/g, '').slice(0, 9);
});

// ======= AUTO-FORMAT ACCOUNT NUMBER =======
document.getElementById('wd-acnum')?.addEventListener('input', function () {
    this.value = this.value.replace(/\D/g, '').slice(0, 17);
});