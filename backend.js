const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const fs = require('fs');

const app = express();
const PORT = 3001;
const SECRET_KEY = 'novapay-secret-key-2026';

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Simple file-based database
const DB_FILE = './novapay_db.json';

function loadDB() {
  try {
    if (fs.existsSync(DB_FILE)) {
      return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    }
  } catch (e) {}
  return { users: {} };
}

function saveDB(db) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

let db = loadDB();

// Helper to get user by token
function getUserFromToken(token) {
  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    return db.users[decoded.email];
  } catch (e) {
    return null;
  }
}

// Register
app.post('/api/register', async (req, res) => {
  const { firstName, lastName, email, phone, password, accountType, country, dob } = req.body;
  
  if (db.users[email]) {
    return res.status(400).json({ error: 'User already exists' });
  }

  const hashedPass = await bcrypt.hash(password, 10);
  const accountNumber = 'NP' + Math.floor(1000000000 + Math.random() * 9000000000);
  const cardNumber = [4521, Math.floor(1000 + Math.random() * 9000), Math.floor(1000 + Math.random() * 9000), Math.floor(1000 + Math.random() * 9000)].join(' ');

  const newUser = {
    firstName,
    lastName,
    email,
    phone,
    password: hashedPass,
    accountType: accountType || 'personal',
    country: country || 'US',
    dob,
    accountNumber,
    cardNumber,
    cardExpiry: '09/' + (new Date().getFullYear() + 4).toString().slice(-2),
    memberSince: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long' }),
    balance: 58000,
    transactions: [{
      id: Date.now(),
      type: 'credit',
      name: 'Welcome Bonus',
      amount: 58000,
      date: new Date().toLocaleDateString(),
      icon: '🎉'
    }],
    withdrawals: [],
    savedBanks: []
  };

  db.users[email] = newUser;
  saveDB(db);

  res.json({ success: true, message: 'Account created' });
});

// Login
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  const user = db.users[email];

  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign({ email }, SECRET_KEY, { expiresIn: '24h' });
  res.json({ token, user: { ...user, password: undefined } });
});

// Get current user
app.get('/api/me', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  const user = getUserFromToken(token);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  res.json({ ...user, password: undefined });
});

// Add funds
app.post('/api/add-funds', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  const user = getUserFromToken(token);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const { amount, method } = req.body;
  if (!amount || amount <= 0) return res.status(400).json({ error: 'Invalid amount' });

  user.balance += parseFloat(amount);

  user.transactions.unshift({
    id: Date.now(),
    type: 'credit',
    name: `${method || 'Deposit'} • ${new Date().toLocaleDateString()}`,
    amount: parseFloat(amount),
    date: new Date().toLocaleDateString(),
    icon: '💰'
  });

  saveDB(db);
  res.json({ success: true, balance: user.balance });
});

// Withdraw
app.post('/api/withdraw', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  const user = getUserFromToken(token);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const { amount, bank, acname, acnum, routing, actype, note } = req.body;

  if (amount > user.balance) {
    return res.status(400).json({ error: 'Insufficient balance' });
  }

  user.balance -= parseFloat(amount);

  const tx = {
    id: Date.now(),
    type: 'withdrawal',
    name: `Withdrawal to ${bank}`,
    amount: parseFloat(amount),
    date: new Date().toLocaleDateString(),
    icon: '🏦',
    bank, acname, acnum, actype, note
  };

  user.transactions.unshift(tx);
  user.withdrawals.unshift({ date: new Date().toLocaleDateString(), bank, amount, acnum, status: 'Processing' });

  if (req.body.saveBank) {
    const exists = user.savedBanks.find(b => b.acnum === acnum);
    if (!exists) user.savedBanks.push({ bank, acname, acnum, actype });
  }

  saveDB(db);
  res.json({ success: true, balance: user.balance });
});

// Get transactions
app.get('/api/transactions', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  const user = getUserFromToken(token);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  res.json(user.transactions);
});

// Quick transfer (simplified)
app.post('/api/transfer', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  const user = getUserFromToken(token);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const { amount, to } = req.body;
  if (amount > user.balance) return res.status(400).json({ error: 'Insufficient funds' });

  user.balance -= parseFloat(amount);

  user.transactions.unshift({
    id: Date.now(),
    type: 'debit',
    name: `Transfer to ${to || 'Contact'}`,
    amount: parseFloat(amount),
    date: new Date().toLocaleDateString(),
    icon: '↑'
  });

  saveDB(db);
  res.json({ success: true, balance: user.balance });
});

app.listen(PORT, () => {
  console.log(`🚀 NovaPay Backend running on http://localhost:${PORT}`);
  console.log('DB file: ' + DB_FILE);
});
