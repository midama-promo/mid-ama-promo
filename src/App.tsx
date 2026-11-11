/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/public/Navbar';
import { Hero } from './components/public/Hero';
import { HowItWorks } from './components/public/HowItWorks';
import { PricingPlans } from './components/public/PricingPlans';
import { Requirements } from './components/public/Requirements';
import { QualityControl } from './components/public/QualityControl';
import { AmapianoFocus } from './components/public/AmapianoFocus';
import { ContactSection } from './components/public/ContactSection';
import { Policies } from './components/public/Policies';
import { Footer } from './components/public/Footer';
import { ReleasesShowcase } from './components/public/ReleasesShowcase';

// Modals & Dashboards
import { AuthModal, AuthTabMode } from './components/auth/AuthModal';
import { ReleaseDetailModal } from './components/client/ReleaseDetailModal';
import { ClientDashboard } from './components/client/ClientDashboard';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { PublicSharePage } from './components/public/PublicSharePage';
import { SmartPreSavePage } from './components/public/SmartPreSavePage';
import { NotificationCenterModal } from './components/client/NotificationCenterModal';
import { Release } from './types';

function ThemeControl() {
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    try { return (localStorage.getItem('midama-theme') as 'dark' | 'light') || 'dark'; } catch { return 'dark'; }
  });
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    try { localStorage.setItem('midama-theme', theme); } catch { /* private browsing */ }
  }, [theme]);
  return <button type="button" className="ma-theme-toggle" onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`} title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}>
    {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}<span>{theme === 'dark' ? 'LIGHT MODE' : 'DARK MODE'}</span>
  </button>;
}

function MotionSystem() {
  useEffect(() => {
    const reveal = () => {
      const candidates = document.querySelectorAll<HTMLElement>('main section, body > #root section, .max-w-7xl > div, [class*="rounded-xl"], [class*="rounded-2xl"], [class*="shadow"]');
      candidates.forEach((el, i) => {
        if (el.closest('.ma-theme-toggle') || el.hasAttribute('data-motion-ready')) return;
        el.setAttribute('data-motion-ready', 'true');
        el.classList.add('ma-motion-item');
        el.dataset.motionDirection = i % 3 === 0 ? 'left' : i % 3 === 1 ? 'up' : 'right';
      });
      const items = document.querySelectorAll<HTMLElement>('.ma-motion-item:not(.ma-motion-visible)');
      if (!('IntersectionObserver' in window)) { items.forEach(el => el.classList.add('ma-motion-visible')); return; }
      items.forEach(el => observer.observe(el));
    };
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('ma-motion-visible'); observer.unobserve(entry.target); }
    }), { threshold: 0.08, rootMargin: '0px 0px -25px 0px' });
    reveal();
    const mutation = new MutationObserver(() => reveal());
    mutation.observe(document.getElementById('root') || document.body, { childList: true, subtree: true });
    return () => { observer.disconnect(); mutation.disconnect(); };
  }, []);
  return null;
}

function MainContent() {
  const { user, isLoading } = useAuth();

  // Navigation view state
  const [currentView, setCurrentView] = useState<'public' | 'client' | 'admin' | 'share'>('public');
  const [shareRefNumber, setShareRefNumber] = useState<string | null>(null);

  // Modals state
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authTab, setAuthTab] = useState<AuthTabMode>('signin');
  const [selectedRelease, setSelectedRelease] = useState<Release | null>(null);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  const openAuth = (tab: AuthTabMode = 'signin') => {
    setAuthTab(tab);
    setIsAuthOpen(true);
  };

  // Check URL parameters on mount (?ref=..., ?auth=...)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const refParam = params.get('ref');
    const authParam = params.get('auth');

    if (refParam) {
      setShareRefNumber(refParam.toUpperCase());
      setCurrentView('share');
    } else if (authParam) {
      openAuth('signin');
    }
  }, []);

  // When user signs in, automatically switch to appropriate portal view if still on public
  useEffect(() => {
    // Authentication is the source of truth for portal routing. This also fixes the
    // stale-view bug where an admin could inherit a previous client's dashboard.
    if (currentView === 'share') return;
    if (user) {
      setCurrentView(user.role === 'admin' ? 'admin' : 'client');
    } else {
      setCurrentView('public');
    }
  }, [user]);

  const handleOpenShare = (refNumber: string) => {
    setShareRefNumber(refNumber);
    setCurrentView('share');
    setSelectedRelease(null);
    window.history.pushState({}, '', `?ref=${refNumber}`);
  };

  const handleBackToPublic = () => {
    setShareRefNumber(null);
    if (user) {
      setCurrentView(user.role === 'admin' ? 'admin' : 'client');
    } else {
      setCurrentView('public');
    }
    window.history.pushState({}, '', window.location.pathname);
  };

  const handleGoToDashboard = () => {
    if (!user) {
      openAuth('signin');
    } else if (user.role === 'admin') {
      setCurrentView('admin');
    } else {
      setCurrentView('client');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center text-neutral-400 space-y-4">
        <div className="w-10 h-10 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-mono tracking-wider">INITIALIZING MID-AMA PROMO™...</span>
      </div>
    );
  }

  // 1. Shareable Release Showcase view
  if (currentView === 'share' && shareRefNumber) {
    return (
      <PublicSharePage
        refNumber={shareRefNumber}
        onBack={handleBackToPublic}
      />
    );
  }

  // 2. Admin Portal view
  if (user?.role === 'admin' && currentView === 'admin') {
    return (
      <>
        <AdminDashboard
          onSelectRelease={(rel) => setSelectedRelease(rel)}
          onOpenSharePage={handleOpenShare}
          onOpenNotifications={() => setIsNotificationsOpen(true)}
          onGoHome={() => setCurrentView('public')}
          onStatusUpdated={(updated) => {
            setSelectedRelease(updated);
            window.dispatchEvent(new CustomEvent('midama:release-status-updated', { detail: updated }));
          }}
        />

        {/* Release Detail Inspector */}
        <ReleaseDetailModal
          release={selectedRelease}
          isOpen={selectedRelease !== null}
          onClose={() => setSelectedRelease(null)}
          onOpenSharePage={handleOpenShare}
          isAdmin={true}
          onStatusUpdated={(updated) => {
            setSelectedRelease(updated);
            window.dispatchEvent(new CustomEvent('midama:release-status-updated', { detail: updated }));
          }}
        />

        {/* Notification Center */}
        <NotificationCenterModal
          isOpen={isNotificationsOpen}
          onClose={() => setIsNotificationsOpen(false)}
        />
      </>
    );
  }

  // 3. Client Dashboard view
  if (user && currentView === 'client') {
    return (
      <>
        <ClientDashboard
          onSelectRelease={(rel) => setSelectedRelease(rel)}
          onOpenSharePage={handleOpenShare}
          onOpenNotifications={() => setIsNotificationsOpen(true)}
          onGoHome={() => setCurrentView('public')}
        />

        {/* Release Detail View */}
        <ReleaseDetailModal
          release={selectedRelease}
          isOpen={selectedRelease !== null}
          onClose={() => setSelectedRelease(null)}
          onOpenSharePage={handleOpenShare}
          isAdmin={false}
        />

        {/* Notification Center */}
        <NotificationCenterModal
          isOpen={isNotificationsOpen}
          onClose={() => setIsNotificationsOpen(false)}
        />
      </>
    );
  }

  // 4. Default Public Website Landing Page
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col justify-between selection:bg-red-600 selection:text-white">
      <div>
        {/* Navigation bar */}
        <Navbar
          onOpenSignIn={() => openAuth('signin')}
          onOpenContact={() => {
            const el = document.getElementById('contact');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }}
          onGoToDashboard={handleGoToDashboard}
          onOpenNotifications={() => setIsNotificationsOpen(true)}
        />

        {/* New distributor portal announcement */}
        <section className="mx-auto mt-5 max-w-7xl px-4 sm:px-6 lg:px-8" aria-label="New artist distribution portal">
          <div className="relative overflow-hidden rounded-3xl border border-red-500/40 bg-gradient-to-br from-red-950 via-neutral-950 to-neutral-900 px-6 py-8 sm:px-10 sm:py-10 shadow-2xl shadow-red-950/30">
            <div className="pointer-events-none absolute -right-12 -top-16 h-56 w-56 rounded-full bg-red-600/20 blur-3xl" />
            <div className="relative flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
              <div className="max-w-2xl">
                <p className="text-[10px] font-black uppercase tracking-[.28em] text-red-300">Important platform update</p>
                <h2 className="mt-2 text-2xl font-black tracking-tight text-white sm:text-3xl">Our new Artist Distribution Portal is now live.</h2>
                <p className="mt-3 text-sm leading-relaxed text-neutral-200">All new music distribution submissions and artist account activity must now take place on our new platform. Your existing catalogue remains with Mid-Ama Promo and will not be removed or affected by this change.</p>
              </div>
              <a href="https://user.midamapromo.co.za/" target="_blank" rel="noreferrer" className="inline-flex shrink-0 items-center justify-center gap-3 rounded-xl bg-red-600 px-7 py-4 text-sm font-extrabold text-white shadow-lg shadow-red-950/40 transition-all hover:-translate-y-0.5 hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-red-300 focus:ring-offset-2 focus:ring-offset-neutral-950">
                Open New Artist Portal <span aria-hidden="true">→</span>
              </a>
            </div>
          </div>
        </section>

        {/* Hero Section */}
        <Hero
          onOpenSignIn={() => openAuth('signin')}
          onOpenContact={() => {
            const el = document.getElementById('contact');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }}
          onLookupRef={handleOpenShare}
        />

        {/* Public client releases catalogue */}
        <ReleasesShowcase />

        {/* How It Works Section */}
        <HowItWorks />

        {/* Public plan comparison */}
        <PricingPlans onChoosePlan={() => window.open('https://user.midamapromo.co.za/', '_blank', 'noopener,noreferrer')} />

        {/* Technical Requirements Section */}
        <Requirements />

        {/* Review & Quality Control Process */}
        <QualityControl />

        {/* Amapiano & Afro independent artist focus */}
        <AmapianoFocus />

        {/* Public Policies */}
        <Policies />

        {/* Contact / Enquiries Form */}
        <ContactSection />
      </div>

      {/* Professional Footer */}
      <Footer
        onOpenSignIn={() => openAuth('signin')}
        onOpenContact={() => {
          const el = document.getElementById('contact');
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }}
        onGoToDashboard={handleGoToDashboard}
      />

      {/* Secure OTP Auth Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        initialTab={authTab}
        onClose={() => setIsAuthOpen(false)}
        onSuccess={() => {
          // Handled via user state effect
        }}
      />

      {/* Notifications Modal */}
      <NotificationCenterModal
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
      />
    </div>
  );
}

function AppRoute() {
  const path = window.location.pathname.replace(/^\/+|\/+$/g, '');
  const reserved = ['', 'index.html', 'favicon.ico', 'robots.txt'];
  if (path && !reserved.includes(path) && !path.startsWith('api/') && !path.startsWith('uploads/')) {
    return <SmartPreSavePage slug={decodeURIComponent(path.split('/')[0])} />;
  }
  return <><MotionSystem /><ThemeControl /><MainContent /></>;
}

export default function App() {
  return <AuthProvider><AppRoute /></AuthProvider>;
}
