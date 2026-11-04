import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Eye, History, Mail, RefreshCw, Search, Send, ShieldCheck, Users } from 'lucide-react';
import { api, EmailCampaignHistoryItem, EmailCampaignRecipientView } from '../../services/api';

const DEFAULT_SUBJECT = 'Important: Mid-Ama Promo Dashboard Re-registration Required';
const DEFAULT_MESSAGE = `We are making changes to the Mid-Ama Promo client portal. To regain access to your dashboard, you are required to register again.

Please note that your previously distributed releases have NOT been removed from digital streaming platforms (DSPs). Your music remains available on the platforms where it was already distributed.

If you previously had a catalogue with Mid-Ama Promo, your existing catalogue records will gradually and automatically reappear in your dashboard as records are restored. This process may take some time.

You do NOT need to resubmit music that has already been distributed. Please do not create duplicate release submissions for music that is already live.

If you need assistance with re-registration or your account, contact Mid-Ama Promo Support at support@midamapromo.co.za.`;

export const ClientEmailCampaignManager: React.FC = () => {
  const [recipients, setRecipients] = useState<EmailCampaignRecipientView[]>([]);
  const [campaigns, setCampaigns] = useState<EmailCampaignHistoryItem[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [subject, setSubject] = useState(DEFAULT_SUBJECT);
  const [message, setMessage] = useState(DEFAULT_MESSAGE);
  const [search, setSearch] = useState('');
  const [preview, setPreview] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [recipientResult, campaignResult] = await Promise.all([
        api.getEmailCampaignRecipients(),
        api.getEmailCampaigns(),
      ]);
      setRecipients(recipientResult.recipients || []);
      setCampaigns(campaignResult.campaigns || []);
    } catch (error: any) {
      setNotice({ type: 'error', text: error?.message || 'Could not load campaign information.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filteredRecipients = useMemo(() => recipients.filter(r =>
    `${r.name} ${r.email} ${r.status}`.toLowerCase().includes(search.toLowerCase().trim())
  ), [recipients, search]);

  const allFilteredSelected = filteredRecipients.length > 0 && filteredRecipients.every(r => selected.includes(r.id));
  const toggleRecipient = (id: string) => setSelected(current => current.includes(id) ? current.filter(x => x !== id) : [...current, id]);
  const toggleAllFiltered = () => setSelected(current => allFilteredSelected
    ? current.filter(id => !filteredRecipients.some(r => r.id === id))
    : [...new Set([...current, ...filteredRecipients.map(r => r.id)])]);

  const sendTest = async () => {
    setNotice(null);
    if (!subject.trim() || !message.trim()) return setNotice({ type: 'error', text: 'Enter both a subject and a message first.' });
    try {
      setSending(true);
      const result = await api.sendEmailCampaignTest({ subject: subject.trim(), message: message.trim() });
      setNotice({ type: 'success', text: result.message });
    } catch (error: any) {
      setNotice({ type: 'error', text: error?.message || 'Test email failed.' });
    } finally { setSending(false); }
  };

  const sendCampaign = async () => {
    setNotice(null);
    if (!selected.length) return setNotice({ type: 'error', text: 'Select at least one client.' });
    if (!subject.trim() || !message.trim()) return setNotice({ type: 'error', text: 'Enter both a subject and a message first.' });
    const confirmed = window.confirm(`Send this announcement to ${selected.length} selected client(s)?\n\nThe message will be sent from Mid-Ama Promo <no-reply@midamapromo.co.za>. This action cannot be automatically undone.`);
    if (!confirmed) return;
    try {
      setSending(true);
      const result = await api.sendEmailCampaign({ subject: subject.trim(), message: message.trim(), recipientIds: selected });
      setNotice({ type: result.failed ? 'error' : 'success', text: result.message });
      setSelected([]);
      await load();
    } catch (error: any) {
      setNotice({ type: 'error', text: error?.message || 'Campaign could not be sent.' });
      await load();
    } finally { setSending(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-white font-['Space_Grotesk'] flex items-center gap-2"><Mail className="w-5 h-5 text-red-500" /> Client Email Campaign</h3>
          <p className="text-xs text-neutral-400 mt-1">Send private announcements to selected client accounts using the same verified sender as login codes.</p>
        </div>
        <button type="button" onClick={load} disabled={loading || sending} className="px-3 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-bold flex items-center gap-2 disabled:opacity-40"><RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh</button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4"><span className="text-[10px] uppercase tracking-wider text-neutral-500">Available clients</span><div className="text-2xl font-bold text-white mt-1">{recipients.length}</div></div>
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4"><span className="text-[10px] uppercase tracking-wider text-neutral-500">Selected recipients</span><div className="text-2xl font-bold text-red-400 mt-1">{selected.length}</div></div>
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4"><span className="text-[10px] uppercase tracking-wider text-neutral-500">Past campaigns</span><div className="text-2xl font-bold text-white mt-1">{campaigns.length}</div></div>
      </div>

      {notice && <div className={`rounded-xl border p-3 text-xs flex gap-2 items-start ${notice.type === 'success' ? 'border-emerald-800 bg-emerald-950/30 text-emerald-300' : 'border-red-800 bg-red-950/30 text-red-300'}`}>{notice.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}<span>{notice.text}</span></div>}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <section className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-4 space-y-3">
          <div className="flex items-center justify-between gap-2"><h4 className="text-sm font-bold text-white flex items-center gap-2"><Users className="w-4 h-4 text-red-400" /> Recipients</h4><span className="text-[11px] text-neutral-400">{selected.length} selected</span></div>
          <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search clients or email addresses" className="w-full bg-neutral-950 border border-neutral-800 rounded-lg pl-9 pr-3 py-2.5 text-xs text-white outline-none focus:border-red-700" /></div>
          <label className="flex items-center gap-2 rounded-lg bg-neutral-800/60 px-3 py-2 text-xs text-neutral-200 cursor-pointer"><input type="checkbox" checked={allFilteredSelected} onChange={toggleAllFiltered} className="accent-red-600" /> Select all {search ? 'matching' : 'clients'}</label>
          <div className="max-h-[360px] overflow-y-auto divide-y divide-neutral-800/70 border-y border-neutral-800">
            {loading ? <div className="p-8 text-center text-xs text-neutral-500">Loading client recipients...</div> : filteredRecipients.length === 0 ? <div className="p-8 text-center text-xs text-neutral-500">No matching clients found.</div> : filteredRecipients.map(r => (
              <label key={r.id} className="flex items-center gap-3 px-2 py-3 hover:bg-neutral-800/30 cursor-pointer">
                <input type="checkbox" checked={selected.includes(r.id)} onChange={() => toggleRecipient(r.id)} className="accent-red-600" />
                <span className="min-w-0 flex-1"><span className="block text-xs text-white truncate">{r.name}</span><span className="block text-[10px] text-neutral-500 truncate">{r.email}</span></span>
                <span className={`text-[9px] uppercase rounded px-1.5 py-1 ${r.status === 'active' ? 'text-emerald-400 bg-emerald-950/40' : r.status === 'disabled' ? 'text-red-300 bg-red-950/40' : 'text-amber-300 bg-amber-950/40'}`}>{r.status}</span>
              </label>
            ))}
          </div>
          <p className="text-[10px] text-neutral-500">Only client email addresses are shown here. Administrator accounts are excluded. Disabled and pending client accounts remain selectable for this important account announcement.</p>
        </section>

        <section className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-4 space-y-3">
          <h4 className="text-sm font-bold text-white flex items-center gap-2"><Mail className="w-4 h-4 text-red-400" /> Compose announcement</h4>
          <div className="rounded-lg border border-neutral-800 bg-neutral-950/70 p-3 flex items-center gap-2 text-[11px] text-neutral-300"><ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" /><span>From: <strong>Mid-Ama Promo &lt;no-reply@midamapromo.co.za&gt;</strong></span></div>
          <label className="block text-[10px] uppercase tracking-wider text-neutral-500">Email subject</label>
          <input value={subject} onChange={e => setSubject(e.target.value)} maxLength={200} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2.5 text-xs text-white outline-none focus:border-red-700" />
          <label className="block text-[10px] uppercase tracking-wider text-neutral-500">Message</label>
          <textarea value={message} onChange={e => setMessage(e.target.value)} rows={13} maxLength={20000} className="w-full resize-y bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-3 text-xs leading-relaxed text-white outline-none focus:border-red-700" />
          <div className="flex flex-wrap justify-between gap-2 text-[10px] text-neutral-500"><span>{message.length.toLocaleString()} / 20,000 characters</span><span>Same sender as OTP login emails</span></div>
          <div className="flex flex-wrap gap-2 pt-1">
            <button type="button" onClick={() => setPreview(v => !v)} className="px-3 py-2 rounded-lg border border-neutral-700 text-neutral-200 hover:bg-neutral-800 text-xs font-bold flex items-center gap-2"><Eye className="w-3.5 h-3.5" /> {preview ? 'Hide preview' : 'Preview email'}</button>
            <button type="button" onClick={sendTest} disabled={sending || loading} className="px-3 py-2 rounded-lg border border-neutral-700 text-neutral-200 hover:bg-neutral-800 text-xs font-bold disabled:opacity-40">{sending ? 'Sending...' : 'Send test to me'}</button>
            <button type="button" onClick={sendCampaign} disabled={sending || loading || selected.length === 0} className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold flex items-center gap-2 disabled:opacity-40"><Send className="w-3.5 h-3.5" /> {sending ? 'Sending campaign...' : `Send to ${selected.length} client(s)`}</button>
          </div>
          {preview && <div className="mt-2 rounded-xl overflow-hidden border border-neutral-700 bg-white text-neutral-900"><div className="bg-neutral-950 text-white border-b-4 border-red-600 p-4"><strong className="text-sm tracking-wide">MID-AMA PROMO</strong><div className="text-[10px] text-neutral-400">Music Distribution · Client Support</div></div><div className="p-5"><div className="text-[10px] text-neutral-500 mb-1">SUBJECT</div><div className="font-bold text-sm mb-5">{subject || '(No subject)'}</div><div className="text-xs whitespace-pre-wrap leading-relaxed">Hello [Client Name],{'\n\n'}{message}</div><div className="mt-6 text-xs">Kind regards,<br /><strong>Mid-Ama Promo Support</strong></div></div><div className="bg-neutral-100 p-4 text-[10px] text-neutral-500">Need assistance? support@midamapromo.co.za</div></div>}
        </section>
      </div>

      <section className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-4 space-y-3">
        <h4 className="text-sm font-bold text-white flex items-center gap-2"><History className="w-4 h-4 text-red-400" /> Campaign history</h4>
        {campaigns.length === 0 ? <p className="text-xs text-neutral-500 py-5 text-center">No announcement campaigns have been sent yet.</p> : <div className="space-y-2">{campaigns.map(c => {
          const sent = c.recipients.filter(r => r.status === 'sent').length;
          const failed = c.recipients.filter(r => r.status === 'failed').length;
          return <details key={c.id} className="rounded-xl border border-neutral-800 bg-neutral-950/50 p-3"><summary className="cursor-pointer list-none flex flex-col sm:flex-row sm:items-center justify-between gap-2"><span className="min-w-0"><strong className="block text-xs text-white truncate">{c.subject}</strong><span className="text-[10px] text-neutral-500">{new Date(c.createdAt).toLocaleString()} · {c.sender}</span></span><span className="flex items-center gap-2 text-[10px]"><span className="text-emerald-400">{sent} sent</span><span className="text-red-400">{failed} failed</span><span className="uppercase text-neutral-400">{c.status}</span></span></summary><div className="mt-3 pt-3 border-t border-neutral-800 space-y-1">{c.recipients.map(r => <div key={`${c.id}-${r.userId}`} className="flex justify-between gap-3 text-[10px]"><span className="text-neutral-300 truncate">{r.name} · {r.email}</span><span className={r.status === 'sent' ? 'text-emerald-400' : r.status === 'failed' ? 'text-red-400' : 'text-amber-300'}>{r.status}{r.error ? ` — ${r.error}` : ''}</span></div>)}</div></details>;
        })}</div>}
      </section>
    </div>
  );
};
