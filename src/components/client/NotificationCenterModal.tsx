import React, { useState, useEffect } from 'react';
import { X, Mail, Bell, CheckCircle2, AlertTriangle, ShieldCheck, Clock, RefreshCw } from 'lucide-react';
import { api } from '../../services/api';
import { NotificationLog } from '../../types';

interface NotificationCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationCenterModal: React.FC<NotificationCenterModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [notifications, setNotifications] = useState<NotificationLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifs = async () => {
    try {
      setLoading(true);
      const res = await api.getNotifications();
      setNotifications(res.notifications);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchNotifs();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const getTemplateBadge = (template: NotificationLog['template']) => {
    switch (template) {
      case 'submission_received':
        return { label: 'Submission Received', color: 'text-cyan-400 bg-cyan-950/40 border-cyan-800' };
      case 'corrections_required':
        return { label: 'Corrections Required', color: 'text-red-400 bg-red-950/40 border-red-800' };
      case 'approved_distribution':
        return { label: 'Approved & Distributed', color: 'text-emerald-400 bg-emerald-950/40 border-emerald-800' };
      case 'invitation':
        return { label: 'Client Invitation', color: 'text-purple-400 bg-purple-950/40 border-purple-800' };
      case 'password_reset':
        return { label: 'Password Reset', color: 'text-amber-400 bg-amber-950/40 border-amber-800' };
      default:
        return { label: 'System Notice', color: 'text-neutral-400 bg-neutral-900 border-neutral-800' };
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-neutral-950 border border-neutral-800 rounded-2xl shadow-2xl p-6 overflow-hidden">
        
        <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-center text-red-500">
              <Mail className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white font-['Space_Grotesk']">
                Email Dispatch & Audit Trail
              </h3>
              <p className="text-xs text-neutral-400">
                Log of notifications dispatched to clients by Mid-Ama Promo.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchNotifs}
              className="p-2 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-900 transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-900 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="py-4 max-h-[60vh] overflow-y-auto space-y-3">
          {loading ? (
            <div className="py-12 text-center text-xs text-neutral-400 font-mono">
              Loading notification logs...
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-12 text-center text-xs text-neutral-500 font-mono">
              No email notifications recorded yet.
            </div>
          ) : (
            notifications.map((notif) => {
              const badge = getTemplateBadge(notif.template);
              return (
                <div
                  key={notif.id}
                  className="p-4 bg-neutral-900/60 border border-neutral-800 rounded-xl space-y-2 text-xs"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border self-start ${badge.color}`}>
                      {badge.label}
                    </span>
                    <span className="text-[10px] font-mono text-neutral-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(notif.sentAt).toLocaleString()}
                    </span>
                  </div>

                  <h4 className="text-sm font-semibold text-white">
                    {notif.subject}
                  </h4>

                  <div className="flex items-center justify-between pt-2 border-t border-neutral-800/80 text-[11px] text-neutral-400 font-mono">
                    <span>Recipient: {notif.recipientEmail}</span>
                    <span className="text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>{notif.status}</span>
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

      </div>
    </div>
  );
};
