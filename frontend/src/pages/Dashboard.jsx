import { useEffect, useState } from 'react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const navItems = [
  { key: 'overview', label: 'Overview' },
  { key: 'students', label: 'Students' },
  { key: 'fees', label: 'Fee Collection' },
  { key: 'payments', label: 'Payments' },
  { key: 'reports', label: 'Reports' },
];

function StatCard({ label, value, hint, accent = 'gold' }) {
  return (
    <div className="card p-5">
      <div className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${accent === 'gold' ? 'bg-gold/15 text-gold' : 'bg-board/10 text-board'}`}>
        {label}
      </div>
      <div className="mt-4 text-3xl font-display font-extrabold text-ink">{value}</div>
      <p className="mt-2 text-sm text-ink/60">{hint}</p>
    </div>
  );
}

export default function Dashboard({ token, onLogout }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [students, setStudents] = useState([]);
  const [payments, setPayments] = useState([]);
  const [summary, setSummary] = useState({ totalFees: 0, totalPaid: 0, dueCount: 0, collectionRate: 0 });
  const [loading, setLoading] = useState(true);
  const [showStudentForm, setShowStudentForm] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [studentForm, setStudentForm] = useState({
    name: '',
    className: '',
    monthlyFee: '',
    totalPaid: '0',
    contact: '',
  });
  const [paymentForm, setPaymentForm] = useState({
    studentId: '',
    amount: '',
    paymentMethod: 'Cash',
    paymentDate: new Date().toISOString().slice(0, 10),
    notes: '',
  });
  const [submittingStudent, setSubmittingStudent] = useState(false);
  const [submittingPayment, setSubmittingPayment] = useState(false);

  const fetchDashboardData = async () => {
    try {
      const [studentsRes, summaryRes, paymentsRes] = await Promise.all([
        fetch(`${API}/api/students`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API}/api/summary`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API}/api/payments`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (!studentsRes.ok || !summaryRes.ok || !paymentsRes.ok) {
        throw new Error('Failed to load dashboard data.');
      }

      const studentsData = await studentsRes.json();
      const summaryData = await summaryRes.json();
      const paymentsData = await paymentsRes.json();
      setStudents(studentsData.students || []);
      setSummary(summaryData);
      setPayments(paymentsData.payments || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchDashboardData();
  }, [token]);

  const handleStudentInputChange = (event) => {
    const { name, value } = event.target;
    setStudentForm((current) => ({ ...current, [name]: value }));
  };

  const handlePaymentInputChange = (event) => {
    const { name, value } = event.target;
    setPaymentForm((current) => ({ ...current, [name]: value }));
  };

  const handleCreateStudent = async (event) => {
    event.preventDefault();
    setSubmittingStudent(true);

    try {
      const payload = {
        name: studentForm.name,
        className: studentForm.className,
        monthlyFee: Number(studentForm.monthlyFee),
        totalPaid: Number(studentForm.totalPaid || 0),
        contact: studentForm.contact,
      };

      const res = await fetch(`${API}/api/students`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Student could not be created.');

      setStudentForm({ name: '', className: '', monthlyFee: '', totalPaid: '0', contact: '' });
      setShowStudentForm(false);
      await fetchDashboardData();
      setActiveTab('students');
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmittingStudent(false);
    }
  };

  const handleCreatePayment = async (event) => {
    event.preventDefault();
    setSubmittingPayment(true);

    try {
      const payload = {
        studentId: Number(paymentForm.studentId),
        amount: Number(paymentForm.amount),
        paymentMethod: paymentForm.paymentMethod,
        paymentDate: paymentForm.paymentDate,
        notes: paymentForm.notes,
      };

      const res = await fetch(`${API}/api/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Payment could not be recorded.');

      setPaymentForm({
        studentId: '',
        amount: '',
        paymentMethod: 'Cash',
        paymentDate: new Date().toISOString().slice(0, 10),
        notes: '',
      });
      setShowPaymentForm(false);
      await fetchDashboardData();
      setActiveTab('overview');
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmittingPayment(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-ink">Loading dashboard...</div>;
  }

  return (
    <div className="min-h-screen bg-paper">
      <header className="bg-board text-chalk px-6 py-4 flex justify-between items-center shadow-sm">
        <div>
          <div className="font-display text-xl font-bold">Tutor Class Manager</div>
          <div className="text-xs text-chalk/60">Admin panel</div>
        </div>
        <button onClick={onLogout} className="rounded-md border border-chalk/40 px-3 py-1.5 text-sm hover:bg-chalk/10">
          Sign out
        </button>
      </header>

      <div className="flex flex-col lg:flex-row">
        <aside className="w-full lg:w-72 border-r border-ink/10 bg-white/60 p-5">
          <div className="mb-6">
            <p className="text-xs uppercase tracking-[.2em] text-ink/40">Navigation</p>
          </div>
          <nav className="space-y-2">
            {navItems.map((item) => (
              <button
                key={item.key}
                onClick={() => setActiveTab(item.key)}
                className={`w-full text-left rounded-xl px-4 py-3 font-medium transition ${
                  activeTab === item.key ? 'bg-board text-chalk shadow-md' : 'text-ink hover:bg-ink/5'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          <div className="mt-8 rounded-2xl bg-board p-4 text-chalk">
            <p className="text-xs uppercase tracking-[.2em] text-chalk/60">This month</p>
            <div className="mt-3 text-2xl font-display font-bold">LKR {summary.totalPaid.toLocaleString()}</div>
            <div className="mt-2 text-sm text-chalk/70">Collected from active students</div>
          </div>
        </aside>

        <main className="flex-1 p-6 md:p-8">
          {activeTab === 'overview' && (
            <>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                <div>
                  <p className="text-sm uppercase tracking-[.2em] text-ink/40">Overview</p>
                  <h1 className="font-display text-4xl font-extrabold text-ink">Fee dashboard</h1>
                </div>
                <button className="btn-primary" onClick={() => setShowStudentForm(true)}>+ Add Student</button>
              </div>

              <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <StatCard label="Total fees" value={`LKR ${summary.totalFees.toLocaleString()}`} hint="Across all students" />
                <StatCard label="Collected" value={`LKR ${summary.totalPaid.toLocaleString()}`} hint="This cycle" accent="board" />
                <StatCard label="Collection rate" value={`${summary.collectionRate}%`} hint="On-time completion" />
                <StatCard label="Pending" value={String(summary.dueCount)} hint="Students with due fees" accent="board" />
              </section>

              <section className="mt-8 grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
                <div className="card p-5">
                  <div className="flex items-center justify-between">
                    <h2 className="font-display text-2xl font-bold text-ink">Recent payments</h2>
                    <span className="text-sm text-ink/50">Last 3 records</span>
                  </div>

                  <div className="mt-5 space-y-4">
                    {payments.slice(0, 3).map((payment) => (
                      <div key={payment.id} className="flex items-center justify-between border-b border-ink/10 pb-3 last:border-0 last:pb-0">
                        <div>
                          <div className="font-semibold text-ink">{payment.studentName}</div>
                          <div className="text-sm text-ink/50">{payment.paymentMethod} · {payment.paymentDate}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-ink">LKR {Number(payment.amount).toLocaleString()}</div>
                          <div className="text-xs text-emerald-600">Approved</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="card p-5">
                  <h2 className="font-display text-2xl font-bold text-ink">Quick actions</h2>
                  <div className="mt-5 space-y-3">
                    <button className="action-btn w-full" onClick={() => setShowPaymentForm(true)}>Record payment</button>
                    <button className="action-btn secondary w-full" onClick={() => { setActiveTab('students'); setShowStudentForm(true); }}>Add new student</button>
                    <button className="action-btn secondary w-full" onClick={() => setActiveTab('reports')}>Generate report</button>
                  </div>
                </div>
              </section>
            </>
          )}

          {activeTab === 'students' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h1 className="font-display text-4xl font-extrabold text-ink">Students</h1>
                <button className="btn-primary" onClick={() => setShowStudentForm((current) => !current)}>+ New student</button>
              </div>

              {showStudentForm && (
                <form onSubmit={handleCreateStudent} className="card p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="font-display text-2xl font-bold text-ink">Add student</h2>
                    <button type="button" className="text-sm text-ink/60" onClick={() => setShowStudentForm(false)}>Close</button>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="field">
                      <span>Student name</span>
                      <input name="name" value={studentForm.name} onChange={handleStudentInputChange} placeholder="Nimal Perera" required />
                    </label>
                    <label className="field">
                      <span>Class</span>
                      <input name="className" value={studentForm.className} onChange={handleStudentInputChange} placeholder="Grade 10" required />
                    </label>
                    <label className="field">
                      <span>Monthly fee</span>
                      <input name="monthlyFee" type="number" value={studentForm.monthlyFee} onChange={handleStudentInputChange} placeholder="3000" required />
                    </label>
                    <label className="field">
                      <span>Paid amount</span>
                      <input name="totalPaid" type="number" value={studentForm.totalPaid} onChange={handleStudentInputChange} placeholder="0" />
                    </label>
                    <label className="field md:col-span-2">
                      <span>Contact</span>
                      <input name="contact" value={studentForm.contact} onChange={handleStudentInputChange} placeholder="077-1234567" />
                    </label>
                  </div>

                  <div className="flex justify-end gap-3">
                    <button type="button" className="action-btn secondary" onClick={() => setShowStudentForm(false)}>Cancel</button>
                    <button type="submit" className="btn-primary" disabled={submittingStudent}>
                      {submittingStudent ? 'Saving...' : 'Save student'}
                    </button>
                  </div>
                </form>
              )}

              <div className="card overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-ink/5 text-ink/70">
                    <tr>
                      <th className="p-4">Student</th>
                      <th className="p-4">Class</th>
                      <th className="p-4">Fees</th>
                      <th className="p-4">Paid</th>
                      <th className="p-4">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((student) => (
                      <tr key={student.id} className="border-t border-ink/10">
                        <td className="p-4">
                          <div className="font-semibold text-ink">{student.name}</div>
                          <div className="text-sm text-ink/50">{student.contact}</div>
                        </td>
                        <td className="p-4 text-ink/70">{student.className}</td>
                        <td className="p-4 text-ink/70">LKR {Number(student.monthlyFee).toLocaleString()}</td>
                        <td className="p-4 text-ink/70">LKR {Number(student.totalPaid).toLocaleString()}</td>
                        <td className="p-4">
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${student.status === 'Paid' ? 'bg-emerald-100 text-emerald-700' : student.status === 'Partial' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                            {student.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'fees' && (
            <div className="space-y-6">
              <h1 className="font-display text-4xl font-extrabold text-ink">Fee collection</h1>
              <div className="grid gap-6 md:grid-cols-3">
                <div className="card p-5">
                  <p className="text-sm uppercase tracking-[.2em] text-ink/40">Monthly target</p>
                  <div className="mt-3 text-3xl font-display font-bold text-ink">LKR {summary.totalFees.toLocaleString()}</div>
                </div>
                <div className="card p-5">
                  <p className="text-sm uppercase tracking-[.2em] text-ink/40">Collected</p>
                  <div className="mt-3 text-3xl font-display font-bold text-ink">LKR {summary.totalPaid.toLocaleString()}</div>
                </div>
                <div className="card p-5">
                  <p className="text-sm uppercase tracking-[.2em] text-ink/40">Balance</p>
                  <div className="mt-3 text-3xl font-display font-bold text-ink">LKR {(summary.totalFees - summary.totalPaid).toLocaleString()}</div>
                </div>
              </div>

              <div className="card p-5">
                <h2 className="font-display text-2xl font-bold text-ink">Due reminder list</h2>
                <div className="mt-5 space-y-3">
                  {students.filter((student) => student.status !== 'Paid').map((student) => (
                    <div key={student.id} className="flex items-center justify-between rounded-xl border border-ink/10 p-3">
                      <div>
                        <div className="font-medium text-ink">{student.name}</div>
                        <div className="text-sm text-ink/50">{student.className}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-ink">Due: LKR {(Number(student.monthlyFee) - Number(student.totalPaid)).toLocaleString()}</div>
                        <div className="text-xs text-ink/50">Reminder ready</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'payments' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h1 className="font-display text-4xl font-extrabold text-ink">Payments</h1>
                <button className="btn-primary" onClick={() => setShowPaymentForm((current) => !current)}>+ New payment</button>
              </div>

              {showPaymentForm && (
                <form onSubmit={handleCreatePayment} className="card p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="font-display text-2xl font-bold text-ink">Record payment</h2>
                    <button type="button" className="text-sm text-ink/60" onClick={() => setShowPaymentForm(false)}>Close</button>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="field">
                      <span>Student</span>
                      <select name="studentId" value={paymentForm.studentId} onChange={handlePaymentInputChange} required>
                        <option value="">Select student</option>
                        {students.map((student) => (
                          <option key={student.id} value={student.id}>{student.name}</option>
                        ))}
                      </select>
                    </label>
                    <label className="field">
                      <span>Amount</span>
                      <input name="amount" type="number" value={paymentForm.amount} onChange={handlePaymentInputChange} placeholder="1500" required />
                    </label>
                    <label className="field">
                      <span>Payment method</span>
                      <select name="paymentMethod" value={paymentForm.paymentMethod} onChange={handlePaymentInputChange}>
                        <option value="Cash">Cash</option>
                        <option value="Card">Card</option>
                        <option value="Bank Transfer">Bank Transfer</option>
                      </select>
                    </label>
                    <label className="field">
                      <span>Date</span>
                      <input name="paymentDate" type="date" value={paymentForm.paymentDate} onChange={handlePaymentInputChange} required />
                    </label>
                    <label className="field md:col-span-2">
                      <span>Notes</span>
                      <input name="notes" value={paymentForm.notes} onChange={handlePaymentInputChange} placeholder="Optional notes" />
                    </label>
                  </div>

                  <div className="flex justify-end gap-3">
                    <button type="button" className="action-btn secondary" onClick={() => setShowPaymentForm(false)}>Cancel</button>
                    <button type="submit" className="btn-primary" disabled={submittingPayment}>
                      {submittingPayment ? 'Saving...' : 'Save payment'}
                    </button>
                  </div>
                </form>
              )}

              <div className="card overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-ink/5 text-ink/70">
                    <tr>
                      <th className="p-4">Student</th>
                      <th className="p-4">Amount</th>
                      <th className="p-4">Method</th>
                      <th className="p-4">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((payment) => (
                      <tr key={payment.id} className="border-t border-ink/10">
                        <td className="p-4 font-medium text-ink">{payment.studentName}</td>
                        <td className="p-4 text-ink/70">LKR {Number(payment.amount).toLocaleString()}</td>
                        <td className="p-4 text-ink/70">{payment.paymentMethod}</td>
                        <td className="p-4 text-ink/70">{payment.paymentDate}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'reports' && (
            <div className="space-y-6">
              <h1 className="font-display text-4xl font-extrabold text-ink">Reports</h1>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="card p-5">
                  <p className="text-sm uppercase tracking-[.2em] text-ink/40">Summary</p>
                  <ul className="mt-4 space-y-3 text-ink/70">
                    <li>• {summary.collectionRate}% fees collected in this month</li>
                    <li>• {students.filter((student) => student.status === 'Paid').length} students have paid in full</li>
                    <li>• {summary.dueCount} students require follow-up</li>
                  </ul>
                </div>

                <div className="card p-5">
                  <p className="text-sm uppercase tracking-[.2em] text-ink/40">Export</p>
                  <div className="mt-4 space-y-3">
                    <button className="action-btn w-full">Export PDF</button>
                    <button className="action-btn secondary w-full">Download CSV</button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
