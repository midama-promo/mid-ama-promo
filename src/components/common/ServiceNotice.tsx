import React from 'react';
import { AlertTriangle } from 'lucide-react';

/** Temporary public service notice shown while catalogue visibility is being restored. */
export const ServiceNotice: React.FC<{ className?: string }> = ({ className = '' }) => (
  <section
    role="status"
    aria-label="Temporary service interruption notice"
    className={`mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 ${className}`}
  >
    <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-amber-100 shadow-sm">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" aria-hidden="true" />
      <p className="text-xs sm:text-sm leading-relaxed">
        <strong className="font-semibold text-amber-200">Temporary service interruption:</strong>{' '}
        Our website is currently experiencing a technical issue. Your previously released catalogue remains available on all DSPs, but it may not currently be visible on our website. We apologise for the inconvenience and appreciate your patience.
      </p>
    </div>
  </section>
);
