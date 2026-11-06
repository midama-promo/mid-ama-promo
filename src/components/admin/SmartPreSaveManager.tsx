import React, { useEffect, useState } from 'react';
import { ExternalLink, Link2, Loader2, Music2, Plus, RefreshCw, Trash2, Eye, EyeOff } from 'lucide-react';
import { api } from '../../services/api';

type DspLink = { label: string; url: string };
type SmartPage = { id: string; slug: string; title: string; artist: string; artworkUrl?: string; soundblastUrl: string; dspLinks: DspLink[]; active: boolean; createdAt: string };

export const SmartPreSaveManager: React.FC = () => {
  const [pages, setPages] = useState<SmartPage[]>([]);
  const [soundblastUrl, setSoundblastUrl] = useState('');
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [artworkUrl, setArtworkUrl] = useState('');
  const [dspText, setDspText] = useState('');
  const [previewed, setPreviewed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => { try { const result = await api.getSmartPreSaves(); setPages(result.pages || []); } catch (e:any) { setError(e.message || 'Could not load pre-save pages.'); } finally { setLoading(false); } };
  useEffect(() => { void load(); }, []);

  const preview = async () => {
    if (!soundblastUrl.trim()) return;
    setBusy(true); setError('');
    try {
      const result = await api.previewSmartPreSave(soundblastUrl.trim());
      const meta = result.metadata;
      setTitle(meta.title || title); setArtist(meta.artist || artist); setArtworkUrl(meta.artworkUrl || artworkUrl);
      if (meta.dspLinks?.length) setDspText(meta.dspLinks.map(x => `${x.label}|${x.url}`).join('\n'));
      setPreviewed(true);
      if (!meta.dspLinks?.length) setError('Track details were read, but no DSP destinations were automatically detected. Add the store links below before publishing.');
    } catch (e:any) { setError(e.message || 'Could not read the SoundBlast link. You can enter the track details and DSP links manually.'); setPreviewed(true); }
    finally { setBusy(false); }
  };

  const publish = async () => {
    const dspLinks = dspText.split('\n').map(line => { const i = line.indexOf('|'); return i < 0 ? null : { label: line.slice(0,i).trim(), url: line.slice(i+1).trim() }; }).filter((x): x is DspLink => !!x && !!x.label && !!x.url);
    if (!title.trim() || !soundblastUrl.trim() || !dspLinks.length) { setError('Add the source URL, track title and at least one DSP destination.'); return; }
    setBusy(true); setError('');
    try { const result = await api.createSmartPreSave({ soundblastUrl, title, artist, artworkUrl, dspLinks }); setPages(prev => [result.page, ...prev]); setSoundblastUrl(''); setTitle(''); setArtist(''); setArtworkUrl(''); setDspText(''); setPreviewed(false); }
    catch (e:any) { setError(e.message || 'Could not publish this page.'); }
    finally { setBusy(false); }
  };

  const toggle = async (page: SmartPage) => { try { const result = await api.updateSmartPreSave(page.id, { active: !page.active }); setPages(prev => prev.map(p => p.id === page.id ? result.page : p)); } catch (e:any) { setError(e.message || 'Could not update page.'); } };
  const remove = async (page: SmartPage) => { if (!window.confirm(`Delete /${page.slug}? This cannot be undone.`)) return; try { await api.deleteSmartPreSave(page.id); setPages(prev => prev.filter(p => p.id !== page.id)); } catch (e:any) { setError(e.message || 'Could not delete page.'); } };

  return <div className="space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-base font-bold text-white">Smart Pre-Save Pages</h3><p className="text-xs text-neutral-400 mt-1">Create branded Mid-Ama Promo landing pages from SoundBlast / Feature.fm or Shift Music Linkfire smartlinks.</p></div><button onClick={() => { setLoading(true); void load(); }} className="px-3 py-2 rounded-lg border border-neutral-700 text-neutral-300 text-xs flex items-center gap-2"><RefreshCw size={14}/> Refresh</button></div>
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-5 space-y-4">
      <div className="flex items-center gap-2 text-white font-semibold text-sm"><Plus size={17} className="text-red-500"/> Create a new pre-save page</div>
      <div><label className="block text-xs text-neutral-300 mb-1.5">SoundBlast / Feature.fm or Shift Music Linkfire URL</label><div className="flex flex-col sm:flex-row gap-2"><input value={soundblastUrl} onChange={e=>setSoundblastUrl(e.target.value)} placeholder="https://..." className="flex-1 min-w-0 bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2.5 text-xs text-white"/><button disabled={busy || !soundblastUrl.trim()} onClick={preview} className="px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-40 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-2">{busy ? <Loader2 size={14} className="animate-spin"/> : <Eye size={14}/>} Read link</button></div><p className="text-[10px] text-neutral-500 mt-1.5">The system attempts to read track details and DSP destinations from Feature.fm or Linkfire. If automatic detection is limited, enter the details and store links manually.</p></div>
      {previewed && <div className="grid sm:grid-cols-2 gap-3"><label className="text-xs text-neutral-300">Track title<input value={title} onChange={e=>setTitle(e.target.value)} className="mt-1 w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2.5 text-white"/></label><label className="text-xs text-neutral-300">Artist name<input value={artist} onChange={e=>setArtist(e.target.value)} placeholder="Artist" className="mt-1 w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2.5 text-white"/></label><label className="sm:col-span-2 text-xs text-neutral-300">Artwork image URL<input value={artworkUrl} onChange={e=>setArtworkUrl(e.target.value)} placeholder="https://..." className="mt-1 w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2.5 text-white"/></label><label className="sm:col-span-2 text-xs text-neutral-300">DSP destinations <span className="text-neutral-500">(one per line: Store name|https://store-link)</span><textarea rows={6} value={dspText} onChange={e=>setDspText(e.target.value)} placeholder={'Spotify|https://...\nApple Music|https://...'} className="mt-1 w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2.5 text-white font-mono text-[11px]"/></label><div className="sm:col-span-2 flex justify-end"><button disabled={busy} onClick={publish} className="px-5 py-2.5 bg-red-600 hover:bg-red-500 disabled:opacity-40 rounded-xl text-xs font-bold text-white flex items-center gap-2">{busy ? <Loader2 size={14} className="animate-spin"/> : <Link2 size={14}/>} Publish Mid-Ama Pre-Save</button></div></div>}
      {error && <p className="text-xs text-amber-300 bg-amber-950/30 border border-amber-900/50 rounded-lg p-3">{error}</p>}
    </div>
    <div className="space-y-3"><div className="flex items-center justify-between"><h4 className="text-sm font-bold text-white">Published pages</h4><span className="text-[10px] text-neutral-500">{pages.length} total</span></div>
      {loading ? <div className="text-xs text-neutral-500 py-8 text-center">Loading pages…</div> : pages.length === 0 ? <div className="border border-dashed border-neutral-800 rounded-xl p-8 text-center text-xs text-neutral-500">No smart pre-save pages yet.</div> : pages.map(page => <div key={page.id} className="flex flex-col sm:flex-row sm:items-center gap-3 border border-neutral-800 bg-neutral-950 rounded-xl p-4"><div className="w-12 h-12 rounded-lg bg-neutral-800 overflow-hidden shrink-0 flex items-center justify-center">{page.artworkUrl ? <img src={page.artworkUrl} alt="" className="w-full h-full object-cover"/> : <Music2 className="text-neutral-500"/>}</div><div className="min-w-0 flex-1"><div className="text-sm font-semibold text-white">{page.title}</div><div className="text-[11px] text-neutral-400">{page.artist || 'Artist not specified'} · {page.dspLinks.length} DSPs</div><a href={`/${page.slug}`} target="_blank" rel="noreferrer" className="text-[11px] text-red-400 hover:text-red-300 inline-flex items-center gap-1 mt-1">distro.midamapromo.co.za/{page.slug}<ExternalLink size={11}/></a></div><div className="flex gap-2"><button onClick={()=>toggle(page)} className="px-3 py-2 rounded-lg bg-neutral-800 text-neutral-300 text-xs flex items-center gap-1.5">{page.active ? <EyeOff size={13}/> : <Eye size={13}/>} {page.active ? 'Disable' : 'Enable'}</button><button onClick={()=>remove(page)} className="p-2 rounded-lg bg-neutral-800 text-neutral-400 hover:text-red-400" title="Delete page"><Trash2 size={14}/></button></div></div>)}
    </div>
  </div>;
};
