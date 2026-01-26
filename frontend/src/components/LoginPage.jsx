import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function LoginPage() {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: ""
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Basic validation
    if (!formData.email || !formData.password) {
      setError("Please fill in all fields");
      setLoading(false);
      return;
    }

    if (!isLogin && !formData.name) {
      setError("Please enter your name");
      setLoading(false);
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError("Please enter a valid email address");
      setLoading(false);
      return;
    }

    // Password validation
    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters");
      setLoading(false);
      return;
    }

    // Simulate API call
    setTimeout(() => {
      // Store user in localStorage
      const user = {
        email: formData.email,
        name: formData.name || formData.email.split("@")[0],
        isPremium: false,
        createdAt: new Date().toISOString()
      };
      
      localStorage.setItem("riff_user", JSON.stringify(user));
      setLoading(false);
      navigate("/");
    }, 1000);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#030303] relative overflow-hidden">
      {/* Background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(139,92,246,0.15),transparent)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_120%,rgba(29,185,84,0.1),transparent)]"></div>
        <div className="absolute top-[-30%] left-[-20%] w-[80%] h-[80%] bg-gradient-to-br from-purple-600/20 via-violet-500/10 to-transparent blur-[120px]"></div>
        <div className="absolute bottom-[-30%] right-[-20%] w-[70%] h-[70%] bg-gradient-to-br from-emerald-500/15 via-green-500/10 to-transparent blur-[120px]"></div>
      </div>

      {/* Header */}
      <header className="relative z-50 py-4 px-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <a href="/" className="flex items-center gap-2 group">
            <span className="text-2xl md:text-3xl font-black tracking-tight bg-gradient-to-r from-emerald-400 via-green-400 to-cyan-400 bg-clip-text text-transparent">
              RIFF
            </span>
            <span className="px-2 py-0.5 text-[10px] font-bold uppercase bg-purple-500/80 text-white rounded-md">
              beta
            </span>
          </a>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex items-center justify-center px-4 py-12 relative z-10">
        <div className="w-full max-w-md">
          {/* Login card */}
          <div className="rounded-2xl bg-[#1a1a2e]/80 backdrop-blur-xl border border-white/10 shadow-2xl p-8">
            {/* Toggle tabs */}
            <div className="flex mb-8 rounded-xl bg-white/5 p-1">
              <button
                onClick={() => setIsLogin(true)}
                className={`flex-1 py-3 rounded-lg text-sm font-semibold transition-all ${
                  isLogin 
                    ? "bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-lg" 
                    : "text-white/60 hover:text-white"
                }`}
              >
                Sign In
              </button>
              <button
                onClick={() => setIsLogin(false)}
                className={`flex-1 py-3 rounded-lg text-sm font-semibold transition-all ${
                  !isLogin 
                    ? "bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-lg" 
                    : "text-white/60 hover:text-white"
                }`}
              >
                Sign Up
              </button>
            </div>

            {/* Title */}
            <h1 className="text-2xl font-bold text-white mb-2">
              {isLogin ? "Welcome back" : "Create account"}
            </h1>
            <p className="text-white/50 text-sm mb-6">
              {isLogin 
                ? "Sign in to access your downloads and preferences" 
                : "Join Riff to save your downloads and more"}
            </p>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div>
                  <label className="block text-white/70 text-sm mb-2">Name</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Your name"
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 outline-none focus:border-purple-500/50 transition-colors"
                  />
                </div>
              )}

              <div>
                <label className="block text-white/70 text-sm mb-2">Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="your@email.com"
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 outline-none focus:border-purple-500/50 transition-colors"
                />
              </div>

              <div>
                <label className="block text-white/70 text-sm mb-2">Password</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 outline-none focus:border-purple-500/50 transition-colors"
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20">
                  <span className="text-red-400">⚠️</span>
                  <p className="text-red-300 text-sm">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className={`w-full py-3.5 rounded-xl font-semibold text-sm uppercase tracking-wide transition-all ${
                  loading
                    ? "bg-white/10 text-white/50 cursor-wait"
                    : "bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50"
                }`}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </span>
                ) : isLogin ? "Sign In" : "Create Account"}
              </button>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-4 my-6">
              <div className="flex-1 h-px bg-white/10"></div>
              <span className="text-white/30 text-xs">OR</span>
              <div className="flex-1 h-px bg-white/10"></div>
            </div>

            {/* Social login buttons */}
            <div className="space-y-3">
              <button className="w-full flex items-center justify-center gap-3 py-3 rounded-xl bg-white/5 border border-white/10 text-white/80 hover:bg-white/10 hover:text-white transition-all">
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </button>
            </div>

            {/* Footer text */}
            <p className="text-center text-white/30 text-xs mt-6">
              By continuing, you agree to our{" "}
              <a href="#" className="text-purple-400 hover:underline">Terms</a>
              {" "}and{" "}
              <a href="#" className="text-purple-400 hover:underline">Privacy Policy</a>
            </p>
          </div>

          {/* Back to home */}
          <div className="text-center mt-6">
            <a href="/" className="text-white/50 hover:text-white text-sm transition-colors">
              ← Back to home
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}
