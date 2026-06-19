cat > backend.js << 'EOF'
import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;
const SECRET_KEY = 'novapay-super-secret-2026';

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'attachments')));

// Data persistence
const DATA_FILE = path.join(__dirname, 'data.json');
let data = { users: {} };

if (fs.existsSync(DATA_FILE)) {
  data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
} else {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function saveData() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// Auth middleware
const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });

  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'attachments', 'home.html'));
});

// Register
app.post('/api/register', async (req, res) => {
  const { firstName, lastName, email, phone, password, accountType, country } = req.body;

  if (data.users[email]) {
    return res.status(400).json({ error: 'User already exists' });
  }

  const hashedPass = await bcrypt.hash(password, 10);

  const user = {
    firstName,
    lastName,
    email,
    phone,
    password: hashedPass,
    accountType: accountType || 'personal',
    country: country || 'NG',
    accountNumber: 'NP' + Math.floor(1000000000 + Math.random() * 9000000000),
    cardNumber: '4521 ' + Math.floor(1000 + Math.random() * 9000) + ' ' + Math.floor(1000 + Math.random() * 9000) + ' ' + Math.floor(1000 + Math.random() * 9000),
    cardExpiry: '09/30',
    balance: 58000,
    transactions: [],
    withdrawals: [],
    savedBanks: []
  };

  data.users[email] = user;
  saveData();

  res.json({ message: 'Account created successfully!' });
});

// Login
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  const user = data.users[email];

  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const token = jwt.sign({ email }, SECRET_KEY, { expiresIn: '7d' });
  const { password: _, ...userSafe } = user;

  res.json({ token, user: userSafe });
});

// Get current user
app.get('/api/me', authenticate, (req, res) => {
  const user = data.users[req.user.email];
  const { password: _, ...userSafe } = user;
  res.json(userSafe);
});

// Add Funds
app.post('/api/add-funds', authenticate, (req, res) => {
  const { amount, method } = req.body;
  const user = data.users[req.user.email];

  user.balance += parseFloat(amount);
  user.transactions.unshift({
    id: Date.now(),
    type: 'credit',
    name: `${method} Deposit`,
    amount: parseFloat(amount),
    date: new Date().toLocaleDateString()
  });

  saveData();
  res.json({ success: true, newBalance: user.balance });
});

// Withdraw
app.post('/api/withdraw', authenticate, (req, res) => {
  const { amount, bank } = req.body;
  const user = data.users[req.user.email];

  if (parseFloat(amount) > user.balance) {
    return res.status(400).json({ error: 'Insufficient balance' });
  }

  user.balance -= parseFloat(amount);
  user.transactions.unshift({
    id: Date.now(),
    type: 'withdrawal',
    name: `Withdrawal to ${bank}`,
    amount: parseFloat(amount),
    date: new Date().toLocaleDateString()
  });

  saveData();
  res.json({ success: true, newBalance: user.balance });
});

app.listen(PORT, () => {
  console.log(`🚀 NovaPay Backend is running on http://localhost:${PORT}`);
  console.log(`🌐 Open your app at: http://localhost:${PORT}`);
});
EOF
