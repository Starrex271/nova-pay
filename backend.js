cat > /home/workdir/attachments/novapay.js << 'EOF'
// ================================================
// NOVAPAY — Full Backend Integration
// ================================================

const API_BASE = '/api';  // Works on Render and localhost
let token = localStorage.getItem('novapay_token');
let currentUser = null;
let balance = 0;

// ======= UTILS =======
function fmt(n) { 
    return '$' + parseFloat(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2 }); 
}

function getInitials(name) { 
    return (name || '').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2); 
}

function getGreeting() {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
}

function showError(id, msg) {
    const el = document.getElementById(id);
    if (el) {
        el.textContent = msg;
        el.style.display = 'block';
    }
}

function hideError(id) {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
}

function showToast(title, msg, icon = '✓') {
    document.getElementById('toast-icon').textContent = icon;
    document.getElementById('toast-title').textContent = title;
    document.getElementById('toast-msg').textContent = msg;
    const t = document.getElementById('toast');
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3500);
}

// Auth Header
function authHeader() {
    return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };
}

// ======= LOGIN =======
async function doLogin() {
    hideError('login-error');
    const email = document.getElementById('login-email').value.trim();
    const pass = document.getElementById('login-pass').value;

    if (!email || !pass) return showError('login-error', 'All fields are required');

    const btn = document.getElementById('login-btn');
    btn.textContent = 'Signing in...';

    try {
        const res = await fetch(`${API_BASE}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password: pass })
        });

        const data = await res.json();

        if (!res.ok) throw new Error(data.error || 'Login failed');

        token = data.token;
        localStorage.setItem('novapay_token', token);
        currentUser = data.user;
        balance = currentUser.balance || 0;

        loadDashboard();
        document.getElementById('login-page').classList.remove('active');
        document.getElementById('dashboard-page').classList.add('active');
        showSection('dashboard', null);
        animateDashboard();
        showToast('Welcome back!', `Hello, ${currentUser.firstName}!`, '👋');
    } catch (err) {
        showError('login-error', err.message);
    } finally {
        btn.textContent = 'Sign In →';
    }
}

// ======= REGISTER =======
async function doRegister() {
    hideError('reg-error3');
    if (!document.getElementById('reg-terms').checked) {
        return showError('reg-error3', 'Please accept the Terms of Service');
    }

    const btn = document.getElementById('reg-submit-btn');
    btn.textContent = 'Creating account...';

    try {
        const res = await fetch(`${API_BASE}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                firstName: document.getElementById('reg-first').value.trim(),
                lastName: document.getElementById('reg-last').value.trim(),
                email: document.getElementById('reg-email').value.trim(),
                phone: document.getElementById('reg-phone').value.trim(),
                password: document.getElementById('reg-pass').value,
                accountType: document.getElementById('reg-type').value,
                country: document.getElementById('reg-country').value,
                dob: document.getElementById('reg-dob').value
            })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Registration failed');

        showToast('Success!', 'Account created! Logging you in...', '🎉');
        // Auto login
        document.getElementById('login-email').value = document.getElementById('reg-email').value;
        document.getElementById('login-pass').value = document.getElementById('reg-pass').value;
        setTimeout(doLogin, 800);
    } catch (err) {
        showError('reg-error3', err.message);
    } finally {
        btn.textContent = 'Create Account →';
    }
}

// ======= LOAD DASHBOARD =======
async function loadDashboard() {
    try {
        const res = await fetch(`${API_BASE}/me`, { headers: authHeader() });
        if (!res.ok) throw new Error('Session expired');
        
        currentUser = await res.json();
        balance = currentUser.balance || 0;

        const initials = getInitials(currentUser.firstName + ' ' + currentUser.lastName);

        // Update UI
        document.getElementById('sidebar-avatar').textContent = initials;
        document.getElementById('topbar-avatar').textContent = initials;
        document.getElementById('sidebar-name').textContent = `${currentUser.firstName} ${currentUser.lastName}`;
        document.getElementById('sidebar-role').textContent = `${currentUser.accountType || 'Personal'} Account`;
        document.getElementById('topbar-greeting').textContent = `${getGreeting()}, ${currentUser.firstName} 👋`;

        document.getElementById('vc-number').textContent = currentUser.cardNumber || '•••• •••• •••• ••••';
        document.getElementById('vc-name').textContent = `${currentUser.firstName} ${currentUser.lastName}`.toUpperCase();
        document.getElementById('vc-expiry').textContent = currentUser.cardExpiry || '09/30';

        // Profile page
        document.getElementById('profile-avatar').textContent = initials;
        document.getElementById('profile-fullname').textContent = `${currentUser.firstName} ${currentUser.lastName}`;
        document.getElementById('profile-email-disp').textContent = currentUser.email;
        document.getElementById('profile-acnum').textContent = currentUser.accountNumber;

        updateBalanceDisplays();
        renderTransactions(currentUser.transactions || []);
        renderWithdrawHistory(currentUser.withdrawals || []);
        renderSavedBanks(currentUser.savedBanks || []);
    } catch (e) {
        console.error(e);
        doLogout();
    }
}

function updateBalanceDisplays() {
    document.getElementById('balance-num').textContent = Math.floor(balance);
    document.getElementById('profile-balance').textContent = fmt(balance);
}

// ======= LOGOUT =======
function doLogout() {
    localStorage.removeItem('novapay_token');
    token = null;
    currentUser = null;
    document.getElementById('dashboard-page').classList.remove('active');
    document.getElementById('login-page').classList.add('active');
    switchAuth('login');
}

// ======= ADD FUNDS =======
async function processAddFunds(method) {
    if (method === 'card') {
        const amount = parseFloat(document.getElementById('af-card-amount').value);
        if (!amount || amount < 1) return showError('af-card-error', 'Enter valid amount');

        try {
            const res = await fetch(`${API_BASE}/add-funds`, {
                method: 'POST',
                headers: authHeader(),
                body: JSON.stringify({ amount, method: 'Card' })
            });
            const data = await res.json();
            if (data.success) {
                balance = data.balance;
                updateBalanceDisplays();
                document.getElementById('add-funds-modal').classList.remove('open');
                showToast('Success!', `${fmt(amount)} added to your account`, '💰');
            }
        } catch (e) {
            showToast('Error', 'Failed to add funds', '⚠️');
        }
    } else {
        showToast('Pending', `${method} deposit registered`, '🏦');
        document.getElementById('add-funds-modal').classList.remove('open');
    }
}

// ======= WITHDRAW =======
async function wdConfirm() {
    hideError('wd-error3');
    const amount = parseFloat(document.getElementById('wd-amount').value);
    const bank = document.getElementById('wd-bank').value;

    try {
        const res = await fetch(`${API_BASE}/withdraw`, {
            method: 'POST',
            headers: authHeader(),
            body: JSON.stringify({ amount, bank })
        });
        const data = await res.json();

        if (data.success) {
            balance = data.balance;
            updateBalanceDisplays();
            document.getElementById('wd-success').style.display = 'block';
            showToast('Withdrawal Initiated!', fmt(amount) + ' is being processed', '🏦');
        }
    } catch (e) {
        showError('wd-error3', 'Withdrawal failed');
    }
}

// Keep your existing UI functions (showSection, wdGoStep, render functions, etc.)
// They will still work as they update the DOM

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    setDate();
    if (token) {
        loadDashboard().then(() => {
            document.getElementById('login-page').classList.remove('active');
            document.getElementById('dashboard-page').classList.add('active');
        });
    }
});
EOF