import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import Header from "./Header";
import Footer from "./Footer";
import { convertSpotifyUrl, checkStatus } from "../services/api";

export default function PlaylistDownloader() {
  const [url, setUrl] = useState("");
  const [state, setState] = useState("idle"); // idle, loading, converting, success, error
  const [error, setError] = useState("");
  const [conversionData, setConversionData] = useState(null);
  const [jobId, setJobId] = useState(null);
  const inputRef = useRef(null);
  const pollIntervalRef = useRef(null);

  // Placeholder animation
  const placeholderVariants = [
    'Spotify playlist link...',
    'YouTube playlist link...'
  ];
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [placeholderText, setPlaceholderText] = useState(placeholderVariants[0]);

  useEffect(() => {
    let timer = null;
    let busy = false;

    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

    const typeVariantSwap = async (fromVariant, toVariant, nextIndex) => {
      busy = true;
      const eraseSpeed = 18;
      const typeSpeed = 22;

      for (let len = fromVariant.length; len >= 0; len--) {
        if (inputRef.current && inputRef.current.value.trim()) { busy = false; return; }
        setPlaceholderText(fromVariant.slice(0, len));
        await sleep(eraseSpeed);
      }

      for (let len = 0; len <= toVariant.length; len++) {
        if (inputRef.current && inputRef.current.value.trim()) { busy = false; return; }
        setPlaceholderText(toVariant.slice(0, len));
        await sleep(typeSpeed);
      }

      setPlaceholderIndex(nextIndex);
      busy = false;
    };

    const schedule = async () => {
      if (busy) return;
      const next = (placeholderIndex + 1) % placeholderVariants.length;
      await typeVariantSwap(placeholderVariants[placeholderIndex], placeholderVariants[next], next);
      timer = setTimeout(schedule, 3000);
    };

    timer = setTimeout(schedule, 3000);
    return () => clearTimeout(timer);
  }, [placeholderIndex]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  // Validate playlist URL
  const validatePlaylistUrl = (input) => {
    const spotifyPlaylistRegex = /^https?:\/\/(open\.)?spotify\.com\/playlist\/[a-zA-Z0-9]+/i;
    const youtubePlaylistRegex = /^https?:\/\/(www\.)?(youtube\.com\/playlist\?list=|youtube\.com\/watch\?.*list=)[a-zA-Z0-9_-]+/i;
    return spotifyPlaylistRegex.test(input) || youtubePlaylistRegex.test(input);
  };

  const isValid = validatePlaylistUrl(url);

  // Get platform from URL
  const getPlatform = () => {
    if (url.includes("spotify.com")) return "spotify";
    if (url.includes("youtube.com") || url.includes("youtu.be")) return "youtube";
    return null;
  };

  // Handle paste
  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setUrl(text);
    } catch (err) {
      console.error("Failed to read clipboard:", err);
    }
  };

  // Handle clear
  const handleClear = () => {
    setUrl("");
    inputRef.current?.focus();
  };

  // Poll for status
  const pollStatus = async (id) => {
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
  };

  // Handle submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isValid) return;

    setState("converting");
    setError("");
    setConversionData(null);

    try {
      const response = await convertSpotifyUrl(url);

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

  // Reset
  const handleReset = () => {
    setState("idle");
    setUrl("");
    setJobId(null);
    setConversionData(null);
    setError("");
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#030303] relative overflow-hidden">
      {/* Background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(29,185,84,0.15),transparent)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_120%,rgba(239,68,68,0.1),transparent)]"></div>
        <div className="absolute top-[-30%] left-[-20%] w-[80%] h-[80%] bg-gradient-to-br from-green-600/20 via-emerald-500/10 to-transparent blur-[120px]"></div>
        <div className="absolute bottom-[-30%] right-[-20%] w-[70%] h-[70%] bg-gradient-to-br from-red-500/15 via-orange-500/10 to-transparent blur-[120px]"></div>
      </div>

      <Header />

      <main className="flex-1 flex flex-col items-center px-4 pt-8 pb-12 relative z-10">
        <div className="w-full max-w-2xl mx-auto">
          {/* Page Title */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 border border-green-500/20 mb-6">
              <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <span className="text-green-400 text-sm font-medium">Playlist Downloader</span>
            </div>

            <h1 className="text-4xl md:text-5xl font-black text-white mb-4">
              Download Full{" "}
              <span className="bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">Playlists</span>
            </h1>
            <p className="text-white/50 text-lg max-w-lg mx-auto">
              Convert entire Spotify or YouTube playlists to MP3. Get all your favorite tracks in one ZIP download.
            </p>
          </div>

          {/* Input Section */}
          {(state === "idle" || state === "error") && (
            <form onSubmit={handleSubmit} className="w-full mb-8">
              <div className="space-y-4">
                {/* Input Box */}
                <div className="relative rounded-2xl bg-[#1a1a2e]/80 backdrop-blur-xl border border-white/10 shadow-2xl shadow-black/50">
                  <div className="flex items-center gap-3 px-5 py-4">
                    {/* Platform icon */}
                    <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${
                      getPlatform() === "spotify" ? "bg-green-500/20" : 
                      getPlatform() === "youtube" ? "bg-red-500/20" : "bg-white/5"
                    }`}>
                      {getPlatform() === "spotify" ? (
                        <svg className="w-5 h-5 text-green-400" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                        </svg>
                      ) : getPlatform() === "youtube" ? (
                        <svg className="w-5 h-5 text-red-400" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                        </svg>
                      ) : (
                        <svg className="w-5 h-5 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                      )}
                    </div>

                    {/* Input */}
                    <div className="relative flex-1">
                      <input
                        ref={inputRef}
                        type="text"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder=""
                        className="w-full bg-transparent text-white outline-none text-base pr-2"
                        autoComplete="off"
                      />
                      {!url && (
                        <div className="absolute inset-0 flex items-center pointer-events-none">
                          <span className="text-white/40 text-base">Paste a {placeholderText}</span>
                        </div>
                      )}
                    </div>

                    {/* Buttons */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {url ? (
                        <button
                          type="button"
                          onClick={handleClear}
                          className="p-2 rounded-lg hover:bg-white/10 transition-colors text-white/60 hover:text-white"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={handlePaste}
                          className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 text-sm font-medium transition-all"
                        >
                          Paste
                        </button>
                      )}

                      <button 
                        type="submit" 
                        disabled={!isValid}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm uppercase tracking-wide transition-all ${
                          isValid 
                            ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white shadow-lg shadow-green-500/30 hover:shadow-green-500/50 hover:scale-[1.02] active:scale-[0.98]' 
                            : 'bg-white/5 text-white/30 cursor-not-allowed'
                        }`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Download
                      </button>
                    </div>
                  </div>
                </div>

                {/* Error */}
                {error && (
                  <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20">
                    <span className="text-red-400">⚠️</span>
                    <p className="text-red-300 text-sm">{error}</p>
                  </div>
                )}
              </div>
            </form>
          )}

          {/* Converting State */}
          {state === "converting" && (
            <div className="rounded-2xl bg-[#1a1a2e]/80 backdrop-blur-xl border border-white/10 p-8 mb-8">
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-green-400 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Processing Playlist...</h3>
                <p className="text-white/50 mb-4">This may take a few minutes depending on playlist size</p>
                {conversionData && (
                  <div className="text-sm text-white/70">
                    <p>{conversionData.title || "Fetching playlist info..."}</p>
                    {conversionData.progress && (
                      <div className="mt-3">
                        <div className="w-64 h-2 bg-white/10 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-300"
                            style={{ width: `${conversionData.progress}%` }}
                          ></div>
                        </div>
                        <p className="mt-2 text-white/50">{conversionData.progress}% complete</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Success State */}
          {state === "success" && conversionData && (
            <div className="rounded-2xl bg-[#1a1a2e]/80 backdrop-blur-xl border border-white/10 overflow-hidden mb-8">
              {/* Header */}
              <div className="p-6 border-b border-white/10">
                <div className="flex items-center gap-4">
                  {conversionData.coverUrl && (
                    <img src={conversionData.coverUrl} alt="" className="w-20 h-20 rounded-xl object-cover" />
                  )}
                  <div>
                    <h3 className="text-xl font-bold text-white">{conversionData.title}</h3>
                    <p className="text-white/50">{conversionData.artist || "Playlist"}</p>
                    {conversionData.trackCount && (
                      <p className="text-green-400 text-sm mt-1">{conversionData.trackCount} tracks ready</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Download Button */}
              <div className="p-6">
                {conversionData.downloadUrl && (
                  <a
                    href={conversionData.downloadUrl}
                    download
                    className="w-full flex items-center justify-center gap-3 py-4 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-semibold transition-all hover:scale-[1.01]"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download ZIP
                  </a>
                )}

                <button
                  onClick={handleReset}
                  className="w-full mt-3 py-3 rounded-xl border border-white/10 text-white/70 hover:text-white hover:bg-white/5 transition-all"
                >
                  Download Another Playlist
                </button>
              </div>
            </div>
          )}

          {/* Features */}
          <div className="grid md:grid-cols-3 gap-4 mt-8">
            <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10">
              <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center mb-3">
                <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="font-semibold text-white mb-1">Fast Processing</h3>
              <p className="text-white/50 text-sm">Download entire playlists in minutes, not hours</p>
            </div>

            <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center mb-3">
                <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
              </div>
              <h3 className="font-semibold text-white mb-1">High Quality</h3>
              <p className="text-white/50 text-sm">320kbps MP3 with full metadata and album art</p>
            </div>

            <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center mb-3">
                <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                </svg>
              </div>
              <h3 className="font-semibold text-white mb-1">ZIP Download</h3>
              <p className="text-white/50 text-sm">All tracks bundled in one convenient ZIP file</p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
