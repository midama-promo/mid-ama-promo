import React, { useState } from 'react';
import { Logo } from '../common/Logo';
import { useAuth } from '../../context/AuthContext';
import { User, UserPlus, LogIn, UploadCloud, Menu, X, Shield, Bell, Disc3 } from 'lucide-react';

interface NavbarProps {
  onOpenSignIn: () => void;
  onOpenRegister?: () => void;
  onOpenGetStarted: () => void;
  onOpenContact: () => void;
  onGoToDashboard: () => void;
  onOpenNotifications?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenSignIn,
  onOpenRegister,
  onOpenGetStarted,
  onOpenContact,
  onGoToDashboard,
  onOpenNotifications,
}) => {
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-neutral-950/90 backdrop-blur-md border-b border-neutral-800/80 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Brand Logo */}
          <Logo
            size="md"
            showTagline={false}
            onClick={() => {
              if (user) {
                onGoToDashboard();
              } else {
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }
            }}
          />

          {/* Desktop Nav Links */}
          <nav className="hidden lg:flex items-center gap-8 text-sm font-medium text-neutral-300">
            <button
              onClick={() => scrollToSection('how-it-works')}
              className="hover:text-white transition-colors"
            >
              How It Works
            </button>
            <button
              onClick={() => scrollToSection('requirements')}
              className="hover:text-white transition-colors"
            >
              Requirements
            </button>
            <button
              onClick={() => scrollToSection('quality-control')}
              className="hover:text-white transition-colors"
            >
              Review Process
            </button>
            <button
              onClick={() => scrollToSection('amapiano-focus')}
              className="hover:text-white transition-colors"
            >
              Amapiano & Afro
            </button>
            <button
              onClick={onOpenContact}
              className="hover:text-white transition-colors"
            >
              Contact
            </button>
          </nav>

          {/* Action CTAs */}
          <div className="hidden sm:flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3">
                {onOpenNotifications && (
                  <button
                    onClick={onOpenNotifications}
                    className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-900 rounded-lg transition-colors relative"
                    title="Audit & Notifications"
                  >
                    <Bell className="w-4 h-4" />
                    <span className="absolute top-1 right-1 w-2 h-2 bg-red-600 rounded-full" />
                  </button>
                )}

                <button
                  onClick={onGoToDashboard}
                  className="flex items-center gap-2 px-4 py-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-100 text-xs font-semibold rounded-lg transition-colors"
                >
                  {user.role === 'admin' ? (
                    <>
                      <Shield className="w-3.5 h-3.5 text-red-500" />
                      <span>Admin Portal</span>
                    </>
                  ) : (
                    <>
                      <Disc3 className="w-3.5 h-3.5 text-red-500" />
                      <span>Client Dashboard</span>
                    </>
                  )}
                </button>

                <button
                  onClick={logout}
                  className="text-xs text-neutral-400 hover:text-neutral-200 px-3 py-2 rounded transition-colors"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <>
                <button
                  onClick={onOpenSignIn}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-neutral-300 hover:text-white transition-colors"
                >
                  <LogIn className="w-4 h-4 text-neutral-400" />
                  <span>Sign In</span>
                </button>

                <button
                  onClick={onOpenRegister || onOpenGetStarted}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-lg shadow-sm transition-all hover:shadow-red-900/20 active:scale-95"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Sign Up</span>
                </button>
              </>
            )}
          </div>

          {/* Mobile menu trigger */}
          <div className="flex sm:hidden items-center gap-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-neutral-400 hover:text-white"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu dropdown */}
      {mobileMenuOpen && (
        <div className="sm:hidden bg-neutral-950 border-b border-neutral-800 px-4 pt-3 pb-6 space-y-3">
          <nav className="flex flex-col space-y-3 text-sm font-medium text-neutral-300">
            <button
              onClick={() => scrollToSection('how-it-works')}
              className="text-left py-1 hover:text-white"
            >
              How It Works
            </button>
            <button
              onClick={() => scrollToSection('requirements')}
              className="text-left py-1 hover:text-white"
            >
              Requirements
            </button>
            <button
              onClick={() => scrollToSection('quality-control')}
              className="text-left py-1 hover:text-white"
            >
              Review Process
            </button>
            <button
              onClick={() => scrollToSection('amapiano-focus')}
              className="text-left py-1 hover:text-white"
            >
              Amapiano & Afro Focus
            </button>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenContact();
              }}
              className="text-left py-1 hover:text-white"
            >
              Contact
            </button>
          </nav>

          <div className="pt-4 border-t border-neutral-800 flex flex-col gap-2">
            {user ? (
              <>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onGoToDashboard();
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-neutral-900 border border-neutral-800 text-white rounded-lg text-sm font-semibold"
                >
                  {user.role === 'admin' ? 'Admin Portal' : 'Client Dashboard'}
                </button>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    logout();
                  }}
                  className="w-full text-center text-xs text-neutral-400 py-2"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenSignIn();
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-neutral-900 border border-neutral-800 text-white rounded-lg text-sm font-semibold"
                >
                  <LogIn className="w-4 h-4" />
                  Sign In
                </button>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    (onOpenRegister || onOpenGetStarted)();
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-lg text-sm font-bold shadow"
                >
                  <UserPlus className="w-4 h-4" />
                  Sign Up
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
