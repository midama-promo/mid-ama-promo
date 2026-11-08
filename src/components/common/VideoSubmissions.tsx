import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../../services/api';

type EligibleTrack = {
  releaseId: string;
  trackId: string;
  releaseRefNumber: string;
  releaseTitle: string;
  trackTitle: string;
  artistName: string;
  releaseDate: string;
};

const statusTone: Record<string, string> = {
  'Pending Review': 'text-amber-300 bg-amber-500/10',
  Approved: 'text-emerald-300 bg-emerald-500/10',
  'Corrections Required': 'text-orange-300 bg-orange-500/10',
  Rejected: 'text-red-300 bg-red-500/10',
  Delivered: 'text-sky-300 bg-sky-500/10',
};

export const VideoSubmissions: React.FC<{ admin?: boolean }> = ({ admin = false }) => {
  const [items, setItems] = useState<any[]>([]);
  const [eligibleTracks, setEligibleTracks] = useState<EligibleTrack[]>([]);
  const [selectedTrack, setSelectedTrack] = useState('');
  const [busy, setBusy] = useState(false);
  const [loadingTracks, setLoadingTracks] = useState(false);
  const [error, setError] = useState('');
  const [vevoStatus, setVevoStatus] = useState('Checking');
  const [director, setDirector] = useState('');
  const [language, setLanguage] = useState('');
  const [notes, setNotes] = useState('');
  const [explicit, setExplicit] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});

  const selected = useMemo(() => eligibleTracks.find(track => `${track.releaseId}:${track.trackId}` === selectedTrack), [eligibleTracks, selectedTrack]);

  const load = async () => {
    setError('');
    try {
      const response = await api.getVideoSubmissions();
      setItems(response.submissions || []);
      if (!admin) {
        const applications = await api.getVevoApplications();
        const apps = applications.applications || [];
        const status = apps.some((item: any) => item.status === 'Approved') ? 'Approved'
          : apps.some((item: any) => item.status === 'Pending') ? 'Pending'
          : apps.some((item: any) => item.status === 'Rejected') ? 'Rejected' : 'Not applied';
        setVevoStatus(status);
        if (status === 'Approved') {
          setLoadingTracks(true);
          try {
            const eligible = await api.getVideoEligibleTracks();
            setEligibleTracks(eligible.tracks || []);
          } finally {
            setLoadingTracks(false);
          }
        } else {
          setEligibleTracks([]);
          setSelectedTrack('');
        }
      }
    } catch (e: any) {
      setError(e.message || 'Could not load video submissions.');
    } finally {
      setLoadingTracks(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const submit = async () => {
    if (!selected) { setError('Select an eligible released track.'); return; }
    if (!file) { setError('Choose an MP4, MOV or M4V video file.'); return; }
    setBusy(true);
    setError('');
    try {
      const uploaded = await api.uploadVideo(file);
      await api.submitVideoSubmission({
        releaseId: selected.releaseId,
        trackId: selected.trackId,
        storedVideoFilename: uploaded.storedFilename,
        videoFilename: uploaded.filename,
        fileSize: uploaded.fileSize,
        director,
        language,
        notes,
        explicit,
      });
      setDirector(''); setLanguage(''); setNotes(''); setExplicit(false); setFile(null);
      const fileInput = document.getElementById('midama-video-file') as HTMLInputElement | null;
      if (fileInput) fileInput.value = '';
      await load();
    } catch (e: any) {
      setError(e.message || 'Video submission failed.');
    } finally {
      setBusy(false);
    }
  };

  const decide = async (item: any, status: 'Approved' | 'Corrections Required' | 'Rejected' | 'Delivered') => {
    setBusy(true); setError('');
    try {
      const response = await api.updateVideoSubmission(item.id, { status, adminNote: adminNotes[item.id] });
      setItems(previous => previous.map(entry => entry.id === item.id ? response.submission : entry));
    } catch (e: any) {
      setError(e.message || 'Could not update video submission.');
    } finally { setBusy(false); }
  };

  return <section className="mb-8 rounded-2xl border border-neutral-800 bg-neutral-900/70 p-5 sm:p-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[.22em] text-red-400">VEVO video distribution</p>
        <h2 className="mt-1 text-lg font-bold text-white">{admin ? 'Music Video Submissions' : 'Distribute Music Video'}</h2>
        <p className="mt-1 text-xs text-neutral-400">{admin ? 'Review each official video against its linked Mid-Ama release and track.' : 'Submit an official music video for a song already distributed through Mid-Ama Promo.'}</p>
      </div>
      <button onClick={() => void load()} className="rounded-lg border border-neutral-700 px-3 py-2 text-xs text-neutral-300">Refresh</button>
    </div>
    {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

    {!admin && vevoStatus !== 'Approved' && <p className="mt-5 rounded-xl border border-amber-800/50 bg-amber-950/20 p-4 text-xs text-amber-200">
      {vevoStatus === 'Pending' ? 'Your VEVO channel application is awaiting approval. Music video distribution unlocks once it is approved.'
        : vevoStatus === 'Rejected' ? 'Your VEVO channel application was rejected. Contact Mid-Ama Promo if you need assistance.'
        : 'Apply for a VEVO channel above. Music video distribution unlocks after your application is approved.'}
    </p>}

    {!admin && vevoStatus === 'Approved' && <div className="mt-5 grid gap-3 sm:grid-cols-2">
      <label className="text-xs text-neutral-300 sm:col-span-2">Select an eligible released song
        <select value={selectedTrack} onChange={event => setSelectedTrack(event.target.value)} disabled={loadingTracks || eligibleTracks.length === 0} className="mt-1 w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3 py-3 text-sm text-white disabled:opacity-60">
          <option value="">{loadingTracks ? 'Loading eligible songs…' : eligibleTracks.length ? 'Choose a song from your completed releases' : 'No eligible released songs found'}</option>
          {eligibleTracks.map(track => <option key={`${track.releaseId}:${track.trackId}`} value={`${track.releaseId}:${track.trackId}`}>{track.trackTitle} — {track.artistName} · {track.releaseRefNumber}</option>)}
        </select>
      </label>
      {selected && <div className="sm:col-span-2 rounded-xl border border-neutral-800 bg-neutral-950/70 p-4 text-xs text-neutral-300">
        <p><span className="text-neutral-500">Track:</span> <strong className="text-white">{selected.trackTitle}</strong></p>
        <p className="mt-1"><span className="text-neutral-500">Artist:</span> {selected.artistName}</p>
        <p className="mt-1"><span className="text-neutral-500">Release:</span> {selected.releaseTitle} ({selected.releaseRefNumber})</p>
        <p className="mt-1"><span className="text-neutral-500">Original release date:</span> {selected.releaseDate}</p>
      </div>}
      <label className="text-xs text-neutral-300">Director (optional)<input value={director} onChange={event => setDirector(event.target.value)} placeholder="Director name" className="mt-1 w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3 py-2.5 text-sm text-white" /></label>
      <label className="text-xs text-neutral-300">Video language (optional)<input value={language} onChange={event => setLanguage(event.target.value)} placeholder="e.g. isiZulu / English" className="mt-1 w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3 py-2.5 text-sm text-white" /></label>
      <label className="text-xs text-neutral-300 sm:col-span-2">Official music video master (MP4, MOV or M4V · maximum 500 MB)
        <input id="midama-video-file" type="file" accept=".mp4,.mov,.m4v,video/mp4,video/quicktime" onChange={event => setFile(event.target.files?.[0] || null)} className="mt-1 block w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3 py-2.5 text-xs text-white file:mr-3 file:rounded-lg file:border-0 file:bg-neutral-800 file:px-3 file:py-2 file:text-white" />
      </label>
      <label className="flex items-center gap-2 text-xs text-neutral-300 sm:col-span-2"><input type="checkbox" checked={explicit} onChange={event => setExplicit(event.target.checked)} /> This video contains explicit content</label>
      <label className="text-xs text-neutral-300 sm:col-span-2">Additional delivery notes<textarea value={notes} onChange={event => setNotes(event.target.value)} rows={3} placeholder="Credits or additional delivery instructions" className="mt-1 w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3 py-2.5 text-sm text-white" /></label>
      <div className="sm:col-span-2"><button disabled={busy || !selected || !file} onClick={() => void submit()} className="rounded-xl bg-red-600 px-5 py-3 text-xs font-bold text-white disabled:opacity-50">{busy ? 'Uploading and submitting…' : 'Submit Official Video For Review'}</button></div>
    </div>}

    <div className="mt-5 space-y-3">
      {items.length === 0 ? <p className="rounded-xl border border-neutral-800 bg-neutral-950/60 p-4 text-xs text-neutral-500">{admin ? 'No music video submissions received yet.' : 'Your video submissions and review statuses will appear here.'}</p>
        : items.map(item => <article key={item.id} className="rounded-xl border border-neutral-800 bg-neutral-950/70 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2"><div><h3 className="text-sm font-bold text-white">{item.releasedTrackTitle || item.videoTitle}</h3><p className="mt-1 text-xs text-neutral-400">{item.artistName} · {item.clientName} · {new Date(item.createdAt).toLocaleString()}</p></div><span className={`rounded-full px-3 py-1 text-[10px] font-bold ${statusTone[item.status] || statusTone['Pending Review']}`}>{item.status}</span></div>
          <div className="mt-2 space-y-1 text-xs text-neutral-400"><p>Release: <span className="text-neutral-200">{item.releaseTitle || 'Legacy submission'}{item.releaseRefNumber ? ` · ${item.releaseRefNumber}` : ''}</span></p><p>Track: <span className="text-neutral-200">{item.releasedTrackTitle || item.videoTitle}</span>{item.trackId ? ` · Track ID: ${item.trackId}` : ''}</p><p>Submitted by: {item.clientName} ({item.userEmail})</p><p>Video: {item.videoFilename} · {item.videoType || 'Official Music Video'}{item.director ? ` · Director: ${item.director}` : ''}{item.explicit ? ' · Explicit' : ''}</p></div>
          {item.notes && <p className="mt-2 whitespace-pre-wrap text-xs text-neutral-300">{item.notes}</p>}{item.adminNote && <p className="mt-2 text-xs text-neutral-400">Admin note: {item.adminNote}</p>}
          {admin && <div className="mt-3 flex flex-wrap gap-2"><a href={item.videoUrl} target="_blank" rel="noreferrer" className="rounded-lg border border-neutral-700 px-3 py-2 text-xs text-neutral-200">Open uploaded video</a><input value={adminNotes[item.id] ?? item.adminNote ?? ''} onChange={event => setAdminNotes(previous => ({ ...previous, [item.id]: event.target.value }))} placeholder="Optional note to client" className="min-w-[200px] flex-1 rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-xs text-white" /><button disabled={busy} onClick={() => void decide(item, 'Approved')} className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold text-white">Approve</button><button disabled={busy} onClick={() => void decide(item, 'Corrections Required')} className="rounded-lg bg-amber-700 px-3 py-2 text-xs font-bold text-white">Request changes</button><button disabled={busy} onClick={() => void decide(item, 'Rejected')} className="rounded-lg bg-red-700 px-3 py-2 text-xs font-bold text-white">Reject</button><button disabled={busy} onClick={() => void decide(item, 'Delivered')} className="rounded-lg bg-sky-700 px-3 py-2 text-xs font-bold text-white">Mark delivered</button></div>}
        </article>)}
    </div>
  </section>;
};
