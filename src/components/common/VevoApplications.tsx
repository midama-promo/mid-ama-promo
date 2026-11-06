import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';

export const VevoApplications: React.FC<{ admin?: boolean }> = ({ admin = false }) => {
  const [items, setItems] = useState<any[]>([]);
  const [artistName, setArtistName] = useState('');
  const [notes, setNotes] = useState('');
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const load = async () => { try { const r = await api.getVevoApplications(); setItems(r.applications || []); } catch (e:any) { setError(e.message || 'Could not load VEVO applications.'); } };
  useEffect(() => { void load(); }, []);
  const submit = async () => {
    setBusy(true); setError('');
    try { await api.submitVevoApplication({ artistName, notes }); setArtistName(''); setNotes(''); await load(); }
    catch (e:any) { setError(e.message || 'Could not submit application.'); }
    finally { setBusy(false); }
  };
  const decide = async (item: any, status: 'Approved'|'Rejected') => {
    setBusy(true); setError('');
    try { const r = await api.updateVevoApplication(item.id, { status, adminNote: adminNotes[item.id] }); setItems(prev => prev.map(x => x.id === item.id ? r.application : x)); }
    catch (e:any) { setError(e.message || 'Could not update application.'); }
    finally { setBusy(false); }
  };
  return <section className="mb-8 rounded-2xl border border-neutral-800 bg-neutral-900/70 p-5 sm:p-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[.22em] text-red-400">Video distribution</p><h2 className="mt-1 text-lg font-bold text-white">VEVO Channel Applications</h2><p className="mt-1 text-xs text-neutral-400">{admin ? 'Review incoming client requests and record your decision.' : 'Apply to have a VEVO channel created for your artist brand.'}</p></div><button onClick={() => void load()} className="rounded-lg border border-neutral-700 px-3 py-2 text-xs text-neutral-300">Refresh</button></div>
    {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
    {!admin && <div className="mt-5 grid gap-3 sm:grid-cols-2"><label className="text-xs text-neutral-300">Artist / channel name<input value={artistName} onChange={e=>setArtistName(e.target.value)} placeholder="Your artist name" className="mt-1 w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3 py-2.5 text-sm text-white"/></label><label className="text-xs text-neutral-300 sm:col-span-2">Additional information (optional)<textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={3} className="mt-1 w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3 py-2.5 text-sm text-white" placeholder="Tell us anything relevant to your VEVO channel application."/></label><div><button disabled={busy || !artistName.trim()} onClick={()=>void submit()} className="rounded-xl bg-red-600 px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50">Apply For A VEVO Channel</button></div></div>}
    <div className="mt-5 space-y-3">{items.length === 0 ? <p className="rounded-xl border border-neutral-800 bg-neutral-950/60 p-4 text-xs text-neutral-500">{admin ? 'No VEVO applications received yet.' : 'You have not submitted a VEVO channel application yet.'}</p> : items.map(item => <article key={item.id} className="rounded-xl border border-neutral-800 bg-neutral-950/70 p-4"><div className="flex flex-wrap items-center justify-between gap-2"><div><h3 className="text-sm font-bold text-white">{item.artistName}</h3><p className="mt-1 text-xs text-neutral-400">{item.clientName} · {item.email} · {new Date(item.createdAt).toLocaleString()}</p></div><span className={`rounded-full px-3 py-1 text-[10px] font-bold ${item.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-300' : item.status === 'Rejected' ? 'bg-red-500/10 text-red-300' : 'bg-amber-500/10 text-amber-300'}`}>{item.status}</span></div>{item.notes && <p className="mt-3 whitespace-pre-wrap text-xs text-neutral-300">{item.notes}</p>}{item.adminNote && <p className="mt-2 text-xs text-neutral-400">Admin note: {item.adminNote}</p>}{admin && item.status === 'Pending' && <div className="mt-3 flex flex-wrap gap-2"><input value={adminNotes[item.id] || ''} onChange={e=>setAdminNotes(p=>({...p,[item.id]:e.target.value}))} placeholder="Optional note to client" className="min-w-[220px] flex-1 rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-xs text-white"/><button disabled={busy} onClick={()=>void decide(item,'Approved')} className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold text-white">Approve</button><button disabled={busy} onClick={()=>void decide(item,'Rejected')} className="rounded-lg bg-red-700 px-3 py-2 text-xs font-bold text-white">Reject</button></div>}</article>)}</div>
  </section>;
};
