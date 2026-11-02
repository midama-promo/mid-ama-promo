import React, { useEffect, useState } from 'react';
import { X, Save, UploadCloud, Music2, Image as ImageIcon, Loader2 } from 'lucide-react';
import { User } from '../../types';
import { api } from '../../services/api';

interface CatalogueEntryModalProps {
  isOpen: boolean;
  clients: User[];
  entry?: any | null;
  initialClientId?: string;
  onClose: () => void;
  onSaved: (entry: any) => void;
}

const splitList = (value: string) => value.split(',').map(v => v.trim()).filter(Boolean);

export const CatalogueEntryModal: React.FC<CatalogueEntryModalProps> = ({
  isOpen, clients, entry, initialClientId, onClose, onSaved,
}) => {
  const [clientId, setClientId] = useState('');
  const [title, setTitle] = useState('');
  const [artistLabelName, setArtistLabelName] = useState('');
  const [primaryArtists, setPrimaryArtists] = useState('');
  const [featuredArtists, setFeaturedArtists] = useState('');
  const [releaseType, setReleaseType] = useState('Single');
  const [genre, setGenre] = useState('');
  const [subGenre, setSubGenre] = useState('');
  const [language, setLanguage] = useState('');
  const [composers, setComposers] = useState('');
  const [producers, setProducers] = useState('');
  const [isrc, setIsrc] = useState('');
  const [upc, setUpc] = useState('');
  const [catalogueReleaseDate, setCatalogueReleaseDate] = useState('');
  const [royaltyAmount, setRoyaltyAmount] = useState('0.00');
  const currentCopyright = `${new Date().getFullYear()} Mid-Ama Promo`;
  const [cLine] = useState(currentCopyright);
  const [pLine] = useState(currentCopyright);
  const [previousReleaseDetails, setPreviousReleaseDetails] = useState('');
  const [notes, setNotes] = useState('');
  const [distributionStatus, setDistributionStatus] = useState('Not Queued');
  const [distributionNote, setDistributionNote] = useState('');
  const [artwork, setArtwork] = useState<File | null>(null);
  const [track, setTrack] = useState<File | null>(null);
  const [document, setDocument] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    setClientId(entry?.userId || initialClientId || '');
    setTitle(entry?.title || entry?.release?.title || '');
    setArtistLabelName(entry?.artistLabelName || entry?.release?.artistLabelName || '');
    setPrimaryArtists((entry?.primaryArtists || entry?.release?.primaryArtists || []).join(', '));
    setFeaturedArtists((entry?.featuredArtists || entry?.release?.featuredArtists || []).join(', '));
    setReleaseType(entry?.releaseType || entry?.release?.releaseType || 'Single');
    setGenre(entry?.genre || entry?.release?.genre || '');
    setSubGenre(entry?.subGenre || entry?.release?.subGenre || '');
    setLanguage(entry?.language || entry?.release?.language || '');
    setComposers((entry?.composers || entry?.release?.composers || []).join(', '));
    setProducers((entry?.producers || entry?.release?.producers || []).join(', '));
    setIsrc(entry?.isrc || '');
    setUpc(entry?.upc || '');
    setCatalogueReleaseDate(entry?.catalogueReleaseDate || '');
    setRoyaltyAmount(Number(entry?.royaltyAmount || 0).toFixed(2));
    setPreviousReleaseDetails(entry?.previousReleaseDetails || entry?.release?.previousReleaseDetails || '');
    setNotes(entry?.notes || '');
    setDistributionStatus(entry?.distributionStatus || 'Not Queued');
    setDistributionNote(entry?.distributionNote || '');
    setArtwork(null);
    setTrack(null);
    setDocument(null);
  }, [isOpen, entry, initialClientId]);

  if (!isOpen) return null;

  const selectedClient = clients.find(c => c.id === clientId);

  const handleSave = async () => {
    try {
      setBusy(true);
      setError(null);
      if (!clientId) throw new Error('Select a registered client.');
      if (!title.trim()) throw new Error('Song title is required.');
      if (!primaryArtists.trim()) throw new Error('At least one artist name is required.');
      if (!catalogueReleaseDate) throw new Error('Original release date is required.');
      const normalizedRoyalty = Number(royaltyAmount);
      if (!Number.isFinite(normalizedRoyalty) || normalizedRoyalty < 0) throw new Error('Enter a valid royalty amount.');

      let artworkData: any = {};
      let trackData: any[] = [];
      let documentData: any[] = [];

      if (artwork) {
        setUploading('Uploading artwork...');
        const result = await api.uploadArtwork(artwork);
        artworkData = {
          artworkUrl: result.fileUrl,
          artworkFilename: result.filename,
          storedArtworkFilename: result.storedFilename,
          artworkDimensions: result.dimensions,
        };
      }
      if (track) {
        setUploading('Uploading master audio...');
        const result = await api.uploadAudio(track);
        trackData = [{
          trackNumber: 1,
          title: title.trim(),
          version: 'Original Mix',
          ...result,
          fileSize: result.fileSize,
          isrc: isrc.trim(),
          explicit: false,
        }];
      }
      if (document) {
        setUploading('Uploading supporting document...');
        const result = await api.uploadDocument(document);
        documentData = [{
          id: `doc_${Date.now()}`,
          title: document.name,
          filename: result.filename,
          storedFilename: result.storedFilename,
          fileUrl: result.fileUrl,
          fileSize: result.fileSize,
          uploadedAt: new Date().toISOString(),
        }];
      }

      setUploading('Saving catalogue record...');
      const payload: Record<string, any> = {
        userId: clientId,
        title: title.trim(),
        artistLabelName: artistLabelName.trim() || selectedClient?.name || '',
        primaryArtists: splitList(primaryArtists),
        featuredArtists: splitList(featuredArtists),
        releaseType,
        genre: genre.trim(),
        subGenre: subGenre.trim(),
        language: language.trim(),
        composers: splitList(composers),
        producers: splitList(producers),
        isrc: isrc.trim(),
        upc: upc.trim(),
        catalogueReleaseDate: catalogueReleaseDate || undefined,
        royaltyAmount: Math.round(normalizedRoyalty * 100) / 100,
        previouslyReleased: true,
        previousReleaseDetails: previousReleaseDetails.trim(),
        cLine: cLine.trim(),
        pLine: pLine.trim(),
        notes: notes.trim(),
        distributionStatus,
        distributionNote: distributionNote.trim(),
        ...(artwork ? artworkData : {}),
        ...(trackData.length ? { tracks: trackData } : {}),
        ...(documentData.length ? { documents: documentData } : {}),
      };

      const result = entry
        ? await api.updateCatalogueEntry(entry.id, payload)
        : await api.createCatalogueEntry(payload);
      onSaved(result.entry);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Could not save catalogue record.');
    } finally {
      setBusy(false);
      setUploading('');
    }
  };

  return (
    <div className="fixed inset-0 z-[80] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-4xl max-h-[92vh] overflow-y-auto bg-neutral-950 border border-neutral-800 rounded-3xl shadow-2xl">
        <div className="sticky top-0 z-10 bg-neutral-950/95 backdrop-blur border-b border-neutral-800 p-5 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">{entry ? 'Edit Catalogue Record' : 'Create Catalogue Record'}</h2>
            <p className="text-xs text-neutral-500 mt-1">Add a previously released song, its release date and royalty amount. Artwork and MP3 are optional.</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-900"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-5 sm:p-7 space-y-6">
          {error && <div className="p-3 rounded-xl bg-red-950/40 border border-red-800 text-xs text-red-300">{error}</div>}

          <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="space-y-2 md:col-span-2"><span className="label">Registered Client *</span>
              <select value={clientId} onChange={e => setClientId(e.target.value)} disabled={!!entry} className="field">
                <option value="">Select client...</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name} — {c.email}</option>)}
              </select>
            </label>
            <label className="space-y-2"><span className="label">Song / Release Title *</span><input value={title} onChange={e => setTitle(e.target.value)} className="field" /></label>
            <label className="space-y-2"><span className="label">Artist / Label Name</span><input value={artistLabelName} onChange={e => setArtistLabelName(e.target.value)} className="field" /></label>
            <label className="space-y-2"><span className="label">Primary Artist(s) *</span><input value={primaryArtists} onChange={e => setPrimaryArtists(e.target.value)} placeholder="Comma separated" className="field" /></label>
            <label className="space-y-2"><span className="label">Featured Artist(s)</span><input value={featuredArtists} onChange={e => setFeaturedArtists(e.target.value)} placeholder="Comma separated" className="field" /></label>
            <label className="space-y-2"><span className="label">Release Type</span><select value={releaseType} onChange={e => setReleaseType(e.target.value)} className="field"><option>Single</option><option>EP</option><option>Album</option></select></label>
            <label className="space-y-2"><span className="label">Original Release Date *</span><input required type="date" value={catalogueReleaseDate} onChange={e => setCatalogueReleaseDate(e.target.value)} className="field" /></label>
            <label className="space-y-2"><span className="label">Royalty Amount (ZAR) *</span><input required type="number" min="0" step="0.01" value={royaltyAmount} onChange={e => setRoyaltyAmount(e.target.value)} className="field" /></label>
            <label className="space-y-2"><span className="label">Genre (optional)</span><input value={genre} onChange={e => setGenre(e.target.value)} className="field" /></label>
            <label className="space-y-2"><span className="label">Sub-Genre</span><input value={subGenre} onChange={e => setSubGenre(e.target.value)} className="field" /></label>
            <label className="space-y-2"><span className="label">Language</span><input value={language} onChange={e => setLanguage(e.target.value)} className="field" /></label>
            <label className="space-y-2"><span className="label">ISRC</span><input value={isrc} onChange={e => setIsrc(e.target.value)} className="field" /></label>
            <label className="space-y-2"><span className="label">UPC / Barcode</span><input value={upc} onChange={e => setUpc(e.target.value)} className="field" /></label>
            <label className="space-y-2"><span className="label">Composer(s)</span><input value={composers} onChange={e => setComposers(e.target.value)} placeholder="Comma separated" className="field" /></label>
            <label className="space-y-2"><span className="label">Producer(s)</span><input value={producers} onChange={e => setProducers(e.target.value)} placeholder="Comma separated" className="field" /></label>
            <label className="space-y-2"><span className="label">C-Line (fixed)</span><input value={cLine} readOnly className="field opacity-80 cursor-not-allowed" /></label>
            <label className="space-y-2"><span className="label">P-Line (fixed)</span><input value={pLine} readOnly className="field opacity-80 cursor-not-allowed" /></label>
          </section>

          <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <label className="space-y-2"><span className="label">Cover Artwork (optional)</span><div className="filebox"><ImageIcon className="w-4 h-4" /><input type="file" accept="image/jpeg,image/png" onChange={e => setArtwork(e.target.files?.[0] || null)} />{artwork?.name || (entry?.artworkFilename ? `Current: ${entry.artworkFilename}` : 'Choose image')}</div></label>
            <label className="space-y-2"><span className="label">Master MP3 (optional)</span><div className="filebox"><Music2 className="w-4 h-4" /><input type="file" accept="audio/mpeg,audio/mp3,.mp3" onChange={e => setTrack(e.target.files?.[0] || null)} />{track?.name || (entry?.tracks?.[0]?.filename ? `Current: ${entry.tracks[0].filename}` : 'Choose MP3')}</div></label>
            <label className="space-y-2"><span className="label">Supporting Document</span><div className="filebox"><UploadCloud className="w-4 h-4" /><input type="file" accept=".pdf,.doc,.docx,.txt,.csv,.rtf" onChange={e => setDocument(e.target.files?.[0] || null)} />{document?.name || 'Optional document'}</div></label>
          </section>

          <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="space-y-2"><span className="label">Distribution Status</span><select value={distributionStatus} onChange={e => setDistributionStatus(e.target.value)} className="field"><option>Not Queued</option><option>Ready for SoundBlast</option><option>Submitted to SoundBlast</option><option>Distributed</option><option>Rejected</option></select></label>
            <label className="space-y-2"><span className="label">Distribution Note</span><input value={distributionNote} onChange={e => setDistributionNote(e.target.value)} className="field" /></label>
            <label className="space-y-2 md:col-span-2"><span className="label">Previous Release Details</span><textarea value={previousReleaseDetails} onChange={e => setPreviousReleaseDetails(e.target.value)} rows={3} className="field resize-y" placeholder="Original distributor, previous release date, catalogue number, etc." /></label>
            <label className="space-y-2 md:col-span-2"><span className="label">Internal Notes</span><textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} className="field resize-y" /></label>
          </section>

          <div className="flex items-center justify-between gap-4 pt-2">
            <span className="text-[11px] text-neutral-500">{uploading || 'Saved records remain in the server database and uploaded assets folder.'}</span>
            <div className="flex gap-2">
              <button onClick={onClose} disabled={busy} className="px-4 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-300 text-xs font-bold">Cancel</button>
              <button onClick={handleSave} disabled={busy} className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-2"><>{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}</> {entry ? 'Save Changes' : 'Create Catalogue Record'}</button>
            </div>
          </div>
        </div>
      </div>
      <style>{`.label{display:block;font-size:10px;text-transform:uppercase;letter-spacing:.08em;font-family:monospace;color:#737373}.field{width:100%;background:#0a0a0a;border:1px solid #262626;border-radius:.75rem;padding:.65rem .8rem;color:#f5f5f5;font-size:.8rem;outline:none}.field:focus{border-color:#dc2626}.filebox{min-height:44px;display:flex;align-items:center;gap:.5rem;background:#0a0a0a;border:1px dashed #404040;border-radius:.75rem;padding:.6rem .75rem;color:#a3a3a3;font-size:.72rem;overflow:hidden}.filebox input{width:100%;font-size:.68rem}`}</style>
    </div>
  );
};
