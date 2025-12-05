import { useState, useEffect, useRef, useCallback } from "react";
import SpotifyInput from "./components/SpotifyInput";
import ConversionProgress from "./components/ConversionProgress";
import ResultCard from "./components/ResultCard";
import IOSModal from "./components/IOSModal";
import Header from "./components/Header";
import Footer from "./components/Footer";
import { convertSpotifyUrl, checkStatus } from "./services/api";

function App() {
  const [state, setState] = useState("idle"); // idle, validating, converting, success, error
  const [spotifyUrl, setSpotifyUrl] = useState("");
  const [jobId, setJobId] = useState(null);
  const [conversionData, setConversionData] = useState(null);
  const [error, setError] = useState(null);
  const [showIOSModal, setShowIOSModal] = useState(false);

  const pollIntervalRef = useRef(null);

  // Clean up polling on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  // Poll for conversion status
  const pollStatus = useCallback(async (id) => {
    try {
      const status = await checkStatus(id);
      setConversionData(status);

      if (status.status === "completed") {
        setState("success");
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
      } else if (status.status === "error") {
        setState("error");
        setError(status.error || "Conversion failed. Please try again.");
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
      }
    } catch (err) {
      console.error("Status check error:", err);
    }
  }, []);

  // Start conversion
  const handleConvert = async () => {
    if (!spotifyUrl.trim()) return;

    setState("converting");
    setError(null);
    setConversionData(null);

    try {
      const response = await convertSpotifyUrl(spotifyUrl);

      if (response.error) {
        setState("error");
        setError(response.message || response.error);
        return;
      }

      setJobId(response.jobId);

      // Start polling for status
      pollIntervalRef.current = setInterval(() => {
        pollStatus(response.jobId);
      }, 1000);

      // Initial poll
      setTimeout(() => pollStatus(response.jobId), 500);
    } catch (err) {
      setState("error");
      setError(err.message || "Failed to start conversion. Please try again.");
    }
  };

  // Handle download click
  const handleDownload = () => {
    // Detect iOS
    const isIOS =
      /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    if (isIOS) {
      setShowIOSModal(true);
    }
  };

  // Reset to initial state
  const handleReset = () => {
    setState("idle");
    setSpotifyUrl("");
    setJobId(null);
    setConversionData(null);
    setError(null);
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  };

  // Validate Spotify or YouTube URL
  const validateUrl = (url) => {
    const spotifyTrackRegex =
      /^https?:\/\/(open\.)?spotify\.com\/track\/[a-zA-Z0-9]+/i;
    const spotifyPlaylistRegex =
      /^https?:\/\/(open\.)?spotify\.com\/playlist\/[a-zA-Z0-9]+/i;
    const youtubeRegex =
      /^https?:\/\/(www\.)?(youtube\.com\/(watch\?v=|shorts\/)|youtu\.be\/)[a-zA-Z0-9_-]+/i;
    return (
      spotifyTrackRegex.test(url) ||
      spotifyPlaylistRegex.test(url) ||
      youtubeRegex.test(url)
    );
  };

  const isValidUrl = validateUrl(spotifyUrl);

  // Generate particles for background
  const particles = Array.from({ length: 30 }, (_, i) => ({
    id: i,
    size: 2 + Math.random() * 4,
    left: Math.random() * 100,
    delay: Math.random() * 15,
    duration: 10 + Math.random() * 20,
    opacity: 0.1 + Math.random() * 0.3,
  }));

  // Generate stars for twinkling effect
  const stars = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    size: 1 + Math.random() * 2,
    left: Math.random() * 100,
    top: Math.random() * 100,
    delay: Math.random() * 5,
    duration: 2 + Math.random() * 3,
  }));

  return (
    <div className="min-h-screen min-h-[100dvh] flex flex-col relative overflow-hidden bg-[#030303]">
      {/* Modern Animated Abstract Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {/* Deep dark gradient base */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(29,185,84,0.15),transparent)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_120%,rgba(239,68,68,0.1),transparent)]"></div>

        {/* Morphing gradient blobs */}
        <div className="absolute top-[-30%] left-[-20%] w-[80%] h-[80%] bg-gradient-to-br from-spotify-green/30 via-emerald-500/20 to-transparent blur-[120px] blob blob-1"></div>
        <div className="absolute bottom-[-30%] right-[-20%] w-[70%] h-[70%] bg-gradient-to-br from-red-500/25 via-orange-500/15 to-transparent blur-[120px] blob blob-2"></div>
        <div className="absolute top-[20%] right-[-10%] w-[50%] h-[50%] bg-gradient-to-br from-purple-600/20 via-pink-500/10 to-transparent blur-[100px] blob blob-3"></div>
        <div className="absolute bottom-[10%] left-[-10%] w-[45%] h-[45%] bg-gradient-to-br from-cyan-500/15 via-blue-500/10 to-transparent blur-[100px] blob blob-4"></div>
        <div
          className="absolute top-[50%] left-[30%] w-[40%] h-[40%] bg-gradient-to-br from-yellow-500/10 via-amber-500/5 to-transparent blur-[80px] blob blob-1"
          style={{ animationDelay: "-7s" }}
        ></div>

        {/* Animated aurora effect */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[200%] h-[200%] opacity-30">
          <div className="absolute inset-0 bg-[conic-gradient(from_0deg,transparent,rgba(29,185,84,0.1),transparent,rgba(239,68,68,0.1),transparent)] aurora"></div>
        </div>

        {/* Floating orbs */}
        <div
          className="absolute top-[15%] left-[10%] w-3 h-3 rounded-full bg-spotify-green/60 blur-[2px] float orb-pulse"
          style={{ animationDelay: "0s" }}
        ></div>
        <div
          className="absolute top-[70%] right-[15%] w-2 h-2 rounded-full bg-red-500/60 blur-[1px] float orb-pulse"
          style={{ animationDelay: "-2s" }}
        ></div>
        <div
          className="absolute top-[40%] right-[25%] w-4 h-4 rounded-full bg-purple-500/40 blur-[3px] float orb-pulse"
          style={{ animationDelay: "-4s" }}
        ></div>
        <div
          className="absolute bottom-[30%] left-[20%] w-2 h-2 rounded-full bg-cyan-400/50 blur-[1px] float orb-pulse"
          style={{ animationDelay: "-1s" }}
        ></div>

        {/* Grid overlay */}
        <div className="absolute inset-0 grid-bg opacity-30"></div>

        {/* Twinkling stars */}
        {stars.map((star) => (
          <div
            key={star.id}
            className="absolute rounded-full bg-white"
            style={{
              width: `${star.size}px`,
              height: `${star.size}px`,
              left: `${star.left}%`,
              top: `${star.top}%`,
              animation: `twinkle ${star.duration}s ease-in-out infinite`,
              animationDelay: `${star.delay}s`,
            }}
          />
        ))}

        {/* Rising particles */}
        {particles.map((p) => (
          <div
            key={p.id}
            className="absolute rounded-full bg-gradient-to-t from-spotify-green to-emerald-300 particle"
            style={{
              width: `${p.size}px`,
              height: `${p.size}px`,
              left: `${p.left}%`,
              opacity: p.opacity,
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.duration}s`,
            }}
          />
        ))}

        {/* Animated lines */}
        <svg
          className="absolute inset-0 w-full h-full"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient
              id="line-gradient-1"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="0%"
            >
              <stop offset="0%" stopColor="transparent" />
              <stop offset="30%" stopColor="#1DB954" stopOpacity="0.5" />
              <stop offset="70%" stopColor="#ef4444" stopOpacity="0.5" />
              <stop offset="100%" stopColor="transparent" />
            </linearGradient>
            <linearGradient
              id="line-gradient-2"
              x1="0%"
              y1="0%"
              x2="0%"
              y2="100%"
            >
              <stop offset="0%" stopColor="transparent" />
              <stop offset="50%" stopColor="#8b5cf6" stopOpacity="0.3" />
              <stop offset="100%" stopColor="transparent" />
            </linearGradient>
          </defs>
          {/* Horizontal flowing lines */}
          <line
            x1="0"
            y1="30%"
            x2="100%"
            y2="30%"
            stroke="url(#line-gradient-1)"
            strokeWidth="1"
            className="float"
            style={{ animationDelay: "0s", opacity: 0.3 }}
          />
          <line
            x1="0"
            y1="50%"
            x2="100%"
            y2="50%"
            stroke="url(#line-gradient-1)"
            strokeWidth="0.5"
            className="float"
            style={{ animationDelay: "-2s", opacity: 0.2 }}
          />
          <line
            x1="0"
            y1="70%"
            x2="100%"
            y2="70%"
            stroke="url(#line-gradient-1)"
            strokeWidth="1"
            className="float"
            style={{ animationDelay: "-4s", opacity: 0.3 }}
          />
        </svg>

        {/* Noise texture */}
        <div className="absolute inset-0 noise-overlay"></div>

        {/* Vignette */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.7)_100%)]"></div>
      </div>

      <Header />

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-8 safe-area-top safe-area-bottom relative z-10">
        <div className="w-full max-w-md mx-auto">
          {/* Main Content */}
          <div className="space-y-6">
            {/* Ultra Stylish Logo Section */}
            <div className="text-center mb-10">
              {/* Main Riff Logo */}
              <div className="relative inline-block">
                {/* Multiple glow layers */}
                <div className="absolute inset-0 blur-3xl opacity-60">
                  <h1 className="text-6xl md:text-8xl logo-font bg-gradient-to-r from-spotify-green to-emerald-400 bg-clip-text text-transparent">
                    Riff
                  </h1>
                </div>
                <div className="absolute inset-0 blur-xl opacity-40">
                  <h1 className="text-6xl md:text-8xl logo-font bg-gradient-to-r from-red-500 to-orange-400 bg-clip-text text-transparent">
                    Riff
                  </h1>
                </div>

                {/* Main logo text */}
                <h1
                  className="relative text-6xl md:text-8xl logo-font tracking-tight logo-breathe"
                  style={{
                    textShadow:
                      "0 0 60px rgba(29,185,84,0.6), 0 0 120px rgba(29,185,84,0.3), 0 4px 12px rgba(0,0,0,0.8)",
                  }}
                >
                  <span className="bg-gradient-to-r from-spotify-green via-emerald-400 to-green-300 bg-clip-text text-transparent gradient-flow">
                    Riff
                  </span>
                </h1>

                {/* Animated equalizer bars */}
                <div className="absolute -right-10 md:-right-12 top-1/2 -translate-y-1/2 flex items-end gap-[3px] h-10">
                  {[...Array(6)].map((_, i) => (
                    <div
                      key={i}
                      className="w-[4px] rounded-full origin-bottom"
                      style={{
                        height: "100%",
                        background: `linear-gradient(to top, #1DB954, #22c55e, #fbbf24, #f97316, #ef4444)`,
                        animation: `bar-dance ${
                          0.5 + i * 0.1
                        }s ease-in-out infinite`,
                        animationDelay: `${i * 0.1}s`,
                      }}
                    />
                  ))}
                </div>

                {/* Floating music icons */}
                <span
                  className="absolute -left-8 -top-4 text-3xl float opacity-70"
                  style={{ animationDelay: "0s" }}
                >
                  🎵
                </span>
                <span
                  className="absolute -right-4 -bottom-2 text-2xl float opacity-50"
                  style={{ animationDelay: "-2s" }}
                >
                  🎶
                </span>
              </div>

              {/* Tagline with animated underline */}
              <div className="mt-6 relative">
                <p className="text-gray-400 text-sm md:text-base font-light tracking-widest uppercase">
                  <span className="text-spotify-green font-semibold">
                    Spotify
                  </span>
                  <span className="mx-2 text-gray-600">&</span>
                  <span className="text-red-500 font-semibold">YouTube</span>
                  <span className="mx-2 text-gray-600">→</span>
                  <span className="text-white font-semibold">MP3</span>
                </p>
                {/* Animated underline */}
                <div className="mt-3 mx-auto w-32 h-[2px] bg-gradient-to-r from-transparent via-spotify-green to-transparent pulse-glow"></div>
              </div>
            </div>

            {/* Input Section - shown when idle or error */}
            {(state === "idle" || state === "error") && (
              <div className="backdrop-blur-2xl bg-white/[0.03] rounded-3xl p-6 border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
                <SpotifyInput
                  value={spotifyUrl}
                  onChange={setSpotifyUrl}
                  onSubmit={handleConvert}
                  isValid={isValidUrl}
                  error={error}
                />
              </div>
            )}

            {/* Converting State */}
            {state === "converting" && conversionData && (
              <div className="backdrop-blur-2xl bg-white/[0.03] rounded-3xl p-6 border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
                <ConversionProgress data={conversionData} />
              </div>
            )}

            {/* Success State */}
            {state === "success" && conversionData && (
              <div className="backdrop-blur-2xl bg-white/[0.03] rounded-3xl p-1 border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
                <ResultCard
                  data={conversionData}
                  onDownload={handleDownload}
                  onReset={handleReset}
                />
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />

      {/* iOS Instructions Modal */}
      <IOSModal isOpen={showIOSModal} onClose={() => setShowIOSModal(false)} />
    </div>
  );
}

export default App;
