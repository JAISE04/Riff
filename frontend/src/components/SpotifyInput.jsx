import { useState, useRef, useEffect, useMemo } from "react";

// Detect URL type from input
function detectUrlType(url) {
  if (!url) return null;

  const spotifyTrackRegex =
    /^https?:\/\/(open\.)?spotify\.com\/track\/[a-zA-Z0-9]+/i;
  const spotifyPlaylistRegex =
    /^https?:\/\/(open\.)?spotify\.com\/playlist\/[a-zA-Z0-9]+/i;
  const youtubeRegex =
    /^https?:\/\/(www\.)?(youtube\.com\/(watch\?v=|shorts\/)|youtu\.be\/)[a-zA-Z0-9_-]+/i;

  if (spotifyTrackRegex.test(url)) return "spotify";
  if (spotifyPlaylistRegex.test(url)) return "spotify-playlist";
  if (youtubeRegex.test(url)) return "youtube";
  return null;
}

// Spotify Icon Component
function SpotifyIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
    </svg>
  );
}

// YouTube Icon Component
function YouTubeIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}

// Music Icon Component (default/unknown)
function MusicIcon({ className }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20">
      <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
    </svg>
  );
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
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Input Container */}
      <div
        className={`
          relative rounded-2xl transition-all duration-300
          ${isFocused ? getRingColor() : ""}
          ${error ? "ring-2 ring-red-500" : ""}
        `}
      >
        <div className="flex items-center bg-spotify-lightGray rounded-2xl overflow-hidden">
          {/* Dynamic Icon based on URL type */}
          <div className="pl-4 pr-2">
            {renderIcon()}
          </div>

          {/* Input Field */}
          <input
            ref={inputRef}
            type="url"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={getPlaceholder()}
            className="flex-1 py-4 bg-transparent text-white placeholder-spotify-gray outline-none text-base"
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck="false"
          />

          {/* Action Buttons */}
          <div className="flex items-center pr-2 gap-1">
            {value ? (
              <button
                type="button"
                onClick={handleClear}
                className="p-2 text-spotify-gray hover:text-white transition-colors rounded-full hover:bg-white/10"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            ) : (
              <button
                type="button"
                onClick={handlePaste}
                className="px-3 py-1.5 text-sm font-medium text-spotify-green hover:bg-spotify-green/10 transition-colors rounded-full"
              >
                Paste
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 text-red-400 text-sm px-2">
          <svg
            className="w-4 h-4 flex-shrink-0"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {/* URL Hint */}
      {value && !isValid && !error && (
        <p className="text-amber-400 text-sm px-2 flex items-center gap-2">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          Enter a valid Spotify or YouTube URL
        </p>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={!isValid}
        className={`
          w-full py-4 px-6 rounded-full font-semibold text-base
          transition-all duration-300 transform
          ${
            isValid
              ? "bg-spotify-green hover:bg-spotify-greenDark text-black hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-spotify-green/25"
              : "bg-spotify-lightGray text-spotify-gray cursor-not-allowed"
          }
        `}
      >
        <span className="flex items-center justify-center gap-2">
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
            />
          </svg>
          {getButtonText()}
        </span>
      </button>

      {/* Help Text */}
      <p className="text-center text-spotify-gray text-xs">
        Supports: Spotify tracks • YouTube videos • YouTube Shorts
      </p>
    </form>
  );
}
