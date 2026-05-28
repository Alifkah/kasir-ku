'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Lock, User, Store, Phone, ArrowRight, ChevronLeft } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

export default function RegisterPage() {
  const router = useRouter();
  const { login } = useStore();
  
  const [name, setName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name || !businessName || !email || !password) {
      toast.error('Silakan lengkapi kolom yang wajib diisi');
      return;
    }

    if (password.length < 6) {
      toast.error('Kata sandi harus minimal 6 karakter');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          businessName,
          email,
          phone,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Gagal melakukan pendaftaran');
      }

      toast.success('Pendaftaran berhasil! Mencoba masuk secara otomatis...');
      
      // Auto login after successful registration
      const loginRes = await login(email, 'Owner', password);
      
      setIsLoading(false);

      if (loginRes.success) {
        toast.success(`Selamat datang, ${name}! Bisnis Anda ${businessName} berhasil dibuat.`);
        router.push('/dashboard');
      } else {
        toast.info('Pendaftaran sukses. Silakan masuk secara manual.');
        router.push('/login');
      }
    } catch (err: any) {
      setIsLoading(false);
      toast.error(err.message || 'Terjadi kesalahan saat mendaftarkan akun');
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-950/40 via-zinc-950 to-black px-4 py-12 overflow-hidden">
      {/* Decorative Blur Orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-primary/10 blur-[100px] animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-emerald-500/5 blur-[100px] animate-pulse delay-700" />

      <div className="w-full max-w-md z-10 space-y-6">
        {/* Back Button */}
        <button
          onClick={() => router.push('/login')}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-all cursor-pointer group bg-zinc-900/40 px-3 py-1.5 rounded-full border border-border/20 backdrop-blur-md"
        >
          <ChevronLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
          Kembali ke Login
        </button>

        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary text-white shadow-xl shadow-primary/20 glow-primary mb-2">
            <Store className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-black text-foreground tracking-tight sm:text-3xl">
            Daftar <span className="text-primary">KasirKu</span>
          </h1>
          <p className="text-xs text-muted-foreground max-w-xs mx-auto">
            Mulai kelola outlet POS & inventori bisnis Anda dengan mudah dan efisien.
          </p>
        </div>

        {/* Registration Card */}
        <Card className="border-border/60 bg-zinc-900/60 backdrop-blur-xl shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-primary via-indigo-500 to-emerald-500" />

          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-bold">Registrasi Owner Baru</CardTitle>
            <CardDescription className="text-xs">
              Lengkapi formulir di bawah ini untuk membuat akun Owner bisnis Anda.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name Input */}
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-xs text-muted-foreground">
                  Nama Lengkap <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="name"
                    type="text"
                    placeholder="Nama Lengkap Anda"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="pl-9 bg-zinc-950/40 border-border/40 text-sm h-10 focus:border-primary focus:ring-1 focus:ring-primary"
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* Business Name Input */}
              <div className="space-y-1.5">
                <Label htmlFor="businessName" className="text-xs text-muted-foreground">
                  Nama Bisnis / Toko <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Store className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="businessName"
                    type="text"
                    placeholder="Contoh: Toko Maju Jaya"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    className="pl-9 bg-zinc-950/40 border-border/40 text-sm h-10 focus:border-primary focus:ring-1 focus:ring-primary"
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* Email Input */}
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs text-muted-foreground">
                  Email Kantor / Owner <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="nama@bisnisanda.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9 bg-zinc-950/40 border-border/40 text-sm h-10 focus:border-primary focus:ring-1 focus:ring-primary"
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* Phone Input */}
              <div className="space-y-1.5">
                <Label htmlFor="phone" className="text-xs text-muted-foreground">
                  Nomor Telepon
                </Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="Contoh: 08123456789"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="pl-9 bg-zinc-950/40 border-border/40 text-sm h-10 focus:border-primary focus:ring-1 focus:ring-primary"
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs text-muted-foreground">
                  Kata Sandi <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Minimal 6 karakter"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9 bg-zinc-950/40 border-border/40 text-sm h-10 focus:border-primary focus:ring-1 focus:ring-primary"
                    required
                    disabled={isLoading}
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
                  'Mendaftarkan...'
                ) : (
                  <>
                    Daftar Sekarang <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </form>
          </CardContent>

          <CardFooter className="pt-4 pb-6 flex flex-col items-center justify-center border-t border-border/20 bg-zinc-950/20">
            <p className="text-xs text-muted-foreground">
              Sudah memiliki akun?{' '}
              <button
                type="button"
                onClick={() => router.push('/login')}
                className="text-primary hover:text-primary/80 hover:underline font-semibold cursor-pointer transition-all"
                disabled={isLoading}
              >
                Masuk Sekarang
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
