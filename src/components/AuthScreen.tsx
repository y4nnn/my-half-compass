import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { ensureUserExists } from '@/lib/sessionService';
import { Loader2, Heart, Mail, Lock, ArrowLeft } from 'lucide-react';

interface AuthScreenProps {
  onBack: () => void;
  onSuccess: () => void;
}

export function AuthScreen({ onBack, onSuccess }: AuthScreenProps) {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { signIn, signUp, user } = useAuth();
  const [authSuccess, setAuthSuccess] = useState(false);

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
    } catch (err) {
      setError('Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-warm-gradient px-6 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Back button */}
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour
        </button>

        {/* Logo */}
        <div className="text-center mb-8">
          <motion.div
            className="w-20 h-20 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center"
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            <Heart className="w-10 h-10 text-primary" />
          </motion.div>
          <h1 className="text-3xl font-display font-bold text-foreground mb-2">
            {mode === 'login' ? 'Bon retour !' : 'Bienvenue !'}
          </h1>
          <p className="text-muted-foreground">
            {mode === 'login'
              ? 'Connecte-toi pour retrouver Luna'
              : 'Crée ton compte pour commencer'}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="ton@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Mot de passe</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10"
                required
              />
            </div>
          </div>

          {mode === 'signup' && (
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>
          )}

          {error && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-sm text-red-500 text-center"
            >
              {error}
            </motion.p>
          )}

          <Button
            type="submit"
            className="w-full"
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
          <p className="text-muted-foreground">
            {mode === 'login' ? "Pas encore de compte ?" : "Déjà un compte ?"}
          </p>
          <button
            onClick={() => {
              setMode(mode === 'login' ? 'signup' : 'login');
              setError('');
            }}
            className="text-primary hover:underline font-medium"
          >
            {mode === 'login' ? "S'inscrire" : "Se connecter"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
