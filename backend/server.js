require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('./db');

const app = express();
app.use(cors());
app.use(express.json());
const SECRET = process.env.JWT_SECRET || 'change-this-secret';

const inMemoryUsers = new Map();
const inMemoryStudents = [
  { id: 1, name: 'Nimali Perera', className: 'Grade 9', monthlyFee: 2500, totalPaid: 2500, contact: '077-1122334' },
  { id: 2, name: 'Kasun Silva', className: 'Grade 10', monthlyFee: 3000, totalPaid: 1800, contact: '071-9988776' },
  { id: 3, name: 'Aisha Rahman', className: 'Grade 8', monthlyFee: 2200, totalPaid: 2200, contact: '076-3344551' },
  { id: 4, name: 'Dinuka Fernando', className: 'Grade 11', monthlyFee: 3500, totalPaid: 1000, contact: '070-5566778' },
];
const inMemoryPayments = [
  { id: 1, studentId: 1, studentName: 'Nimali Perera', amount: 2500, paymentMethod: 'Bank Transfer', paymentDate: '2026-09-28', notes: '' },
  { id: 2, studentId: 2, studentName: 'Kasun Silva', amount: 1800, paymentMethod: 'Cash', paymentDate: '2026-09-20', notes: '' },
  { id: 3, studentId: 3, studentName: 'Aisha Rahman', amount: 2200, paymentMethod: 'Card', paymentDate: '2026-09-18', notes: '' },
];
let usingInMemoryStore = false;

function auth(req, res, next) {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  try { req.user = jwt.verify(token, SECRET); next(); }
  catch { res.status(401).json({ message: 'Session expired. Please sign in again.' }); }
}

function getStudentStatus(student) {
  if (student.totalPaid >= student.monthlyFee) return 'Paid';
  if (student.totalPaid > 0) return 'Partial';
  return 'Due';
}

async function ensureAdminUser() {
  const username = process.env.ADMIN_USERNAME || 'admin';
  const password = process.env.ADMIN_PASSWORD || 'admin123';
  const hash = await bcrypt.hash(password, 10);
  inMemoryUsers.set(username, { id: 1, username, password_hash: hash });
}

async function initializeDatabase() {
  try {
    await pool.query('SELECT 1');
    await pool.query(`CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(50) UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW())`);

    await pool.query(`CREATE TABLE IF NOT EXISTS students (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      class_name VARCHAR(50) NOT NULL,
      monthly_fee INTEGER NOT NULL,
      total_paid INTEGER NOT NULL DEFAULT 0,
      contact VARCHAR(50),
      created_at TIMESTAMP DEFAULT NOW())`);

    await pool.query(`CREATE TABLE IF NOT EXISTS payments (
      id SERIAL PRIMARY KEY,
      student_id INTEGER NOT NULL,
      amount INTEGER NOT NULL,
      payment_method VARCHAR(50) NOT NULL,
      payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      CONSTRAINT fk_student FOREIGN KEY(student_id) REFERENCES students(id) ON DELETE CASCADE) `);

    const adminUser = process.env.ADMIN_USERNAME || 'admin';
    const userCheck = await pool.query('SELECT * FROM users WHERE username = $1', [adminUser]);
    if (!userCheck.rows.length) {
      const hash = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'admin123', 10);
      await pool.query('INSERT INTO users (username, password_hash) VALUES ($1, $2)', [adminUser, hash]);
      console.log('Default admin user created in PostgreSQL');
    }

    const studentCheck = await pool.query('SELECT * FROM students LIMIT 1');
    if (!studentCheck.rows.length) {
      await pool.query(
        'INSERT INTO students (name, class_name, monthly_fee, total_paid, contact) VALUES ($1, $2, $3, $4, $5), ($6, $7, $8, $9, $10), ($11, $12, $13, $14, $15), ($16, $17, $18, $19, $20)',
        [
          'Nimali Perera', 'Grade 9', 2500, 2500, '077-1122334',
          'Kasun Silva', 'Grade 10', 3000, 1800, '071-9988776',
          'Aisha Rahman', 'Grade 8', 2200, 2200, '076-3344551',
          'Dinuka Fernando', 'Grade 11', 3500, 1000, '070-5566778',
        ]
      );
    }

    const paymentCheck = await pool.query('SELECT * FROM payments LIMIT 1');
    if (!paymentCheck.rows.length) {
      const studentRows = await pool.query('SELECT id, name FROM students ORDER BY id');
      const rows = studentRows.rows;
      const values = [
        [rows[0].id, 2500, 'Bank Transfer', '2026-09-28', ''],
        [rows[1].id, 1800, 'Cash', '2026-09-20', ''],
        [rows[2].id, 2200, 'Card', '2026-09-18', ''],
      ];
      for (const value of values) {
        await pool.query(
          'INSERT INTO payments (student_id, amount, payment_method, payment_date, notes) VALUES ($1, $2, $3, $4, $5)',
          value
        );
      }
    }

    console.log('PostgreSQL database initialized');
    return true;
  } catch (error) {
    usingInMemoryStore = true;
    console.warn('Database not available, using in-memory fallback store:', error.message);
    await ensureAdminUser();
    return false;
  }
}

async function findUserByUsername(username) {
  if (usingInMemoryStore) {
    return inMemoryUsers.get(username) || null;
  }

  const { rows } = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
  return rows[0] || null;
}

async function loginUser(username, password) {
  const user = await findUserByUsername(username);
  if (!user) return null;

  const passwordMatches = await bcrypt.compare(password, user.password_hash);
  if (!passwordMatches) return null;

  return {
    id: user.id,
    username: user.username,
  };
}

async function getStudentsFromStore() {
  if (usingInMemoryStore) {
    return inMemoryStudents.map((student) => ({ ...student, status: getStudentStatus(student) }));
  }

  const { rows } = await pool.query('SELECT * FROM students ORDER BY id');
  return rows.map((student) => ({
    id: student.id,
    name: student.name,
    className: student.class_name,
    monthlyFee: Number(student.monthly_fee),
    totalPaid: Number(student.total_paid),
    contact: student.contact,
    status: getStudentStatus({ monthlyFee: Number(student.monthly_fee), totalPaid: Number(student.total_paid) }),
  }));
}

async function createStudentRecord(payload) {
  const { name, className, monthlyFee, totalPaid = 0, contact = '' } = payload;

  if (!name || !className || !monthlyFee) {
    throw new Error('Student name, class, and monthly fee are required.');
  }

  if (usingInMemoryStore) {
    const nextId = inMemoryStudents.reduce((max, student) => Math.max(max, student.id), 0) + 1;
    const student = {
      id: nextId,
      name,
      className,
      monthlyFee: Number(monthlyFee),
      totalPaid: Number(totalPaid),
      contact,
    };
    inMemoryStudents.push(student);
    return { ...student, status: getStudentStatus(student) };
  }

  const { rows } = await pool.query(
    'INSERT INTO students (name, class_name, monthly_fee, total_paid, contact) VALUES ($1, $2, $3, $4, $5) RETURNING *',
    [name, className, Number(monthlyFee), Number(totalPaid), contact]
  );
  const student = rows[0];
  return {
    id: student.id,
    name: student.name,
    className: student.class_name,
    monthlyFee: Number(student.monthly_fee),
    totalPaid: Number(student.total_paid),
    contact: student.contact,
    status: getStudentStatus({ monthlyFee: Number(student.monthly_fee), totalPaid: Number(student.total_paid) }),
  };
}

async function getPaymentsFromStore() {
  if (usingInMemoryStore) {
    return inMemoryPayments.map((payment) => ({
      id: payment.id,
      studentId: payment.studentId,
      studentName: payment.studentName,
      amount: payment.amount,
      paymentMethod: payment.paymentMethod,
      paymentDate: payment.paymentDate,
      notes: payment.notes || '',
    }));
  }

  const { rows } = await pool.query(`
    SELECT p.id, p.student_id AS "studentId", s.name AS "studentName", p.amount, p.payment_method AS "paymentMethod", p.payment_date AS "paymentDate", p.notes
    FROM payments p
    JOIN students s ON s.id = p.student_id
    ORDER BY p.id DESC
  `);

  return rows.map((payment) => ({
    id: payment.id,
    studentId: payment.studentId,
    studentName: payment.studentName,
    amount: Number(payment.amount),
    paymentMethod: payment.paymentMethod,
    paymentDate: payment.paymentDate,
    notes: payment.notes || '',
  }));
}

async function createPaymentRecord(payload) {
  const { studentId, amount, paymentMethod = 'Cash', paymentDate = new Date().toISOString().slice(0, 10), notes = '' } = payload || {};

  if (!studentId || !amount) {
    throw new Error('Student and payment amount are required.');
  }

  if (usingInMemoryStore) {
    const student = inMemoryStudents.find((item) => item.id === Number(studentId));
    if (!student) throw new Error('Student not found.');

    const nextId = inMemoryPayments.reduce((max, payment) => Math.max(max, payment.id), 0) + 1;
    const payment = {
      id: nextId,
      studentId: Number(studentId),
      studentName: student.name,
      amount: Number(amount),
      paymentMethod,
      paymentDate,
      notes,
    };

    inMemoryPayments.unshift(payment);
    student.totalPaid = Number(student.totalPaid) + Number(amount);
    return payment;
  }

  const studentResult = await pool.query('SELECT id, name FROM students WHERE id = $1', [Number(studentId)]);
  const student = studentResult.rows[0];
  if (!student) throw new Error('Student not found.');

  const { rows } = await pool.query(
    'INSERT INTO payments (student_id, amount, payment_method, payment_date, notes) VALUES ($1, $2, $3, $4, $5) RETURNING *',
    [Number(studentId), Number(amount), paymentMethod, paymentDate, notes]
  );

  await pool.query('UPDATE students SET total_paid = total_paid + $1 WHERE id = $2', [Number(amount), Number(studentId)]);

  const payment = rows[0];
  return {
    id: payment.id,
    studentId: Number(payment.student_id),
    studentName: student.name,
    amount: Number(payment.amount),
    paymentMethod: payment.payment_method,
    paymentDate: payment.payment_date,
    notes: payment.notes || '',
  };
}

app.get('/api/health', (_req, res) => res.json({ status: 'ok', mode: usingInMemoryStore ? 'memory' : 'database' }));

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ message: 'Enter both username and password.' });
  }

  try {
    const user = await loginUser(username, password);
    if (!user) {
      return res.status(401).json({ message: 'Username or password is incorrect.' });
    }
    const token = jwt.sign({ id: user.id, username: user.username }, SECRET, { expiresIn: '8h' });
    res.json({ token, user: { id: user.id, username: user.username } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error. Try again shortly.' });
  }
});

app.get('/api/auth/me', auth, (req, res) => res.json({ user: req.user }));

app.get('/api/students', auth, async (_req, res) => {
  try {
    const students = await getStudentsFromStore();
    res.json({ students });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Could not load students.' });
  }
});

app.post('/api/students', auth, async (req, res) => {
  try {
    const student = await createStudentRecord(req.body || {});
    res.status(201).json({ student });
  } catch (error) {
    res.status(400).json({ message: error.message || 'Student could not be created.' });
  }
});

app.get('/api/summary', auth, async (_req, res) => {
  try {
    const students = await getStudentsFromStore();
    const totalFees = students.reduce((sum, student) => sum + Number(student.monthlyFee), 0);
    const totalPaid = students.reduce((sum, student) => sum + Number(student.totalPaid), 0);
    const dueCount = students.filter((student) => student.status !== 'Paid').length;
    const collectionRate = totalFees ? Math.round((totalPaid / totalFees) * 100) : 0;

    res.json({
      totalFees,
      totalPaid,
      dueCount,
      collectionRate,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Summary unavailable.' });
  }
});

app.get('/api/payments', auth, async (_req, res) => {
  try {
    const payments = await getPaymentsFromStore();
    res.json({ payments });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Could not load payments.' });
  }
});

app.post('/api/payments', auth, async (req, res) => {
  try {
    const payment = await createPaymentRecord(req.body || {});
    res.status(201).json({ payment });
  } catch (error) {
    res.status(400).json({ message: error.message || 'Payment could not be recorded.' });
  }
});

async function init() {
  await initializeDatabase();
  app.listen(process.env.PORT || 5000, () => console.log('API running on port', process.env.PORT || 5000));
}

init();
module.exports = app;
