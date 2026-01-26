import { useState, useRef, useEffect, useMemo } from "react";
import { Copy, Music, Play } from "lucide-react";

// Detect URL type from input
function detectUrlType(url) {
  if (!url) return null;

  const spotifyTrackRegex =
    /^https?:\/\/(open\.)?spotify\.com\/track\/[a-zA-Z0-9]+/i;
  const spotifyPlaylistRegex =
    /^https?:\/\/(open\.)?spotify\.com\/playlist\/[a-zA-Z0-9]+/i;
  const youtubeRegex =
    /^https?:\/\/(www\.)?(youtube\.com\/(watch\?v=|shorts\/)|youtu\.be\/)[a-zA-Z0-9_-]+/i;

  if (spotifyTrackRegex.test(url)) return "spotify-track";
  if (spotifyPlaylistRegex.test(url)) return "spotify-playlist";
  if (youtubeRegex.test(url)) return "youtube";
  return null;
}

export default function SpotifyInput({
  value,
  onChange,
  onSubmit,
  isValid,
  error,
}) {
  const inputRef = useRef(null);
  const [isFocused, setIsFocused] = useState(false);

  // Detect URL type
  const urlType = useMemo(() => detectUrlType(value), [value]);

  // Auto-focus on mount
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Placeholder typing ghost animation (Spotify / YouTube variants)
  const placeholderVariants = [
    'Spotify playlist, album, artist or track link',
    'Youtube music playlist or track link'
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
        // eslint-disable-next-line no-await-in-loop
        await sleep(eraseSpeed);
      }

      for (let len = 0; len <= toVariant.length; len++) {
        if (inputRef.current && inputRef.current.value.trim()) { busy = false; return; }
        setPlaceholderText(toVariant.slice(0, len));
        // eslint-disable-next-line no-await-in-loop
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

  // Handle paste from clipboard
  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      onChange(text);
    } catch (err) {
      console.error("Failed to read clipboard:", err);
    }
  };

  // Clear input
  const handleClear = () => {
    onChange("");
    inputRef.current?.focus();
  };

  // Handle form submit
  const handleSubmit = (e) => {
    e.preventDefault();
    if (isValid) {
      onSubmit();
    }
  };

  // Get icon color based on URL type and validity
  const getIconColor = () => {
    if (!value) return "text-spotify-gray";
    if (urlType === "spotify" || urlType === "spotify-playlist")
      return "text-spotify-green";
    if (urlType === "youtube") return "text-red-500";
    return "text-spotify-gray";
  };

  // Get placeholder text based on focus state
  const getPlaceholder = () => {
    return "Paste Spotify track/playlist or YouTube URL...";
  };

  // Get ring color based on URL type
  const getRingColor = () => {
    if (!isFocused) return "";
    if (urlType === "youtube")
      return "ring-2 ring-red-500 shadow-lg shadow-red-500/20";
    return "ring-2 ring-spotify-green shadow-lg shadow-spotify-green/20";
  };

  // Get button color based on URL type
  const getButtonStyles = () => {
    if (!isValid)
      return "bg-spotify-lightGray text-spotify-gray cursor-not-allowed";
    if (urlType === "youtube") {
      return "bg-red-500 hover:bg-red-600 text-white hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-red-500/25";
    }
    return "bg-spotify-green hover:bg-spotify-greenDark text-black hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-spotify-green/25";
  };

  // Get button text
  const getButtonText = () => {
    if (urlType === "spotify-playlist") return "Download Playlist";
    return "Convert";
  };

  // Render the appropriate icon
  const renderIcon = () => {
    const iconClass = `w-5 h-5 transition-colors ${getIconColor()}`;

    if (urlType === "youtube") {
      return <YouTubeIcon className={iconClass} />;
    }
    if (urlType === "spotify" || urlType === "spotify-playlist") {
      return <SpotifyIcon className={iconClass} />;
    }
    return <MusicIcon className={iconClass} />;
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="space-y-4">
        {/* Input Box - Clean dark style */}
        <div className="relative rounded-2xl bg-[#1a1a2e]/80 backdrop-blur-xl border border-white/10 shadow-2xl shadow-black/50">
          <div className="flex items-center gap-3 px-5 py-4">
            {/* Input container with ghost placeholder */}
            <div className="relative flex-1">
              <input
                ref={inputRef}
                id="playlistUrl"
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                placeholder=""
                className="w-full bg-transparent text-white outline-none text-base pr-2"
                autoComplete="off"
              />
              {/* Animated placeholder ghost */}
              {!value && (
                <div className="absolute inset-0 flex items-center pointer-events-none">
                  <span className="text-white/40 text-base">Paste a {placeholderText}</span>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {value ? (
                <button
                  type="button"
                  onClick={handleClear}
                  className="p-2 rounded-lg hover:bg-white/10 transition-colors text-white/60 hover:text-white"
                  title="Clear"
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
                    ? 'bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 hover:scale-[1.02] active:scale-[0.98]' 
                    : 'bg-white/5 text-white/30 cursor-not-allowed'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Load
              </button>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="flex items-center gap-3 px-2 py-3 rounded-xl bg-red-500/10 border border-red-500/20">
            <span className="text-red-400 text-lg">⚠️</span>
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        )}
      </div>
    </form>
  );
}
