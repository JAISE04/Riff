import { useEffect } from "react";

export default function IOSModal({ isOpen, onClose }) {
  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm safe-area-bottom"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-spotify-lightGray rounded-t-3xl p-6 pb-8 space-y-5 animate-slide-up"
        onClick={(e) => e.stopPropagation()}
        style={{
          animation: "slideUp 0.3s ease-out",
        }}
      >
        {/* Success Header */}
        <div className="flex items-center justify-center gap-3 text-spotify-green">
          <div className="w-12 h-12 rounded-full bg-spotify-green/20 flex items-center justify-center">
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <h2 className="text-xl font-bold">Download Started!</h2>
        </div>

        {/* iOS Instructions */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-amber-400">
            <svg
              className="w-5 h-5 flex-shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
            <span className="font-semibold">
              For iPhone Users (Important!):
            </span>
          </div>

          <div className="space-y-3 pl-2">
            {/* Step 1 */}
            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-sm font-bold flex-shrink-0">
                1
              </div>
              <div className="text-white">
                <p>
                  Look for the{" "}
                  <span className="text-blue-400 font-medium">
                    blue download arrow
                  </span>{" "}
                  in your Safari address bar.
                </p>
                <p className="text-spotify-gray text-sm mt-1">
                  Tap it to see your file.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-sm font-bold flex-shrink-0">
                2
              </div>
              <div className="text-white">
                <p>
                  The MP3 file is saved to the{" "}
                  <span className="font-medium">'Downloads'</span> folder in
                  your iPhone's <span className="font-medium">Files App</span>.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-sm font-bold flex-shrink-0">
                3
              </div>
              <div className="text-white">
                <p>
                  To play and manage the music easily, we recommend using a free
                  third-party app like:
                </p>
                <div className="flex gap-2 mt-2">
                  <span className="px-3 py-1 bg-spotify-gray/50 rounded-full text-sm font-medium">
                    VLC
                  </span>
                  <span className="px-3 py-1 bg-spotify-gray/50 rounded-full text-sm font-medium">
                    Documents
                  </span>
                </div>
                <p className="text-spotify-gray text-sm mt-2">
                  Open the file from the Files App with one of these apps.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="w-full py-4 px-6 bg-white text-black font-semibold rounded-full transition-all hover:bg-gray-100 active:scale-[0.98]"
        >
          Got it!
        </button>
      </div>

      <style>{`
        @keyframes slideUp {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
