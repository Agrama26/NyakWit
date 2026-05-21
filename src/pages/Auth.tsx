import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import { Eye, EyeOff, Leaf, Loader2 } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const authSchema = z.object({
  email: z.string().trim().email("Email tidak valid").max(255, "Email terlalu panjang"),
  password: z.string().min(8, "Password minimal 8 karakter").max(72, "Password terlalu panjang"),
});

const signupSchema = authSchema.extend({
  displayName: z.string().trim().min(2, "Nama minimal 2 karakter").max(80, "Nama terlalu panjang"),
});

const Auth = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate("/history", { replace: true });
    });
  }, [navigate]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed =
      mode === "register"
        ? signupSchema.safeParse({ displayName, email, password })
        : authSchema.safeParse({ email, password });

    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Data tidak valid.");
      return;
    }

    setLoading(true);

    if (mode === "register") {
      const signupData = parsed.data as z.infer<typeof signupSchema>;
      const { error } = await supabase.auth.signUp({
        email: signupData.email,
        password: signupData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth`,
          data: { full_name: signupData.displayName },
        },
      });

      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Pendaftaran berhasil! Cek email untuk verifikasi akun.");
        setMode("login");
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email: parsed.data.email,
        password: parsed.data.password,
      });

      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Login berhasil.");
        navigate("/history");
      }
    }

    setLoading(false);
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/history`,
      },
    });
    if (error) {
      toast.error(error.message);
      setGoogleLoading(false);
    }
    // Kalau sukses browser akan redirect otomatis, tidak perlu setLoading(false)
  };

  const handleResetPassword = async () => {
    const parsedEmail = z
      .string()
      .trim()
      .email("Masukkan email yang valid")
      .safeParse(email);
    if (!parsedEmail.success) {
      toast.error(parsedEmail.error.issues[0]?.message ?? "Email tidak valid.");
      return;
    }

    setResetLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(
      parsedEmail.data,
      { redirectTo: `${window.location.origin}/reset-password` }
    );

    if (error) toast.error(error.message);
    else toast.success("Link reset password sudah dikirim ke email.");
    setResetLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col pb-20 md:pb-0">
      <Header />
      <main className="container flex flex-1 items-center justify-center py-10 md:py-14">
        <div className="grid w-full max-w-5xl gap-8 lg:grid-cols-[1fr_440px] lg:items-center">
          <section className="animate-fade-up">
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full gradient-leaf shadow-soft">
              <Leaf className="h-7 w-7 text-primary-foreground" />
            </div>
            <p className="mb-3 inline-flex rounded-full bg-accent px-3 py-1 text-xs font-semibold">
              AKUN NYAKWIT
            </p>
            <h1 className="max-w-2xl font-display text-4xl font-bold tracking-tight md:text-5xl">
              Simpan riwayat scan daun di akun pribadi.
            </h1>
            <p className="mt-4 max-w-xl text-muted-foreground">
              Login untuk melihat hasil scan sebelumnya, memantau prediksi
              penyakit, dan menjaga data tiap pengguna tetap terpisah.
            </p>
          </section>

          <Card className="gradient-card border-border/40 shadow-elegant animate-fade-up">
            <CardHeader>
              <CardTitle>{mode === "login" ? "Login" : "Buat akun"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-2 rounded-full bg-muted p-1">
                <Button
                  type="button"
                  variant={mode === "login" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setMode("login")}
                >
                  Login
                </Button>
                <Button
                  type="button"
                  variant={mode === "register" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setMode("register")}
                >
                  Register
                </Button>
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleGoogleLogin}
                disabled={googleLoading}
              >
                {googleLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : null}
                Lanjutkan dengan Google
              </Button>

              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <div className="h-px flex-1 bg-border" />
                <span>atau email</span>
                <div className="h-px flex-1 bg-border" />
              </div>

              <form className="space-y-4" onSubmit={handleSubmit}>
                {mode === "register" && (
                  <div className="space-y-2">
                    <Label htmlFor="displayName">Nama</Label>
                    <Input
                      id="displayName"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      autoComplete="name"
                      placeholder="Nama pengguna"
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    placeholder="nama@email.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete={
                        mode === "login" ? "current-password" : "new-password"
                      }
                      className="pr-11"
                      placeholder="Minimal 8 karakter"
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={
                        showPassword
                          ? "Sembunyikan password"
                          : "Tampilkan password"
                      }
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : null}
                  {mode === "login" ? "Masuk" : "Daftar"}
                </Button>
              </form>

              {mode === "login" && (
                <Button
                  type="button"
                  variant="link"
                  className="w-full"
                  onClick={handleResetPassword}
                  disabled={resetLoading}
                >
                  {resetLoading ? "Mengirim..." : "Lupa password?"}
                </Button>
              )}

              <p className="text-center text-xs text-muted-foreground">
                Setelah login, lihat riwayat scan di halaman{" "}
                <Link
                  className="font-medium text-primary-deep hover:underline"
                  to="/history"
                >
                  Riwayat
                </Link>
                .
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Auth;
