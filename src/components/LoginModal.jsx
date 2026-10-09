import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function LoginModal({ open, onClose }) {
  const { login } = useAuth();
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const nameRef = useRef(null);

  useEffect(() => {
    if (open) {
      setError('');
      const t = setTimeout(() => nameRef.current?.focus(), 60);
      const onKey = (e) => { if (e.key === 'Escape') onClose(); };
      window.addEventListener('keydown', onKey);
      document.body.style.overflow = 'hidden';
      return () => {
        clearTimeout(t);
        window.removeEventListener('keydown', onKey);
        document.body.style.overflow = '';
      };
    }
  }, [open, onClose]);

  if (!open) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('กรุณากรอกชื่อ / Please enter your name');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('กรุณากรอกอีเมลให้ถูกต้อง / Please enter a valid email');
      return;
    }
    const next = login({ name, email });
    toast(`ยินดีต้อนรับ ${next.name} 👋`);
    setName('');
    setEmail('');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Sign in"
    >
      <button
        aria-label="Close sign in"
        onClick={onClose}
        className="absolute inset-0 bg-background/70 backdrop-blur-sm fade-in cursor-default"
      />
      <div className="relative w-full max-w-sm rounded-3xl bg-metallic-card border border-silver-900/80 shadow-apple-2xl overflow-hidden fade-up">
        <div aria-hidden="true" className="absolute inset-0 bg-metallic-sheen pointer-events-none" />
        <div aria-hidden="true" className="absolute inset-0 hairline-border pointer-events-none rounded-3xl" />

        <div className="relative z-10 p-6 sm:p-7">
          <div className="flex items-start justify-between mb-1">
            <div className="flex items-center justify-center size-11 rounded-2xl bg-metallic-button text-background shadow-apple-sm border border-silver-400/30">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              className="inline-flex size-9 items-center justify-center rounded-full border border-silver-800/80 bg-glass-light text-muted hover:text-foreground transition-colors active-scale"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2" strokeLinecap="round">
                <path d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <h2 className="font-display text-xl font-bold tracking-apple-tight text-foreground mt-4">
            เข้าสู่ระบบ
          </h2>
          <p className="text-[13px] text-muted mt-1 leading-apple-relaxed">
            Sign in to sync your bag, track orders faster &amp; check out in 1 click.
          </p>

          <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-3" noValidate>
            <label className="block">
              <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-silver-300">Name</span>
              <input
                ref={nameRef}
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="เช่น Siri K."
                autoComplete="name"
                className="mt-1.5 w-full h-12 px-4 rounded-2xl border border-silver-800/80 bg-surface-500/80
                           text-[14px] text-foreground placeholder:text-muted/70
                           focus:outline-none focus:border-silver-500 focus:shadow-[0_0_0_3px_rgba(161,161,166,0.12)]
                           transition-all"
              />
            </label>
            <label className="block">
              <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-silver-300">Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@email.com"
                autoComplete="email"
                className="mt-1.5 w-full h-12 px-4 rounded-2xl border border-silver-800/80 bg-surface-500/80
                           text-[14px] text-foreground placeholder:text-muted/70
                           focus:outline-none focus:border-silver-500 focus:shadow-[0_0_0_3px_rgba(161,161,166,0.12)]
                           transition-all"
              />
            </label>

            {error && (
              <p className="text-[12px] font-medium text-destructive" role="alert">{error}</p>
            )}

            <button
              type="submit"
              className="mt-1 w-full h-12 rounded-2xl bg-metallic-button hover:bg-metallic-button-hover text-background
                         font-bold text-[14px] tracking-wide shadow-apple hover:shadow-apple-lg active-scale
                         border border-silver-400/30 transition-all"
            >
              Continue →
            </button>
            <p className="text-center text-[11px] text-muted/70 leading-relaxed">
              Demo session — saved on this device only.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
