import React, { useState } from 'react';
import { Mail, Send, CheckCircle2, Clock, MapPin, Phone } from 'lucide-react';
import { api } from '../../services/api';

export const ContactSection: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) {
      setError('Please fill in your name, email, and message.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await api.submitEnquiry({
        name,
        email,
        phone,
        subject: subject || 'General Distribution Enquiry',
        message,
      });
      setSubmitted(true);
      setName('');
      setEmail('');
      setPhone('');
      setSubject('');
      setMessage('');
    } catch (err: any) {
      setError(err.message || 'Failed to submit enquiry. Please email us directly.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section id="contact" className="py-20 bg-neutral-950/80 border-b border-neutral-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          
          {/* Left info column */}
          <div className="lg:col-span-5 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-900 border border-neutral-800 text-xs font-mono text-neutral-300">
              <Mail className="w-3.5 h-3.5 text-red-500" />
              <span>Direct Artist Inquiries</span>
            </div>

            <h2 className="text-3xl sm:text-4xl font-extrabold text-white font-['Space_Grotesk'] tracking-tight">
              Get in Touch with Mid-Ama Promo™
            </h2>

            <p className="text-neutral-400 text-sm sm:text-base leading-relaxed">
              Have questions regarding our distribution pipeline, catalog onboarding, private client invitations, or playlist promotion services? Connect with our artist operations desk.
            </p>

            <div className="space-y-4 pt-4 border-t border-neutral-900">
              
              <div className="flex items-start gap-3.5">
                <div className="w-9 h-9 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-center text-red-500 shrink-0">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-mono text-neutral-400 block">Primary Contact Email</span>
                  <a
                    href="mailto:midnightamapiano@yahoo.com"
                    className="text-sm font-semibold text-white hover:text-red-400 transition-colors"
                  >
                    midnightamapiano@yahoo.com
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <div className="w-9 h-9 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-center text-red-500 shrink-0">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-mono text-neutral-400 block">Headquarters & Territory</span>
                  <span className="text-sm text-neutral-200">
                    South Africa · Worldwide Digital DSP Reach
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <div className="w-9 h-9 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-center text-red-500 shrink-0">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-mono text-neutral-400 block">Response Time</span>
                  <span className="text-sm text-neutral-200">
                    Submissions & queries answered within 24–48 hours
                  </span>
                </div>
              </div>

            </div>
          </div>

          {/* Right form column */}
          <div className="lg:col-span-7 bg-neutral-900/60 border border-neutral-800 rounded-2xl p-6 sm:p-8">
            <h3 className="text-lg font-bold text-white font-['Space_Grotesk'] mb-2">
              Send an Enquiry
            </h3>
            <p className="text-xs text-neutral-400 mb-6">
              Our A&R and distribution coordinators will review your message promptly.
            </p>

            {submitted ? (
              <div className="p-6 bg-neutral-950 border border-emerald-900/50 rounded-xl text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-950/60 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-800">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h4 className="text-base font-bold text-white font-['Space_Grotesk']">
                  Message Dispatched Successfully
                </h4>
                <p className="text-xs text-neutral-300 max-w-md mx-auto">
                  Thank you. Your inquiry has been forwarded to <strong>midnightamapiano@yahoo.com</strong> and logged in our system. We will reply shortly.
                </p>
                <button
                  type="button"
                  onClick={() => setSubmitted(false)}
                  className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-neutral-200 rounded-lg transition-colors mt-2"
                >
                  Send another inquiry
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="p-3 bg-red-950/40 border border-red-800 rounded-lg text-xs text-red-400">
                    {error}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                      Your Name / Artist Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. DJ Thabz / Piano Hub"
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-red-600 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                      Email Address <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="artist@recordlabel.com"
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-red-600 transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                      Phone / WhatsApp (Optional)
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+27 82 000 0000"
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-red-600 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                      Subject
                    </label>
                    <input
                      type="text"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="e.g. New 3-Track EP Distribution"
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-red-600 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                    Your Message / Release Outline <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Tell us about your music, upcoming project, release timeline, and distribution goals..."
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-red-600 transition-colors resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full sm:w-auto px-6 py-3 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-md shadow-red-950 flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  <span>{isSubmitting ? 'Transmitting...' : 'Submit Enquiry'}</span>
                </button>
              </form>
            )}
          </div>

        </div>

      </div>
    </section>
  );
};
