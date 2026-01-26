import { useState, useEffect } from "react";
import { Link } from "react-router-dom";

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Check for logged in user
    const storedUser = localStorage.getItem("riff_user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("riff_user");
    setUser(null);
    setMenuOpen(false);
  };

  return (
    <header className="relative z-50 py-4 px-4">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        {/* Left: SEO mini links (desktop only) */}
        <nav className="hidden lg:flex items-center gap-6 text-sm text-white/60">
          <Link to="/" className="hover:text-white transition-colors">Album Downloader</Link>
          <Link to="/playlist-downloader" className="hover:text-white transition-colors">Playlist Downloader</Link>
          <Link to="/" className="hover:text-white transition-colors">Spotify to MP3</Link>
          <a href="#" className="hover:text-white transition-colors">Changelog</a>
        </nav>

        {/* Center: Logo */}
        <div className="flex-1 lg:flex-none flex justify-center lg:absolute lg:left-1/2 lg:-translate-x-1/2">
          <Link to="/" className="flex items-center gap-2 group">
            <span className="text-2xl md:text-3xl font-black tracking-tight bg-gradient-to-r from-emerald-400 via-green-400 to-cyan-400 bg-clip-text text-transparent">
              RIFF
            </span>
            <span className="px-2 py-0.5 text-[10px] font-bold uppercase bg-purple-500/80 text-white rounded-md">
              beta
            </span>
          </Link>
        </div>

        {/* Right: Controls */}
        <div className="flex items-center gap-3">
          {/* Language (desktop) */}
          <button className="hidden md:flex items-center gap-1 px-3 py-2 rounded-full bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-sm transition-all">
            <span>EN</span>
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {user ? (
            /* Logged in state */
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-full bg-white/5">
                <div className="w-7 h-7 rounded-full bg-gradient-to-r from-violet-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                  {user.name?.charAt(0).toUpperCase() || "U"}
                </div>
                <span className="text-white/80 text-sm">{user.name}</span>
              </div>
              <button 
                onClick={handleLogout}
                className="px-4 py-2 rounded-full border border-white/20 text-white/80 hover:text-white hover:border-white/40 text-sm font-medium transition-all"
              >
                Logout
              </button>
            </div>
          ) : (
            /* Logged out state */
            <>
              <Link 
                to="/login" 
                className="hidden sm:block px-4 py-2 rounded-full border border-white/20 text-white/80 hover:text-white hover:border-white/40 text-sm font-medium transition-all"
              >
                Login
              </Link>
              <a href="#" className="px-4 py-2 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 text-black text-sm font-bold shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 hover:scale-[1.02] transition-all">
                Get Premium
              </a>
            </>
          )}

          {/* Mobile menu */}
          <button 
            onClick={() => setMenuOpen(!menuOpen)}
            className="lg:hidden p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
          >
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {menuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile menu dropdown */}
      {menuOpen && (
        <div className="lg:hidden absolute top-full left-0 right-0 mt-2 mx-4 p-4 rounded-2xl bg-[#1a1a2e]/95 backdrop-blur-xl border border-white/10 shadow-2xl">
          <nav className="flex flex-col gap-2">
            <Link to="/" onClick={() => setMenuOpen(false)} className="px-4 py-3 rounded-xl text-white/70 hover:text-white hover:bg-white/5 transition-all">Album Downloader</Link>
            <Link to="/playlist-downloader" onClick={() => setMenuOpen(false)} className="px-4 py-3 rounded-xl text-white/70 hover:text-white hover:bg-white/5 transition-all">Playlist Downloader</Link>
            <Link to="/" onClick={() => setMenuOpen(false)} className="px-4 py-3 rounded-xl text-white/70 hover:text-white hover:bg-white/5 transition-all">Spotify to MP3</Link>
            <a href="#" className="px-4 py-3 rounded-xl text-white/70 hover:text-white hover:bg-white/5 transition-all">Changelog</a>
            <hr className="border-white/10 my-2" />
            {user ? (
              <>
                <div className="px-4 py-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-violet-500 to-purple-500 flex items-center justify-center text-white text-sm font-bold">
                    {user.name?.charAt(0).toUpperCase() || "U"}
                  </div>
                  <div>
                    <p className="text-white font-medium">{user.name}</p>
                    <p className="text-white/50 text-xs">{user.email}</p>
                  </div>
                </div>
                <button 
                  onClick={handleLogout}
                  className="px-4 py-3 rounded-xl text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all text-left"
                >
                  Logout
                </button>
              </>
            ) : (
              <Link 
                to="/login" 
                onClick={() => setMenuOpen(false)}
                className="px-4 py-3 rounded-xl text-white/70 hover:text-white hover:bg-white/5 transition-all"
              >
                Login
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
