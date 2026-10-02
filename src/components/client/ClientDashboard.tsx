import React, { useState, useEffect } from 'react';
import {
  UploadCloud,
  LogOut,
  Search,
  Filter,
  Disc,
  Clock,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Play,
  Copy,
  Check,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Layers,
  Calendar,
  Bell,
  Download,
  FileCheck,
  Eye,
  MessageSquare
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Release, ReleaseStatus } from '../../types';
import { api } from '../../services/api';
import { Logo } from '../common/Logo';

interface ClientDashboardProps {
  onOpenUpload: () => void;
  onSelectRelease: (release: Release) => void;
  onOpenSharePage: (refNumber: string) => void;
  onOpenNotifications: () => void;
  onGoHome: () => void;
  newlyCreatedRelease?: Release | null;
}

export const ClientDashboard: React.FC<ClientDashboardProps> = ({
  onOpenUpload,
  onSelectRelease,
  onOpenSharePage,
  onOpenNotifications,
  onGoHome,
  newlyCreatedRelease,
}) => {
  const { user, logout, isImpersonating, exitClientAccount } = useAuth();
  const [releases, setReleases] = useState<Release[]>([]);
  const [catalogueEntries, setCatalogueEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [copiedRef, setCopiedRef] = useState<string | null>(null);

  const fetchReleases = async (showSpinner = true) => {
    try {
      if (showSpinner) setLoading(true);
      setError(null);
      const [releaseRes, catalogueRes] = await Promise.all([api.getReleases(), api.getClientCatalogue()]);
      setReleases(releaseRes.releases);
      setCatalogueEntries(catalogueRes.entries);
    } catch (err: any) {
      setError(err.message || 'Failed to load releases.');
    } finally {
      if (showSpinner) setLoading(false);
    }
  };

  useEffect(() => {
    fetchReleases();
  }, []);

  // Listen to midama:release-submitted event for instantaneous dashboard update without refresh
  useEffect(() => {
    const handleReleaseSubmitted = (e: Event) => {
      const customEvent = e as CustomEvent<Release>;
      const newRel = customEvent.detail;
      if (newRel) {
        setReleases((prev) => {
          const filtered = prev.filter(
            (r) => r.id !== newRel.id && r.refNumber !== newRel.refNumber
          );
          return [newRel, ...filtered];
        });
        fetchReleases(false);
      }
    };

    window.addEventListener('midama:release-submitted', handleReleaseSubmitted);
    return () => {
      window.removeEventListener('midama:release-submitted', handleReleaseSubmitted);
    };
  }, []);

  // When a release is newly submitted, immediately show it without requiring a browser refresh
  useEffect(() => {
    if (newlyCreatedRelease) {
      setReleases((prev) => {
        const filtered = prev.filter(
          (r) => r.id !== newlyCreatedRelease.id && r.refNumber !== newlyCreatedRelease.refNumber
        );
        return [newlyCreatedRelease, ...filtered];
      });
      fetchReleases(false);
    }
  }, [newlyCreatedRelease]);

  const handleCopyLink = (refNumber: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}?ref=${refNumber}`;
    navigator.clipboard.writeText(url);
    setCopiedRef(refNumber);
    setTimeout(() => setCopiedRef(null), 2000);
  };

  const getStatusBadge = (status: ReleaseStatus) => {
    switch (status) {
      case 'Pending Review':
        return 'text-amber-400 bg-amber-950/40 border-amber-800/80';
      case 'Approved':
        return 'text-emerald-400 bg-emerald-950/40 border-emerald-800/80';
      case 'Completed':
        return 'text-blue-400 bg-blue-950/40 border-blue-800/80';
      case 'Denied':
        return 'text-red-400 bg-red-950/40 border-red-800/80';
      case 'Corrections Required':
        return 'text-orange-400 bg-orange-950/40 border-orange-800/80';
      default:
        return 'text-neutral-300 bg-neutral-900 border-neutral-800';
    }
  };

  const filteredReleases = releases.filter((r) => {
    const matchesSearch =
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.refNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.primaryArtists.some((a) => a.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === 'All' || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 pb-20">
      
      {/* Admin Impersonation Notice Bar */}
      {isImpersonating && (
        <div className="bg-amber-400 text-neutral-950 px-4 py-2.5 text-xs font-bold flex items-center justify-between shadow-lg sticky top-0 z-40 border-b border-amber-500">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
            <span>Admin Support Session: Viewing client portal for <strong>{user?.name}</strong> ({user?.email})</span>
          </div>
          <button
            onClick={exitClientAccount}
            className="px-3 py-1 bg-neutral-950 hover:bg-neutral-800 text-white text-[11px] font-bold rounded-lg transition-colors cursor-pointer"
          >
            ← Return to Admin Portal
          </button>
        </div>
      )}

      {/* Top Client Portal Bar */}
      <header className="sticky top-0 z-30 bg-neutral-950/95 backdrop-blur-md border-b border-neutral-800/80 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between h-20">
          <div className="flex items-center gap-3">
            <Logo size="md" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} />
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-neutral-400 text-xs font-mono font-bold">
              <span>CLIENT DASHBOARD</span>
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <a
              href="https://midamapromo-royalties.ai.studio"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-amber-300 hover:text-amber-200 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              title="Open Royalty Dashboard in new tab"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Royalty Dashboard</span>
              <ExternalLink className="w-3 h-3 text-neutral-500" />
            </a>

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
              title="Notifications Audit Log"
            >
              <Bell className="w-5 h-5" />
            </button>

            <button
              onClick={onOpenUpload}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs sm:text-sm font-bold rounded-xl transition-all shadow-md shadow-red-950 active:scale-95 cursor-pointer"
            >
              <UploadCloud className="w-4 h-4" />
              <span className="hidden sm:inline">Submit New Release</span>
              <span className="sm:hidden">Submit</span>
            </button>

            <button
              onClick={logout}
              className="p-2 text-neutral-400 hover:text-red-400 hover:bg-neutral-900 rounded-xl transition-colors cursor-pointer"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        
        {/* Artist Profile Header / Welcome Banner */}
        <div className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-red-600/5 rounded-full blur-3xl pointer-events-none" />

          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-neutral-950 border border-neutral-800 text-[11px] font-mono text-neutral-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Client Portal</span>
              <span className="text-neutral-600">·</span>
              <span className="text-neutral-300 font-bold">{user?.email}</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-['Space_Grotesk']">
              Welcome, {user?.name || 'Artist / Record Label'}
            </h1>

            <p className="text-xs sm:text-sm text-neutral-400 max-w-xl">
              This is your private release management portal. Submit your music master files, square cover art, and metadata directly for review by Mid-Ama Promo administration.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onOpenUpload}
              className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg shadow-red-950 flex items-center gap-2 transition-colors cursor-pointer active:scale-95"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Submit New Release</span>
            </button>
          </div>
        </div>

        {/* Customer Submission Status Metrics */}
        {releases.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="p-4 bg-neutral-900/60 border border-neutral-800 rounded-xl space-y-1">
              <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider block">Total Submissions</span>
              <span className="text-2xl font-bold text-white font-['Space_Grotesk']">{releases.length}</span>
            </div>

            <div className="p-4 bg-amber-950/20 border border-amber-900/50 rounded-xl space-y-1">
              <span className="text-[10px] font-mono text-amber-400 uppercase tracking-wider block">Under Review</span>
              <span className="text-2xl font-bold text-amber-400 font-['Space_Grotesk']">
                {releases.filter(r => r.status === 'Pending Review').length}
              </span>
            </div>

            <div className="p-4 bg-orange-950/20 border border-orange-900/50 rounded-xl space-y-1">
              <span className="text-[10px] font-mono text-orange-400 uppercase tracking-wider block">Corrections Needed</span>
              <span className="text-2xl font-bold text-orange-400 font-['Space_Grotesk']">
                {releases.filter(r => r.status === 'Corrections Required').length}
              </span>
            </div>

            <div className="p-4 bg-emerald-950/20 border border-emerald-900/50 rounded-xl space-y-1">
              <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider block">Approved</span>
              <span className="text-2xl font-bold text-emerald-400 font-['Space_Grotesk']">
                {releases.filter(r => r.status === 'Approved').length}
              </span>
            </div>

            <div className="p-4 bg-blue-950/20 border border-blue-900/50 rounded-xl space-y-1 col-span-2 sm:col-span-1">
              <span className="text-[10px] font-mono text-blue-400 uppercase tracking-wider block">Completed</span>
              <span className="text-2xl font-bold text-blue-400 font-['Space_Grotesk']">
                {releases.filter(r => r.status === 'Completed').length}
              </span>
            </div>
          </div>
        )}

        {/* Administrator Feedback / Actions Notice if any release requires corrections */}
        {releases.some(r => r.status === 'Corrections Required' && r.adminNotes) && (
          <div className="p-4 bg-orange-950/30 border border-orange-800/80 rounded-2xl space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-orange-400 text-xs font-bold font-['Space_Grotesk']">
                <AlertTriangle className="w-4 h-4" />
                <span>Action Required: Administrator Feedback</span>
              </div>
              <span className="text-[10px] font-mono text-orange-400">Please review & update</span>
            </div>
            {releases.filter(r => r.status === 'Corrections Required' && r.adminNotes).map(r => (
              <div
                key={r.id}
                onClick={() => onSelectRelease(r)}
                className="p-3 bg-neutral-900/80 hover:bg-neutral-900 rounded-xl border border-neutral-800 flex items-center justify-between cursor-pointer group transition-all"
              >
                <div>
                  <span className="font-mono text-[11px] font-bold text-red-400 mr-2">{r.refNumber}</span>
                  <strong className="text-xs text-white">{r.title}:</strong>
                  <span className="text-xs text-neutral-300 ml-2 italic font-mono">"{r.adminNotes}"</span>
                </div>
                <span className="text-xs text-orange-400 group-hover:underline flex items-center gap-1 shrink-0 ml-3">
                  <span>View Details</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Royalty Dashboard Section */}
        <section className="bg-gradient-to-r from-neutral-900/90 via-neutral-900/60 to-neutral-950 border border-neutral-800 rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
          <div className="space-y-1">
            <h2 className="text-base font-bold text-white font-['Space_Grotesk'] flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Royalty Dashboard</span>
            </h2>
            <p className="text-xs text-neutral-400 max-w-xl">
              Access your earnings, detailed streaming statements, and payout history via the dedicated Mid-Ama Royalty Portal.
            </p>
          </div>
          <a
            href="https://midamapromo-royalties.ai.studio"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-neutral-800 hover:bg-neutral-700 hover:text-white text-neutral-100 text-xs font-bold rounded-xl border border-neutral-700 transition-all shadow-md shrink-0 cursor-pointer"
          >
            <span>Open Royalty Dashboard</span>
            <ExternalLink className="w-3.5 h-3.5 text-neutral-400" />
          </a>
        </section>

        {/* Real Summary Bar (Only shown if user has submitted releases) */}
        {releases.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
              <input
                type="text"
                placeholder="Search releases by title or ref number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-neutral-900/80 border border-neutral-800 rounded-xl pl-9 pr-4 py-2 text-xs sm:text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-red-600"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
              <span className="text-xs text-neutral-400 font-mono flex items-center gap-1 shrink-0">
                <Filter className="w-3.5 h-3.5" /> Filter:
              </span>
              {['All', 'Pending Review', 'Approved', 'Completed', 'Corrections Required', 'Denied'].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
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
        )}

        {/* Existing / Legacy Catalogue Section */}
        {catalogueEntries.length > 0 && (
          <section className="space-y-4">
            <div>
              <h2 className="text-base font-bold text-white font-['Space_Grotesk']">Your Catalogue</h2>
              <p className="text-xs text-neutral-500 mt-1">Songs already released or added by Mid-Ama Promo administration.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {catalogueEntries.map((entry) => (
                <div key={entry.id} className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-4">
                  <div className="flex items-center gap-3">
                    {entry.artworkUrl ? <img src={entry.artworkUrl} alt={entry.title} className="w-14 h-14 rounded-xl object-cover border border-neutral-700" /> : <div className="w-14 h-14 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-center"><Disc className="w-6 h-6 text-neutral-600" /></div>}
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-white truncate">{entry.title}</h3>
                      <p className="text-xs text-neutral-400 truncate">{(entry.primaryArtists || []).join(', ')}</p>
                      <p className="text-[10px] text-neutral-500 mt-1">{entry.genre} · {entry.distributionStatus}</p>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-neutral-800 grid grid-cols-2 gap-2 text-[10px] font-mono text-neutral-500">
                    <span>ISRC: {entry.isrc || '—'}</span><span>UPC: {entry.upc || '—'}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Release Catalogue Section */}
        {loading ? (
          <div className="py-20 text-center space-y-3">
            <div className="w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-mono text-neutral-400">Loading your releases...</p>
          </div>
        ) : error ? (
          <div className="p-6 bg-red-950/40 border border-red-800 rounded-2xl text-center space-y-3">
            <AlertTriangle className="w-8 h-8 text-red-500 mx-auto" />
            <p className="text-xs text-red-300">{error}</p>
            <button
              onClick={() => fetchReleases(true)}
              className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs rounded-xl"
            >
              Retry
            </button>
          </div>
        ) : releases.length === 0 ? (
          /* EMPTY STATE AS REQUIRED BY USER */
          <div className="py-24 bg-neutral-900/30 border border-dashed border-neutral-800 rounded-2xl text-center space-y-4 p-8">
            <div className="w-14 h-14 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-center mx-auto text-neutral-600">
              <Disc className="w-7 h-7" />
            </div>
            <div className="space-y-1 max-w-md mx-auto">
              <h3 className="text-base font-bold text-white font-['Space_Grotesk']">
                No releases submitted yet.
              </h3>
              <p className="text-xs text-neutral-400">
                You have not submitted any music releases yet. When you are ready, click the button below to upload your master audio, square cover artwork, and release metadata.
              </p>
            </div>
            <button
              onClick={onOpenUpload}
              className="px-6 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold text-xs sm:text-sm rounded-xl transition-colors inline-flex items-center gap-2 shadow-md shadow-red-950"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Submit New Release</span>
            </button>
          </div>
        ) : filteredReleases.length === 0 ? (
          <div className="py-16 bg-neutral-900/20 border border-neutral-800 rounded-2xl text-center space-y-2 p-6">
            <p className="text-xs text-neutral-400">No releases match the selected filter "{statusFilter}".</p>
            <button
              onClick={() => { setStatusFilter('All'); setSearchQuery(''); }}
              className="text-xs text-red-400 hover:underline"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredReleases.map((rel) => (
              <div
                key={rel.id}
                onClick={() => onSelectRelease(rel)}
                className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-5 hover:border-neutral-700 hover:bg-neutral-900/90 transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  {/* Ref number & Status */}
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[11px] font-mono font-bold text-red-400">
                      {rel.refNumber}
                    </span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${getStatusBadge(rel.status)}`}>
                      {rel.status}
                    </span>
                  </div>

                  {/* Artwork & Title */}
                  <div className="flex items-center gap-4 mb-4">
                    <img
                      src={rel.artworkUrl}
                      alt={rel.title}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="%23666" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg>';
                      }}
                      className="w-16 h-16 rounded-xl object-cover border border-neutral-700 shadow-md shrink-0 group-hover:scale-105 transition-transform"
                    />
                    <div className="min-w-0">
                      <span className="text-[10px] font-mono text-neutral-400 block">
                        {rel.releaseType} · {rel.genre}
                      </span>
                      <h3 className="text-base font-bold text-white font-['Space_Grotesk'] truncate group-hover:text-red-400 transition-colors">
                        {rel.title}
                      </h3>
                      <p className="text-xs text-neutral-400 truncate">
                        {rel.primaryArtists.join(', ')}
                        {rel.featuredArtists && rel.featuredArtists.length > 0 && ` feat. ${rel.featuredArtists.join(', ')}`}
                      </p>
                    </div>
                  </div>

                  {/* Feedback / Notes callouts */}
                  {rel.status === 'Denied' && rel.denialReason && (
                    <div className="mb-3 p-2.5 rounded-lg text-xs bg-red-950/40 text-red-300 border border-red-800/80 flex items-start gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-red-400" />
                      <div>
                        <span className="font-bold block">Denial Reason:</span>
                        <p className="text-[11px] leading-relaxed">{rel.denialReason}</p>
                      </div>
                    </div>
                  )}

                  {rel.status === 'Corrections Required' && rel.adminNotes && (
                    <div className="mb-3 p-2.5 rounded-lg text-xs bg-orange-950/40 text-orange-300 border border-orange-800/80 flex items-start gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-orange-400" />
                      <div>
                        <span className="font-bold block">Administrator Feedback:</span>
                        <p className="text-[11px] leading-relaxed">{rel.adminNotes}</p>
                      </div>
                    </div>
                  )}

                  {(rel.status === 'Approved' || rel.status === 'Completed') && (
                    <>
                      <div className="mb-3 p-2 rounded-lg text-xs bg-emerald-950/30 text-emerald-300 border border-emerald-800/60 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span className="text-[11px]">{rel.status === 'Completed' ? 'Approved and distribution completed' : 'Approved by Mid-Ama Promo Administrator'}</span>
                      </div>

                      {(rel.preSaveLinks || []).length > 0 && (
                        <div className="mb-3 p-3 rounded-xl bg-neutral-950/70 border border-neutral-800" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-2 mb-2">
                            <ExternalLink className="w-3.5 h-3.5 text-red-400" />
                            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-400">Pre-save Links</span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {(rel.preSaveLinks || []).map((link) => (
                              <a
                                key={link.id}
                                href={link.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600/10 border border-red-700/60 text-red-300 hover:bg-red-600 hover:text-white transition-colors text-[11px] font-bold"
                              >
                                {link.label}
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Bottom Bar: Submission Date & Actions */}
                <div className="pt-3 border-t border-neutral-800/80 flex items-center justify-between text-xs">
                  <span className="text-[10px] font-mono text-neutral-500">
                    Submitted: {new Date(rel.submittedAt).toLocaleDateString()}
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => handleCopyLink(rel.refNumber, e)}
                      className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
                      title="Copy Reference Link"
                    >
                      {copiedRef === rel.refNumber ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>

                    <span className="text-neutral-500 flex items-center gap-0.5 text-[11px] group-hover:text-red-400 transition-colors">
                      <span>View</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

      </main>
    </div>
  );
};
