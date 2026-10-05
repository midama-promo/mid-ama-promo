import React, { useState, useEffect } from 'react';
import {
  Shield,
  Disc,
  Users,
  MessageSquare,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Search,
  Filter,
  LogOut,
  UserPlus,
  Send,
  Copy,
  Check,
  ExternalLink,
  ChevronRight,
  Eye,
  Sliders,
  Mail,
  Bell,
  Download,
  XCircle,
  RotateCcw,
  FolderOpen,
  FileCheck,
  Archive,
  UploadCloud,
  Plus,
  Link2,
  Trash2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Release, User, Enquiry, AdminStats, ReleaseStatus } from '../../types';
import { api } from '../../services/api';
import { Logo } from '../common/Logo';
import { CatalogueEntryModal } from './CatalogueEntryModal';

interface AdminDashboardProps {
  onSelectRelease: (release: Release) => void;
  onOpenSharePage: (refNumber: string) => void;
  onOpenNotifications: () => void;
  onGoHome: () => void;
  onStatusUpdated?: (updated: Release) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onSelectRelease,
  onOpenSharePage,
  onOpenNotifications,
  onGoHome,
  onStatusUpdated,
}) => {
  const { user, logout, accessClientAccount } = useAuth();
  const [accessingClientId, setAccessingClientId] = useState<string | null>(null);
  
  const [activeTab, setActiveTab] = useState<'releases' | 'clients' | 'enquiries' | 'catalogue' | 'settings'>('releases');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [releases, setReleases] = useState<Release[]>([]);
  const [clients, setClients] = useState<User[]>([]);
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [catalogueEntries, setCatalogueEntries] = useState<any[]>([]);
  const [catalogueClientId, setCatalogueClientId] = useState('');
  const [catalogueReleaseId, setCatalogueReleaseId] = useState('');
  const [catalogueBusy, setCatalogueBusy] = useState(false);
  const [catalogueModalOpen, setCatalogueModalOpen] = useState(false);
  const [editingCatalogueEntry, setEditingCatalogueEntry] = useState<any | null>(null);
  const [backupBusy, setBackupBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selected client to view their specific releases
  const [selectedClientForView, setSelectedClientForView] = useState<User | null>(null);

  // Filter & Search states
  const [releaseSearch, setReleaseSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');

  // Manual Client Registration modal
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [regName, setRegName] = useState('');
  const [regFirstName, setRegFirstName] = useState('');
  const [regSurname, setRegSurname] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regCountry, setRegCountry] = useState('South Africa');
  const [regSubmitting, setRegSubmitting] = useState(false);
  const [copiedInstructions, setCopiedInstructions] = useState(false);
  const [regSuccessResult, setRegSuccessResult] = useState<{ client: User } | null>(null);
  const [editingClient, setEditingClient] = useState<User | null>(null);
  const [editFirstName, setEditFirstName] = useState('');
  const [editSurname, setEditSurname] = useState('');
  const [editArtistName, setEditArtistName] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  // Asset download state
  const [downloadingArtworkId, setDownloadingArtworkId] = useState<string | null>(null);
  const [preSaveRelease, setPreSaveRelease] = useState<Release | null>(null);
  const [preSaveLabel, setPreSaveLabel] = useState('Pre-save');
  const [preSaveUrl, setPreSaveUrl] = useState('');
  const [preSaveSaving, setPreSaveSaving] = useState(false);

  const handleReleaseStatusUpdated = (updated: Release) => {
    setReleases(prev => prev.map(r => r.id === updated.id ? updated : r));
    if (preSaveRelease?.id === updated.id) setPreSaveRelease(updated);
    if (onStatusUpdated) onStatusUpdated(updated);
  };

  const openPreSaveManager = (rel: Release) => {
    setPreSaveRelease(rel);
    setPreSaveLabel('Pre-save');
    setPreSaveUrl('');
  };

  const handleAddPreSaveLink = async () => {
    if (!preSaveRelease || !preSaveUrl.trim()) return;
    try {
      setPreSaveSaving(true);
      const existingLinks = preSaveRelease.preSaveLinks || [];
      const result = await api.updatePreSaveLinks(preSaveRelease.id, [
        ...existingLinks,
        { label: preSaveLabel.trim() || 'Pre-save', url: preSaveUrl.trim() },
      ]);
      setReleases(prev => prev.map(r => r.id === result.release.id ? result.release : r));
      setPreSaveRelease(result.release);
      setPreSaveUrl('');
      setPreSaveLabel('Pre-save');
    } catch (err: any) {
      alert(err.message || 'Could not save the pre-save link.');
    } finally {
      setPreSaveSaving(false);
    }
  };

  const handleRemovePreSaveLink = async (linkId: string) => {
    if (!preSaveRelease) return;
    try {
      setPreSaveSaving(true);
      const nextLinks = (preSaveRelease.preSaveLinks || []).filter(link => link.id !== linkId);
      const result = await api.updatePreSaveLinks(preSaveRelease.id, nextLinks);
      setReleases(prev => prev.map(r => r.id === result.release.id ? result.release : r));
      setPreSaveRelease(result.release);
    } catch (err: any) {
      alert(err.message || 'Could not remove the pre-save link.');
    } finally {
      setPreSaveSaving(false);
    }
  };

  const handleDownloadArtwork = async (rel: Release) => {
    try {
      setDownloadingArtworkId(rel.id);
      await api.downloadAsset(rel.id, 'artwork', undefined, rel.artworkFilename);
    } catch (err: any) {
      alert(err.message || 'Failed to download artwork.');
    } finally {
      setDownloadingArtworkId(null);
    }
  };

  const handleAddExistingRelease = async () => {
    if (!catalogueClientId || !catalogueReleaseId) return;
    try {
      setCatalogueBusy(true);
      await api.addExistingReleaseToCatalogue(catalogueClientId, catalogueReleaseId);
      setCatalogueReleaseId('');
      const res = await api.getAdminCatalogue();
      setCatalogueEntries(res.entries);
      alert('Existing release added to the client catalogue. The original client ID, release ID and metadata were preserved.');
    } catch (err: any) {
      alert(err.message || 'Could not add the existing release.');
    } finally {
      setCatalogueBusy(false);
    }
  };

  const handleCatalogueSaved = (savedEntry: any) => {
    setCatalogueEntries(prev => {
      const exists = prev.some(x => x.id === savedEntry.id);
      return exists ? prev.map(x => x.id === savedEntry.id ? { ...x, ...savedEntry } : x) : [savedEntry, ...prev];
    });
    setEditingCatalogueEntry(null);
  };

  const openCreateCatalogue = () => {
    setEditingCatalogueEntry(null);
    setCatalogueModalOpen(true);
  };

  const openEditCatalogue = (entry: any) => {
    setEditingCatalogueEntry(entry);
    setCatalogueModalOpen(true);
  };

  const handleExportBackup = async () => {
    try {
      setBackupBusy(true);
      const blob = await api.exportAdminBackup();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mid-ama-promo-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err.message || 'Backup export failed.');
    } finally {
      setBackupBusy(false);
    }
  };

  const handleImportBackup = async (file: File) => {
    if (!window.confirm('Import this backup additively? Existing records and files will never be overwritten or deleted.')) return;
    try {
      setBackupBusy(true);
      const result = await api.importAdminBackup(file);
      alert(`Backup restored safely. Added ${result.usersAdded} users, ${result.releasesAdded} releases, ${result.catalogueAdded} catalogue entries and ${result.assetsRestored} files. Existing data was preserved.`);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Backup import failed.');
    } finally {
      setBackupBusy(false);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [statsRes, relRes, cliRes, enqRes, catRes] = await Promise.all([
        api.getAdminStats(),
        api.getReleases(),
        api.getAdminClients(),
        api.getAdminEnquiries(),
        api.getAdminCatalogue(),
      ]);

      setStats(statsRes.stats);
      setReleases(relRes.releases);
      setClients(cliRes.clients);
      setEnquiries(enqRes.enquiries);
      setCatalogueEntries(catRes.entries);
    } catch (err: any) {
      setError(err.message || 'Failed to load administrative data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const handleStatusUpdated = (e: Event) => {
      const updated = (e as CustomEvent<Release>).detail;
      if (updated?.id) setReleases(prev => prev.map(r => r.id === updated.id ? updated : r));
    };
    window.addEventListener('midama:release-status-updated', handleStatusUpdated);
    return () => window.removeEventListener('midama:release-status-updated', handleStatusUpdated);
  }, []);

  const handleToggleClientStatus = async (client: User) => {
    try {
      const nextStatus = client.status === 'disabled' ? 'active' : 'disabled';
      const res = await api.updateClient(client.id, { status: nextStatus });
      setClients(clients.map(c => c.id === client.id ? res.client : c));
    } catch (err: any) {
      alert(err.message || 'Failed to update client status.');
    }
  };

  const handleAccessClientAccount = async (client: User) => {
    try {
      setAccessingClientId(client.id);
      await accessClientAccount(client.id);
    } catch (err: any) {
      alert(err.message || 'Could not access client account.');
    } finally {
      setAccessingClientId(null);
    }
  };

  const handleManualRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regEmail.trim() || !regName.trim()) return;

    try {
      setRegSubmitting(true);
      const res = await api.registerClient({
        email: regEmail.trim(),
        name: regName.trim(),
        realFirstName: regFirstName.trim() || undefined,
        realSurname: regSurname.trim() || undefined,
        phone: regPhone.trim() || undefined,
        country: regCountry.trim() || 'South Africa',
      });

      setRegSuccessResult({
        client: res.client,
      });

      setClients([res.client, ...clients]);
      setRegName('');
      setRegFirstName('');
      setRegSurname('');
      setRegEmail('');
      setRegPhone('');
    } catch (err: any) {
      alert(err.message || 'Failed to register client.');
    } finally {
      setRegSubmitting(false);
    }
  };

  const openEditClient = (client: User) => {
    setEditingClient(client);
    setEditFirstName(client.realFirstName || '');
    setEditSurname(client.realSurname || '');
    setEditArtistName(client.artistName || client.name || '');
  };

  const saveClientDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClient) return;
    if (!editFirstName.trim() || !editSurname.trim() || !editArtistName.trim()) {
      alert('First name, surname, and artist / label name are required.');
      return;
    }
    try {
      setEditSaving(true);
      const res = await api.updateClient(editingClient.id, {
        realFirstName: editFirstName.trim(),
        realSurname: editSurname.trim(),
        artistName: editArtistName.trim(),
        name: editArtistName.trim(),
      });
      setClients(prev => prev.map(c => c.id === res.client.id ? { ...c, ...res.client } : c));
      if (selectedClientForView?.id === res.client.id) setSelectedClientForView(prev => prev ? { ...prev, ...res.client } : prev);
      setEditingClient(null);
    } catch (err: any) {
      alert(err.message || 'Could not update client details.');
    } finally {
      setEditSaving(false);
    }
  };

  const getStatusBadge = (status: ReleaseStatus) => {
    switch (status) {
      case 'Pending Review':
        return 'text-amber-400 bg-amber-950/40 border-amber-800/80';
      case 'Approved':
        return 'text-emerald-400 bg-emerald-950/40 border-emerald-800/80';
      case 'Denied':
        return 'text-red-400 bg-red-950/40 border-red-800/80';
      case 'Corrections Required':
        return 'text-orange-400 bg-orange-950/40 border-orange-800/80';
      case 'Takedown Requested':
        return 'text-amber-300 bg-amber-950/40 border-amber-700/80';
      case 'Takedown Processing':
        return 'text-orange-300 bg-orange-950/40 border-orange-700/80';
      case 'Takedown Completed':
        return 'text-blue-300 bg-blue-950/40 border-blue-700/80';
      default:
        return 'text-neutral-300 bg-neutral-900 border-neutral-800';
    }
  };

  const filteredReleases = releases.filter((r) => {
    if (selectedClientForView && r.userId !== selectedClientForView.id) {
      return false;
    }

    const matchesSearch =
      r.title.toLowerCase().includes(releaseSearch.toLowerCase()) ||
      r.refNumber.toLowerCase().includes(releaseSearch.toLowerCase()) ||
      r.artistLabelName.toLowerCase().includes(releaseSearch.toLowerCase()) ||
      r.primaryArtists.some(a => a.toLowerCase().includes(releaseSearch.toLowerCase()));

    const matchesStatus = statusFilter === 'All' || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 pb-20">
      
      {/* Top Admin Header Bar */}
      <header className="sticky top-0 z-30 bg-neutral-950/95 backdrop-blur-md border-b border-neutral-800/80 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between h-20">
          <div className="flex items-center gap-3">
            <Logo size="md" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} />
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-red-950/60 border border-red-800 text-red-400 text-xs font-mono font-bold">
              <Shield className="w-3.5 h-3.5" />
              <span>ADMINISTRATOR DESK</span>
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={onGoHome}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 hover:text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              title="View Public Homepage"
            >
              <Eye className="w-3.5 h-3.5 text-neutral-400" />
              <span className="hidden md:inline">View Public Site</span>
            </button>

            <button
              onClick={onOpenNotifications}
              className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-900 rounded-xl transition-colors relative cursor-pointer"
              title="Audit & Notifications"
            >
              <Bell className="w-5 h-5" />
            </button>

            <button
              onClick={() => {
                setIsRegisterModalOpen(true);
                setRegSuccessResult(null);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-red-600 hover:bg-red-500 active:scale-95 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span className="hidden sm:inline">Register New Client</span>
              <span className="sm:hidden">New Client</span>
            </button>

            <button
              onClick={logout}
              className="p-2 text-neutral-400 hover:text-red-400 hover:bg-neutral-900 rounded-xl transition-colors cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        
        {/* Real Metrics Row as required by Requirement 6 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          <div className="p-4 bg-neutral-900/60 border border-neutral-800 rounded-xl space-y-1">
            <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider block truncate">Total Clients</span>
            <span className="text-2xl font-bold text-white font-['Space_Grotesk']">{clients.length}</span>
          </div>

          <div className="p-4 bg-neutral-900/60 border border-neutral-800 rounded-xl space-y-1">
            <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider block truncate">Active Clients</span>
            <span className="text-2xl font-bold text-emerald-400 font-['Space_Grotesk']">
              {clients.filter(c => c.status === 'active').length}
            </span>
          </div>

          <div className="p-4 bg-neutral-900/60 border border-neutral-800 rounded-xl space-y-1">
            <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider block truncate">Total Submissions</span>
            <span className="text-2xl font-bold text-white font-['Space_Grotesk']">{releases.length}</span>
          </div>

          <div className="p-4 bg-amber-950/20 border border-amber-900/50 rounded-xl space-y-1">
            <span className="text-[10px] font-mono text-amber-400 uppercase tracking-wider block truncate">Under Review</span>
            <span className="text-2xl font-bold text-amber-400 font-['Space_Grotesk']">
              {releases.filter(r => r.status === 'Pending Review').length}
            </span>
          </div>

          <div className="p-4 bg-orange-950/20 border border-orange-900/50 rounded-xl space-y-1">
            <span className="text-[10px] font-mono text-orange-400 uppercase tracking-wider block truncate">Corrections Required</span>
            <span className="text-2xl font-bold text-orange-400 font-['Space_Grotesk']">
              {releases.filter(r => r.status === 'Corrections Required').length}
            </span>
          </div>

          <div className="p-4 bg-emerald-950/20 border border-emerald-900/50 rounded-xl space-y-1">
            <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider block truncate">Approved</span>
            <span className="text-2xl font-bold text-emerald-400 font-['Space_Grotesk']">
              {releases.filter(r => r.status === 'Approved').length}
            </span>
          </div>

          <div className="p-4 bg-blue-950/20 border border-blue-900/50 rounded-xl space-y-1 col-span-2 sm:col-span-1">
            <span className="text-[10px] font-mono text-blue-400 uppercase tracking-wider block truncate">Completed</span>
            <span className="text-2xl font-bold text-blue-400 font-['Space_Grotesk']">
              {releases.filter(r => r.status === 'Completed').length}
            </span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-neutral-800 gap-6 text-sm font-semibold">
          <button
            onClick={() => {
              setActiveTab('releases');
              setSelectedClientForView(null);
            }}
            className={`pb-3 border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'releases' ? 'border-red-600 text-white font-bold' : 'border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            <Disc className="w-4 h-4 text-red-500" />
            <span>Releases Management ({releases.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('clients')}
            className={`pb-3 border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'clients' ? 'border-red-600 text-white font-bold' : 'border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4 text-red-500" />
            <span>Clients & Artists ({clients.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('enquiries')}
            className={`pb-3 border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'enquiries' ? 'border-red-600 text-white font-bold' : 'border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            <MessageSquare className="w-4 h-4 text-red-500" />
            <span>Enquiries Desk ({enquiries.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('catalogue')}
            className={`pb-3 border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'catalogue' ? 'border-red-600 text-white font-bold' : 'border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            <FolderOpen className="w-4 h-4 text-red-500" />
            <span>Catalogue ({catalogueEntries.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`pb-3 border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'settings' ? 'border-red-600 text-white font-bold' : 'border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            <Archive className="w-4 h-4 text-red-500" />
            <span>Settings</span>
          </button>
        </div>

        {/* TAB: CATALOGUE */}
        {activeTab === 'catalogue' && (
          <div className="space-y-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-white font-['Space_Grotesk']">Client Catalogue</h3>
                <p className="text-xs text-neutral-400">Create permanent catalogue records for songs released before this website, or attach an existing portal release.</p>
              </div>
              <button onClick={openCreateCatalogue} className="px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold flex items-center gap-2">
                <Plus className="w-4 h-4" /> Create Catalogue Record
              </button>
            </div>

            <div className="p-5 bg-neutral-900/60 border border-neutral-800 rounded-2xl space-y-4">
              <div className="flex items-center gap-2 text-sm font-bold text-white"><FolderOpen className="w-4 h-4 text-red-500" /> Existing Portal Releases</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <select value={catalogueClientId} onChange={e => { setCatalogueClientId(e.target.value); setCatalogueReleaseId(''); }} className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2.5 text-sm text-white">
                  <option value="">Select customer...</option>{clients.map(c => <option key={c.id} value={c.id}>{c.name} — {c.email}</option>)}
                </select>
                <select value={catalogueReleaseId} onChange={e => setCatalogueReleaseId(e.target.value)} disabled={!catalogueClientId} className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2.5 text-sm text-white disabled:opacity-40">
                  <option value="">Select release...</option>{releases.filter(r => r.userId === catalogueClientId).map(r => <option key={r.id} value={r.id}>{r.refNumber} — {r.title}</option>)}
                </select>
              </div>
              <button onClick={handleAddExistingRelease} disabled={!catalogueClientId || !catalogueReleaseId || catalogueBusy} className="px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-40 text-white rounded-xl text-xs font-bold">
                {catalogueBusy ? 'Adding...' : 'Add Existing Release to Catalogue'}
              </button>
            </div>

            <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl overflow-hidden">
              {catalogueEntries.length === 0 ? <div className="p-10 text-center text-xs text-neutral-500">No catalogue entries yet. Create the first legacy catalogue record above.</div> : <div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead className="bg-neutral-900 border-b border-neutral-800 text-neutral-400 font-mono uppercase text-[10px]"><tr><th className="p-3">Song</th><th className="p-3">Client</th><th className="p-3">Identifiers</th><th className="p-3">Original Release</th><th className="p-3">Distribution</th><th className="p-3 text-right">Actions</th></tr></thead><tbody className="divide-y divide-neutral-800/60">{catalogueEntries.map(e => <tr key={e.id} className="hover:bg-neutral-800/30"><td className="p-3"><b className="text-white">{e.title || e.release?.title || 'Untitled'}</b><span className="block text-[10px] text-neutral-500">{(e.primaryArtists || e.release?.primaryArtists || []).join(', ')}</span></td><td className="p-3 text-neutral-300">{e.client?.name}<span className="block text-[10px] text-neutral-500">{e.client?.email}</span></td><td className="p-3 font-mono text-[10px] text-neutral-400">{e.isrc || 'No ISRC'}<span className="block">{e.upc || 'No UPC'}</span></td><td className="p-3 text-neutral-400">{e.catalogueReleaseDate ? new Date(e.catalogueReleaseDate).toLocaleDateString() : '—'}</td><td className="p-3"><select value={e.distributionStatus || 'Not Queued'} onChange={async ev => { try { const res = await api.updateCatalogueEntry(e.id, { distributionStatus: ev.target.value }); setCatalogueEntries(prev => prev.map(x => x.id === e.id ? { ...x, ...res.entry } : x)); } catch(err:any) { alert(err.message || 'Could not update distribution status.'); } }} className="bg-neutral-950 border border-neutral-800 rounded-lg px-2 py-1 text-[11px] text-white"><option>Not Queued</option><option>Ready for SoundBlast</option><option>Submitted to SoundBlast</option><option>Distributed</option><option>Rejected</option></select></td><td className="p-3 text-right"><button onClick={() => openEditCatalogue(e)} className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 rounded-lg text-[11px] font-bold text-white">Edit</button></td></tr>)}</tbody></table></div>}
            </div>
          </div>
        )}

        {/* TAB: DATA BACKUP */}
        {activeTab === 'settings' && (
          <div className="max-w-3xl space-y-6">
            <div><h3 className="text-base font-bold text-white font-['Space_Grotesk']">Data Backup</h3><p className="text-xs text-neutral-400">Protect the live catalogue before any deployment or structural change.</p></div>
            <div className="p-6 bg-neutral-900/60 border border-emerald-900/50 rounded-2xl space-y-4">
              <div className="flex gap-3"><Shield className="w-5 h-5 text-emerald-400 shrink-0" /><div><h4 className="text-sm font-bold text-white">Safe backup and restore</h4><p className="text-xs text-neutral-400 mt-1">Exports the database records plus uploaded artwork, masters and documents. Import is additive: existing IDs and files are never overwritten or deleted.</p></div></div>
              <div className="flex flex-wrap gap-3">
                <button onClick={handleExportBackup} disabled={backupBusy} className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded-xl text-xs font-bold flex items-center gap-2"><Download className="w-4 h-4" /> Export Existing Data</button>
                <label className="px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer"><UploadCloud className="w-4 h-4" /> Import Existing Data<input type="file" accept=".tar.gz,.tgz,application/gzip,application/x-gzip" className="hidden" disabled={backupBusy} onChange={e => { const file = e.target.files?.[0]; if (file) handleImportBackup(file); e.currentTarget.value = ''; }} /></label>
              </div>
              <div className="text-[11px] text-neutral-500 border-t border-neutral-800 pt-3">Do not delete the old backup after creating it. Keep at least one verified restore copy before republishing.</div>
            </div>
          </div>
        )}

        {/* TAB 1: RELEASES MANAGEMENT */}
        {activeTab === 'releases' && (
          <div className="space-y-6">
            
            {/* Filter controls */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                <input
                  type="text"
                  placeholder="Filter by ref, title, artist, client..."
                  value={releaseSearch}
                  onChange={(e) => setReleaseSearch(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-xl pl-9 pr-4 py-2 text-xs sm:text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-red-600"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
                <span className="text-xs text-neutral-400 font-mono flex items-center gap-1 shrink-0">
                  <Filter className="w-3.5 h-3.5" /> Status:
                </span>
                {['All', 'Pending Review', 'Approved', 'Corrections Required', 'Takedown Requested', 'Takedown Processing', 'Takedown Completed', 'Denied'].map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                      statusFilter === st
                        ? 'bg-red-600 text-white font-bold'
                        : 'bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {selectedClientForView && (
              <div className="p-3 bg-neutral-900 border border-neutral-800 rounded-xl flex items-center justify-between text-xs">
                <span>Showing releases submitted by: <strong className="text-white">{selectedClientForView.name}</strong> ({selectedClientForView.email})</span>
                <button
                  onClick={() => setSelectedClientForView(null)}
                  className="text-red-400 hover:underline"
                >
                  Show all releases
                </button>
              </div>
            )}

            {/* Releases Table / Empty State */}
            {releases.length === 0 ? (
              <div className="py-20 bg-neutral-900/30 border border-dashed border-neutral-800 rounded-2xl text-center space-y-3 p-8">
                <Disc className="w-12 h-12 text-neutral-700 mx-auto" />
                <h3 className="text-base font-bold text-white font-['Space_Grotesk']">
                  No Releases Submitted Yet
                </h3>
                <p className="text-xs text-neutral-400 max-w-sm mx-auto">
                  When registered clients submit releases through their portal accounts, they will appear here with lossless masters, cover artwork, and review controls.
                </p>
              </div>
            ) : filteredReleases.length === 0 ? (
              <div className="py-12 text-center text-xs text-neutral-500">
                No releases match your current search or filter criteria.
              </div>
            ) : (
              <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-neutral-900 border-b border-neutral-800 text-neutral-400 font-mono uppercase text-[10px]">
                      <tr>
                        <th className="py-3 px-4">Release & Artwork</th>
                        <th className="py-3 px-4">Client / Artist</th>
                        <th className="py-3 px-4">Genre & Type</th>
                        <th className="py-3 px-4">Submission Date</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-800/60">
                      {filteredReleases.map((rel) => (
                        <tr
                          key={rel.id}
                          className="hover:bg-neutral-800/40 transition-colors group cursor-pointer"
                          onClick={() => onSelectRelease(rel)}
                        >
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <img
                                src={rel.artworkUrl}
                                alt={rel.title}
                                className="w-11 h-11 rounded-lg object-cover border border-neutral-700 shrink-0"
                              />
                              <div className="min-w-0">
                                <span className="font-mono text-[10px] text-red-400 font-bold block">
                                  {rel.refNumber}
                                </span>
                                <span className="font-bold text-white text-xs block truncate group-hover:text-red-400 transition-colors">
                                  {rel.title}
                                </span>
                                <span className="text-[11px] text-neutral-400 truncate block">
                                  {rel.primaryArtists.join(', ')}
                                </span>
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <span className="font-semibold text-neutral-200 block truncate max-w-[160px]">
                              {rel.artistLabelName}
                            </span>
                            <span className="text-[10px] text-neutral-500 font-mono block truncate">
                              {rel.userEmail}
                            </span>
                          </td>

                          <td className="py-3.5 px-4">
                            <span className="text-neutral-300 block">{rel.genre}</span>
                            <span className="text-[10px] text-neutral-500 font-mono block">
                              {rel.releaseType} · {rel.tracks.length} lossless track(s)
                            </span>
                          </td>

                          <td className="py-3.5 px-4 font-mono text-neutral-300">
                            {new Date(rel.submittedAt).toLocaleDateString()}
                          </td>

                          <td className="py-3.5 px-4">
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border inline-block ${getStatusBadge(rel.status)}`}>
                              {rel.status}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-2">
                              {/* Direct Download Artwork */}
                              <button
                                type="button"
                                onClick={() => handleDownloadArtwork(rel)}
                                disabled={downloadingArtworkId === rel.id}
                                className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors disabled:opacity-50 cursor-pointer"
                                title="Download Artwork"
                              >
                                {downloadingArtworkId === rel.id ? (
                                  <div className="w-3.5 h-3.5 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                                ) : (
                                  <Download className="w-3.5 h-3.5" />
                                )}
                              </button>

                              {(rel.status === 'Approved' || rel.status === 'Completed') && (
                                <button
                                  type="button"
                                  onClick={() => openPreSaveManager(rel)}
                                  className="px-3 py-1 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-sm inline-flex items-center gap-1.5"
                                >
                                  <Link2 className="w-3.5 h-3.5" />
                                  {rel.preSaveLinks?.length ? `Pre-save (${rel.preSaveLinks.length})` : 'Add Pre-save'}
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => onSelectRelease(rel)}
                                className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-semibold transition-colors shadow-sm"
                              >
                                Review & Decide
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          </div>
        )}

        {/* TAB 2: REAL CLIENTS MANAGEMENT */}
        {activeTab === 'clients' && (
          <div className="space-y-6">
            
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white font-['Space_Grotesk']">
                  Registered Clients & Record Labels
                </h3>
                <p className="text-xs text-neutral-400">
                  Register new artists manually, manage login credentials, and view submitted releases.
                </p>
              </div>

              <button
                onClick={() => {
                  setIsRegisterModalOpen(true);
                  setRegSuccessResult(null);
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow"
              >
                <UserPlus className="w-4 h-4" />
                <span>Register New Client</span>
              </button>
            </div>

            {clients.length === 0 ? (
              <div className="py-20 bg-neutral-900/30 border border-dashed border-neutral-800 rounded-2xl text-center space-y-3 p-8">
                <Users className="w-12 h-12 text-neutral-700 mx-auto" />
                <h3 className="text-base font-bold text-white font-['Space_Grotesk']">
                  No Clients Registered Yet
                </h3>
                <p className="text-xs text-neutral-400 max-w-sm mx-auto">
                  Click "Register New Client" above to manually register an artist or label and provide their login credentials.
                </p>
              </div>
            ) : (
              <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-neutral-900 border-b border-neutral-800 text-neutral-400 font-mono uppercase text-[10px]">
                      <tr>
                        <th className="py-3 px-4">Client Name & Surname</th>
                        <th className="py-3 px-4">Artist / Label</th>
                        <th className="py-3 px-4">Email Address</th>
                        <th className="py-3 px-4">Account Status</th>
                        <th className="py-3 px-4">Submitted Releases</th>
                        <th className="py-3 px-4">Registration Date</th>
                        <th className="py-3 px-4 text-right">Account Control</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-800/60">
                      {clients.map((c) => (
                        <tr key={c.id} className="hover:bg-neutral-800/40 transition-colors">
                          <td className="py-3.5 px-4 font-bold text-white">
                            {c.realFirstName || c.realSurname ? `${c.realFirstName || ''} ${c.realSurname || ''}`.trim() : 'Name not assigned'}
                            {c.country && (
                              <span className="text-[10px] text-neutral-500 font-normal block font-mono">
                                {c.country}
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-neutral-200">
                            <span className="font-semibold">{c.artistName || c.name}</span>
                          </td>

                          <td className="py-3.5 px-4 font-mono text-neutral-300">
                            {c.email}
                          </td>

                          <td className="py-3.5 px-4">
                            <span
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded border inline-block ${
                                c.status === 'active'
                                  ? 'text-emerald-400 bg-emerald-950/40 border-emerald-800'
                                  : c.status === 'pending_activation'
                                  ? 'text-amber-400 bg-amber-950/40 border-amber-800'
                                  : 'text-red-400 bg-red-950/40 border-red-800'
                              }`}
                            >
                              {c.status === 'active' ? 'Active' : 'Disabled'}
                            </span>
                          </td>

                          <td className="py-3.5 px-4">
                            <button
                              onClick={() => {
                                setSelectedClientForView(c);
                                setActiveTab('releases');
                              }}
                              className="text-red-400 hover:underline font-mono font-semibold"
                            >
                              {c.releasesCount || 0} release(s)
                            </button>
                          </td>

                          <td className="py-3.5 px-4 font-mono text-neutral-400">
                            {new Date(c.createdAt).toLocaleDateString()}
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => openEditClient(c)}
                                className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-white text-[11px] rounded flex items-center gap-1 font-semibold transition-colors cursor-pointer"
                                title="Edit client name and surname"
                              >
                                <Sliders className="w-3 h-3" />
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => handleAccessClientAccount(c)}
                                disabled={accessingClientId === c.id}
                                className="px-2.5 py-1 bg-red-600/90 hover:bg-red-600 text-white text-[11px] rounded flex items-center gap-1 font-semibold transition-colors cursor-pointer disabled:opacity-50"
                                title="Access and view client account without password"
                              >
                                {accessingClientId === c.id ? (
                                  <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                  <Eye className="w-3 h-3" />
                                )}
                                <span>Access Client Account</span>
                              </button>

                              <button
                                onClick={() => handleToggleClientStatus(c)}
                                className={`text-[11px] px-2.5 py-1 rounded transition-colors font-semibold ${
                                  c.status === 'disabled'
                                    ? 'text-emerald-400 bg-emerald-950/60 border border-emerald-800'
                                    : 'text-neutral-400 hover:text-red-400 bg-neutral-900 border border-neutral-800'
                                }`}
                              >
                                {c.status === 'disabled' ? 'Enable' : 'Disable'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          </div>
        )}

        {/* TAB 3: ENQUIRIES */}
        {activeTab === 'enquiries' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-base font-bold text-white font-['Space_Grotesk']">
                Inbound Website Enquiries
              </h3>
              <p className="text-xs text-neutral-400">
                Inquiries submitted through the Mid-Ama Promo contact form.
              </p>
            </div>

            {enquiries.length === 0 ? (
              <div className="p-8 text-center bg-neutral-900/30 border border-dashed border-neutral-800 rounded-xl text-neutral-500 text-xs">
                No enquiries received yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {enquiries.map((enq) => (
                  <div
                    key={enq.id}
                    className="p-5 bg-neutral-900/60 border border-neutral-800 rounded-2xl space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-neutral-950 border border-neutral-800 flex items-center justify-center text-red-500 shrink-0">
                          <Mail className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs sm:text-sm font-bold text-white font-['Space_Grotesk']">
                            {enq.subject}
                          </h4>
                          <span className="text-[11px] text-neutral-400">
                            From: <strong className="text-neutral-200">{enq.name}</strong> ({enq.email})
                            {enq.phone && ` · Phone: ${enq.phone}`}
                          </span>
                        </div>
                      </div>

                      <span className="text-[10px] font-mono text-neutral-500">
                        {new Date(enq.createdAt).toLocaleString()}
                      </span>
                    </div>

                    <div className="p-3.5 bg-neutral-950/70 border border-neutral-800/80 rounded-xl text-xs text-neutral-300 leading-relaxed">
                      {enq.message}
                    </div>

                    <div className="flex justify-end gap-2 pt-1">
                      <a
                        href={`mailto:${enq.email}?subject=Re: ${encodeURIComponent(enq.subject)} - Mid-Ama Promo™`}
                        className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Reply via Email</span>
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </main>

      {/* MODAL: MANUAL CLIENT REGISTRATION */}
      {isRegisterModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-neutral-950 border border-neutral-800 rounded-2xl shadow-2xl p-6 sm:p-8 overflow-hidden">
            
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-white font-['Space_Grotesk'] flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-red-500" />
                <span>Register Client Manually</span>
              </h3>
              <button
                onClick={() => setIsRegisterModalOpen(false)}
                className="text-neutral-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {regSuccessResult ? (
              <div className="space-y-4 text-center py-4">
                <div className="w-12 h-12 rounded-full bg-emerald-950 border border-emerald-800 text-emerald-400 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-white">Client Successfully Registered!</h4>
                <p className="text-xs text-neutral-400">
                  Account is ready. The client can now sign in directly using a one-time code sent to their registered email.
                </p>
                
                <div className="p-3.5 bg-neutral-900 border border-neutral-800 rounded-xl text-xs text-left space-y-2.5">
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Artist / Label:</span>
                    <span className="font-bold text-white">{regSuccessResult.client.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Registered Email:</span>
                    <span className="font-mono text-white">{regSuccessResult.client.email}</span>
                  </div>
                  <div className="border-t border-neutral-800 pt-2 text-[11px] text-emerald-400/90">
                    Client logs in via Email + one-time code (OTP). No password required.
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      const msg = `Hi ${regSuccessResult.client.name}! Your Mid-Ama Promo music distribution account is registered. Visit https://midamapromo.com, click Client Portal, enter your email (${regSuccessResult.client.email}), and click "Send Code" to receive your one-time login code.`;
                      navigator.clipboard.writeText(msg);
                      setCopiedInstructions(true);
                      setTimeout(() => setCopiedInstructions(false), 2500);
                    }}
                    className="flex-1 py-2.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-200 text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-1.5"
                  >
                    {copiedInstructions ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedInstructions ? 'Message Copied!' : 'Copy Client Message'}</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsRegisterModalOpen(false);
                      setRegSuccessResult(null);
                    }}
                    className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl transition-colors"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleManualRegisterSubmit} className="space-y-4">
                <div className="p-3 bg-neutral-900 border border-neutral-800 rounded-xl text-xs text-neutral-300">
                  Register the client's email. They will sign in via <strong>Email OTP</strong> using a single-use code — no password is required.
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1.5">First Name <span className="text-red-500">*</span></label>
                    <input type="text" required value={regFirstName} onChange={(e) => setRegFirstName(e.target.value)} placeholder="First name" className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-red-600" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1.5">Surname <span className="text-red-500">*</span></label>
                    <input type="text" required value={regSurname} onChange={(e) => setRegSurname(e.target.value)} placeholder="Surname" className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-red-600" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                    Artist / Label Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="e.g. Master KG / Open Mic"
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-red-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                    Client Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="artist@recordlabel.com"
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-red-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                    Phone / WhatsApp (Optional)
                  </label>
                  <input
                    type="tel"
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    placeholder="+27 82 000 0000"
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-red-600"
                  />
                </div>

                <button
                  type="submit"
                  disabled={regSubmitting}
                  className="w-full py-2.5 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>{regSubmitting ? 'Registering...' : 'Register Client Account'}</span>
                </button>
              </form>
            )}

          </div>
        </div>
      )}

      {editingClient && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
          <div className="w-full max-w-md bg-neutral-950 border border-neutral-800 rounded-2xl shadow-2xl p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-base font-bold text-white">Edit Client Details</h3>
                <p className="text-[11px] text-neutral-500 mt-1">{editingClient.email}</p>
              </div>
              <button type="button" onClick={() => setEditingClient(null)} className="text-neutral-400 hover:text-white">✕</button>
            </div>
            <form onSubmit={saveClientDetails} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1.5">First Name</label>
                  <input required value={editFirstName} onChange={e => setEditFirstName(e.target.value)} className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-red-600" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1.5">Surname</label>
                  <input required value={editSurname} onChange={e => setEditSurname(e.target.value)} className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-red-600" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">Artist / Label Name</label>
                <input required value={editArtistName} onChange={e => setEditArtistName(e.target.value)} className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-red-600" />
              </div>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setEditingClient(null)} className="flex-1 py-2.5 bg-neutral-900 border border-neutral-800 text-neutral-300 rounded-xl text-xs font-semibold">Cancel</button>
                <button type="submit" disabled={editSaving} className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold">{editSaving ? 'Saving...' : 'Save Details'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
