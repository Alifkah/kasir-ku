'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Lock, UserCheck, Store, ArrowRight } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState(''); // Visual only in prototype
  const [role, setRole] = useState<'Owner' | 'Cashier'>('Owner');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error('Silakan isi email Anda');
      return;
    }

    setIsLoading(true);

    try {
      const res = await login(email, role, password);
      setIsLoading(false);

      if (res.success) {
        toast.success(`Selamat datang kembali, ${role === 'Owner' ? 'Owner' : 'Kasir'}!`);
        if (role === 'Owner') {
          router.push('/dashboard');
        } else {
          router.push('/pos');
        }
      } else {
        toast.error(res.error || 'Kredensial salah atau tidak terdaftar untuk peran ini');
      }
    } catch (err) {
      setIsLoading(false);
      toast.error('Terjadi kendala saat memverifikasi sesi login');
    }
  };


  return (
    <div className="relative min-h-screen flex items-center justify-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-950/40 via-zinc-950 to-black px-4 overflow-hidden">
      {/* Decorative Blur Orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-primary/10 blur-[100px] animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-emerald-500/5 blur-[100px] animate-pulse delay-700" />

      <div className="w-full max-w-md z-10 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary text-white shadow-xl shadow-primary/20 glow-primary mb-2">
            <Store className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-black text-foreground tracking-tight sm:text-3xl">
            Kasir<span className="text-primary">Ku</span>
          </h1>
          <p className="text-xs text-muted-foreground max-w-xs mx-auto">
            Multi-Outlet POS & Inventory SaaS Premium untuk Usaha Ritel & F&B Indonesia
          </p>
        </div>

        {/* Login Card */}
        <Card className="border-border/60 bg-zinc-900/60 backdrop-blur-xl shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-primary via-indigo-500 to-emerald-500" />

          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-bold">Masuk ke Sistem</CardTitle>
            <CardDescription className="text-xs">
              Silakan masukkan akun terdaftar Anda untuk memulai sesi kasir.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Role Toggle Tabs */}
              <div className="grid grid-cols-2 p-1 rounded-lg bg-zinc-950/60 border border-border/20">
                <button
                  type="button"
                  onClick={() => setRole('Owner')}
                  className={`py-2 text-xs font-semibold rounded-md transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    role === 'Owner'
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  Owner / Pemilik
                </button>
                <button
                  type="button"
                  onClick={() => setRole('Cashier')}
                  className={`py-2 text-xs font-semibold rounded-md transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    role === 'Cashier'
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Store className="w-3.5 h-3.5" />
                  Staf / Kasir
                </button>
              </div>

              {/* Email Input */}
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs text-muted-foreground">
                  Email Kantor / Outlet
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="nama@kasirku.id"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9 bg-zinc-950/40 border-border/40 text-sm h-10 focus:border-primary focus:ring-1 focus:ring-primary"
                    required
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs text-muted-foreground">
                  Kata Sandi
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9 bg-zinc-950/40 border-border/40 text-sm h-10 focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full bg-primary hover:bg-primary/90 text-white font-bold h-10 rounded-lg shadow-lg hover:shadow-primary/10 transition-all gap-1.5 mt-2 cursor-pointer"
                disabled={isLoading}
              >
                {isLoading ? (
                  'Memverifikasi...'
                ) : (
                  <>
                    Masuk Sesi <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </form>
          </CardContent>

          {/* Register Redirect Link */}
          <CardFooter className="pt-4 pb-6 flex flex-col items-center justify-center border-t border-border/20 bg-zinc-950/20">
            <p className="text-xs text-muted-foreground">
              Belum memiliki akun Owner?{' '}
              <button
                type="button"
                onClick={() => router.push('/register')}
                className="text-primary hover:text-primary/80 hover:underline font-semibold cursor-pointer transition-all"
              >
                Daftar Bisnis Anda
              </button>
            </p>
          </CardFooter>
        </Card>

        {/* Footer info */}
        <p className="text-center text-[10px] text-muted-foreground/60">
          KasirKu v0.1.0 © 2026. Semua Hak Dilindungi.
        </p>
      </div>
    </div>
  );
}
