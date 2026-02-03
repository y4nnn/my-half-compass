import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { ensureUserExists } from '@/lib/sessionService';
import { Loader2, Mail, Lock } from 'lucide-react';

interface WelcomeScreenProps {
  onSuccess: () => void;
}

export function WelcomeScreen({ onSuccess }: WelcomeScreenProps) {
  const [showAuth, setShowAuth] = useState(false);
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { signIn, signUp, user } = useAuth();
  const [authSuccess, setAuthSuccess] = useState(false);

  // If already logged in, skip straight through
  useEffect(() => {
    if (user) {
      onSuccess();
    }
  }, [user, onSuccess]);

  // When auth succeeds and user is available, proceed
  useEffect(() => {
    if (authSuccess && user) {
      ensureUserExists(user.id, user.email ?? undefined).then(() => {
        onSuccess();
      });
    }
  }, [authSuccess, user, onSuccess]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (mode === 'signup' && password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères');
      setLoading(false);
      return;
    }

    try {
      if (mode === 'login') {
        const { error } = await signIn(email, password);
        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            setError('Email ou mot de passe incorrect');
          } else {
            setError(error.message);
          }
        } else {
          setAuthSuccess(true);
        }
      } else {
        const { error } = await signUp(email, password);
        if (error) {
          if (error.message.includes('already registered')) {
            setError('Cet email est déjà utilisé');
          } else {
            setError(error.message);
          }
        } else {
          setAuthSuccess(true);
        }
      }
    } catch {
      setError('Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-warm-gradient relative overflow-hidden">
      {/* Subtle ambient glow behind logo */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-cyan-400/5 blur-[120px]" />
      </div>

      <AnimatePresence mode="wait">
        {!showAuth ? (
          /* Logo screen */
          <motion.div
            key="logo"
            className="flex flex-col items-center justify-center text-center px-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -40 }}
            transition={{ duration: 0.5 }}
          >
            <motion.img
              src="/echo-logo.png"
              alt="Echo"
              className="w-48 h-48 object-contain mb-8"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.8, ease: 'easeOut' }}
            />

            <motion.h1
              className="text-4xl font-display font-bold text-white mb-2 tracking-tight"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.6 }}
            >
              Echo
            </motion.h1>

            <motion.p
              className="text-lg text-white/50 mb-12"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7, duration: 0.6 }}
            >
              Trouve ton écho
            </motion.p>

            <motion.div
              className="w-full max-w-xs"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1, duration: 0.5 }}
            >
              <Button
                onClick={() => setShowAuth(true)}
                size="lg"
                className="w-full h-14 text-lg rounded-2xl font-semibold shadow-glow transition-all hover:shadow-warm hover:scale-[1.02] bg-cyan-500 hover:bg-cyan-400 text-white"
              >
                Commencer
              </Button>
            </motion.div>
          </motion.div>
        ) : (
          /* Auth form */
          <motion.div
            key="auth"
            className="w-full max-w-sm px-6"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            {/* Small logo at top */}
            <motion.div
              className="flex flex-col items-center mb-8"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.4 }}
            >
              <img
                src="/echo-logo.png"
                alt="Echo"
                className="w-16 h-16 object-contain mb-3"
              />
              <h2 className="text-xl font-display font-bold text-white">
                {mode === 'login' ? 'Bon retour' : 'Bienvenue'}
              </h2>
              <p className="text-sm text-white/40 mt-1">
                {mode === 'login'
                  ? 'Connecte-toi pour retrouver Luna'
                  : 'Crée ton compte pour commencer'}
              </p>
            </motion.div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-white/70">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="ton@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 bg-white/10 border-white/10 text-white placeholder:text-white/25 focus:border-cyan-400/50 focus:ring-cyan-400/20"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-white/70">Mot de passe</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 bg-white/10 border-white/10 text-white placeholder:text-white/25 focus:border-cyan-400/50 focus:ring-cyan-400/20"
                    required
                  />
                </div>
              </div>

              <AnimatePresence>
                {mode === 'signup' && (
                  <motion.div
                    className="space-y-2"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Label htmlFor="confirmPassword" className="text-white/70">Confirmer</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                      <Input
                        id="confirmPassword"
                        type="password"
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="pl-10 bg-white/10 border-white/10 text-white placeholder:text-white/25 focus:border-cyan-400/50 focus:ring-cyan-400/20"
                        required
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {error && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-sm text-red-400 text-center"
                >
                  {error}
                </motion.p>
              )}

              <Button
                type="submit"
                className="w-full h-12 rounded-2xl font-semibold bg-cyan-500 hover:bg-cyan-400 text-white shadow-glow"
                size="lg"
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : mode === 'login' ? (
                  'Se connecter'
                ) : (
                  "S'inscrire"
                )}
              </Button>
            </form>

            {/* Toggle mode */}
            <div className="mt-6 text-center">
              <p className="text-white/40 text-sm">
                {mode === 'login' ? 'Pas encore de compte ?' : 'Déjà un compte ?'}
              </p>
              <button
                onClick={() => {
                  setMode(mode === 'login' ? 'signup' : 'login');
                  setError('');
                }}
                className="text-cyan-400 hover:text-cyan-300 font-medium text-sm mt-1"
              >
                {mode === 'login' ? "S'inscrire" : 'Se connecter'}
              </button>
            </div>

            {/* Back to logo */}
            <motion.button
              onClick={() => setShowAuth(false)}
              className="mt-8 w-full text-center text-white/30 hover:text-white/50 text-sm transition-colors"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              Retour
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
