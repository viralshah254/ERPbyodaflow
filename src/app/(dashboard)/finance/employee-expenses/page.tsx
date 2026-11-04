"use client";
import React, { useEffect, useState } from 'react';
import { PageLayout } from '@/components/layout/page-layout';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/api/client';
import { toast } from 'sonner';
type Claim = { _id: string; employeeName: string; category: string; description: string; amount: number; currency: string; status: string; settlementMethod: string; paymentRef?: string; payrollNet?: number };
type Account = { _id: string; name: string; code: string; type: string; posts?: boolean };
export default function EmployeeExpenses() {
  const [items, setItems] = useState<Claim[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selected, setSelected] = useState<Claim | null>(null);
  const [expense, setExpense] = useState('');
  const [payable, setPayable] = useState('');
  const [credit, setCredit] = useState('');
  const [reference, setReference] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function load() {
    try {
      const [claims, ledger] = await Promise.all([apiRequest<{ items: Claim[] }>('/api/finance/employee-expenses'), apiRequest<{ items: Account[] }>('/api/finance/accounts')]);
      setItems(claims.items); setAccounts(ledger.items.filter(row => row.posts !== false)); setError('');
    } catch (err) { setError((err as Error).message); }
  }
  useEffect(() => { void load(); }, []);
  async function submit() {
    if (!selected) return;
    setBusy(true);
    try {
      const posting = selected.status === 'APPROVED';
      await apiRequest(`/api/finance/employee-expenses/${encodeURIComponent(selected._id)}/${posting ? 'post' : selected.settlementMethod === 'PAYROLL' ? 'payroll-settle' : 'settle'}`, {
        method: 'POST', body: posting ? { expenseAccountId: expense, payableAccountId: payable, postingDate: date } : { creditAccountId: credit, paymentRef: reference, paymentDate: date },
      });
      setSelected(null); await load(); toast.success(posting ? 'Expense posted' : 'Settlement recorded');
    } catch (err) { toast.error((err as Error).message); }
    finally { setBusy(false); }
  }
  const accountSelect = (type: string, value: string, setter: (value: string) => void, label: string) => <label className="block">{label}<select className="block w-full rounded border bg-background p-2" value={value} onChange={event => setter(event.target.value)}><option value="">Choose account</option>{accounts.filter(row => row.type === type).map(row => <option key={row._id} value={row._id}>{row.code} · {row.name}</option>)}</select></label>;
  return <PageLayout title="Employee expenses" description="HR-approved claims, accounting postings and confirmed settlements.">
    {error && <p role="alert">{error} <button onClick={() => void load()}>Retry</button></p>}
    <div className="space-y-3">{items.map(claim => <div key={claim._id} className="rounded-xl border p-4 flex flex-wrap justify-between gap-3">
      <div><p className="font-semibold">{claim.employeeName} · {claim.currency} {claim.amount.toLocaleString()}</p><p>{claim.category} · {claim.description}</p><p className="text-sm text-muted-foreground">{claim.status} · {claim.settlementMethod}{claim.paymentRef ? ` · ${claim.paymentRef}` : ''}</p></div>
      {claim.status !== 'PAID' && <Button variant="outline" onClick={() => { setSelected(claim); setReference(''); }}>{claim.status === 'APPROVED' ? 'Post expense' : claim.settlementMethod === 'PAYROLL' ? 'Payroll settlement' : 'Record settlement'}</Button>}
    </div>)}{!items.length && !error && <p>No HR-approved expenses have arrived yet.</p>}</div>
    {selected && <section className="mt-6 max-w-xl rounded-xl border p-5 space-y-4"><h2 className="font-semibold">{selected.status === 'APPROVED' ? 'Post approved claim' : 'Record confirmed settlement'} · {selected.employeeName}</h2>
      {selected.status === 'APPROVED' ? <>{accountSelect('EXPENSE', expense, setExpense, 'Expense account')}{accountSelect('LIABILITY', payable, setPayable, 'Employee expense payable account')}</> : <>{accountSelect('ASSET', credit, setCredit, selected.settlementMethod === 'ADVANCE' ? 'Employee advance account' : 'Bank or cash account')}<label className="block">Confirmed payment reference<input className="block border rounded p-2 bg-background w-full" value={reference} onChange={event => setReference(event.target.value)} /></label><p className="text-sm">{selected.settlementMethod === 'PAYROLL' ? `This records the entire linked payroll payment of ${selected.currency} ${selected.payrollNet?.toLocaleString() ?? 'the full net amount'}, including all its reimbursement claims. Use the confirmed full payroll payment reference. ` : ''}Record a completed payment or advance reconciliation. This action records accounting evidence and does not transfer money.</p></>}
      <label className="block">Accounting date<input className="block border rounded p-2 bg-background" type="date" value={date} onChange={event => setDate(event.target.value)} /></label>
      <div className="flex gap-3"><Button disabled={busy} onClick={() => void submit()}>{busy ? 'Saving…' : 'Confirm'}</Button><Button variant="outline" onClick={() => setSelected(null)}>Cancel</Button></div>
    </section>}
  </PageLayout>;
}
