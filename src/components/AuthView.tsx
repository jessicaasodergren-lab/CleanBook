// src/components/AuthView.tsx
import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { translations, type Language } from '../i18n/translations';
import { Home, Sparkles, Lock, Mail, User, Globe } from 'lucide-react';

export const AuthView: React.FC = () => {
  const [lang, setLang] = useState<Language>('en'); // Engelska som standard
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<'host' | 'agency_admin'>('host');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [imgError, setImgError] = useState(false);

  const txt = translations.auth[lang] || translations.auth.en;

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');

    if (password.length < 6) {
      setErrorMessage(txt.errPassLength);
      setLoading(false);
      return;
    }

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              role: role,
              full_name: fullName,
              language: lang,
            },
          },
        });

        if (error) throw error;
        alert(txt.accountCreatedMsg);
        setIsSignUp(false);
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      setErrorMessage(err.message || 'Error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-10 sm:px-6 lg:px-8 text-slate-100">
      {/* SPRÅKVÄLJARE */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md flex justify-end px-4 mb-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-1.5 flex items-center gap-1 text-xs">
          <Globe className="w-3.5 h-3.5 text-slate-400 ml-1.5 mr-0.5" />
          {(['en', 'es', 'sv', 'da'] as Language[]).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setLang(l)}
              className={`px-2 py-1 rounded-xl font-bold transition uppercase ${
                lang === l ? 'bg-emerald-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              {l === 'en' ? '🇬🇧 EN' : l === 'es' ? '🇪🇸 ES' : l === 'sv' ? '🇸🇪 SV' : '🇩🇰 DA'}
            </button>
          ))}
        </div>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="flex justify-center items-center gap-3 mb-2">
          {!imgError ? (
            <img 
              src="/icon-192.png" 
              alt="CleanBook Logo" 
              className="w-10 h-10 rounded-2xl object-cover border border-emerald-400/30 shadow-lg"
              onError={() => setImgError(true)}
            />
          ) : (
            <Sparkles className="w-8 h-8 text-emerald-400" />
          )}
          <h1 className="text-3xl font-black text-white tracking-wider">CleanBook</h1>
        </div>
        <p className="text-xs font-bold text-emerald-400 uppercase tracking-widest">
          SMART CLEANING MANAGEMENT
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-slate-900 py-8 px-4 shadow-2xl sm:rounded-3xl sm:px-10 border border-slate-800">
          
          <div className="flex border-b border-slate-800 mb-6">
            <button
              type="button"
              className={`flex-1 py-3 text-center text-xs font-bold border-b-2 transition ${
                !isSignUp ? 'border-emerald-400 text-emerald-400' : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
              onClick={() => { setIsSignUp(false); setErrorMessage(''); }}
            >
              {txt.loginTab}
            </button>
            <button
              type="button"
              className={`flex-1 py-3 text-center text-xs font-bold border-b-2 transition ${
                isSignUp ? 'border-emerald-400 text-emerald-400' : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
              onClick={() => { setIsSignUp(true); setErrorMessage(''); }}
            >
              {txt.signupTab}
            </button>
          </div>

          {errorMessage && (
            <div className="mb-4 p-3 bg-rose-500/10 text-rose-400 text-xs font-bold rounded-xl border border-rose-500/20 leading-relaxed">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-4">
            {isSignUp && (
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                  {txt.roleLabel}
                </label>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <button
                    type="button"
                    onClick={() => setRole('host')}
                    className={`p-3 rounded-2xl border flex flex-col items-center gap-1.5 transition ${
                      role === 'host'
                        ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400 font-bold'
                        : 'border-slate-800 text-slate-400 hover:bg-slate-800/50'
                    }`}
                  >
                    <Home className="w-5 h-5" />
                    <span className="text-xs">{txt.hostRole}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRole('agency_admin')}
                    className={`p-3 rounded-2xl border flex flex-col items-center gap-1.5 transition ${
                      role === 'agency_admin'
                        ? 'border-sky-500/50 bg-sky-500/10 text-sky-400 font-bold'
                        : 'border-slate-800 text-slate-400 hover:bg-slate-800/50'
                    }`}
                  >
                    <Sparkles className="w-5 h-5" />
                    <span className="text-xs">{txt.cleanerRole}</span>
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">{txt.nameLabel}</label>
                  <div className="relative">
                    <User className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-500" />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder={txt.namePlaceholder}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:border-emerald-500 outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">{txt.emailLabel}</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={txt.emailPlaceholder}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:border-emerald-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">{txt.passwordLabel}</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-500" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:border-emerald-500 outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-2xl text-sm transition shadow-lg shadow-emerald-500/20 active:scale-95 disabled:opacity-50 mt-2"
            >
              {loading ? '...' : isSignUp ? txt.submitSignup : txt.submitLogin}
            </button>
          </form>

        </div>
      </div>
    </div>
  );
};