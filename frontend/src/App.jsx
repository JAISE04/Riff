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

  // Validate Spotify URL
  const validateUrl = (url) => {
    return /^https?:\/\/open\.spotify\.com\/track\/[a-zA-Z0-9]+/.test(url);
  };

  const isValidUrl = validateUrl(spotifyUrl);

  return (
    <div className="min-h-screen min-h-[100dvh] flex flex-col bg-gradient-to-b from-spotify-black via-spotify-darkGray to-spotify-black">
      <Header />

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-8 safe-area-top safe-area-bottom">
        <div className="w-full max-w-md mx-auto">
          {/* Main Content */}
          <div className="space-y-6">
            {/* Title Section */}
            <div className="text-center mb-8">
              <h1 className="text-3xl md:text-4xl font-bold mb-2 bg-gradient-to-r from-spotify-green to-emerald-400 bg-clip-text text-transparent">
                Spotify to MP3
              </h1>
              <p className="text-spotify-gray text-sm md:text-base">
                Convert any Spotify track to high-quality MP3
              </p>
            </div>

            {/* Input Section - shown when idle or error */}
            {(state === "idle" || state === "error") && (
              <SpotifyInput
                value={spotifyUrl}
                onChange={setSpotifyUrl}
                onSubmit={handleConvert}
                isValid={isValidUrl}
                error={error}
              />
            )}

            {/* Converting State */}
            {state === "converting" && conversionData && (
              <ConversionProgress data={conversionData} />
            )}

            {/* Success State */}
            {state === "success" && conversionData && (
              <ResultCard
                data={conversionData}
                onDownload={handleDownload}
                onReset={handleReset}
              />
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
