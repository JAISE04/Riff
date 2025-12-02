export default function ConversionProgress({ data }) {
  const { step, progress, metadata } = data;

  return (
    <div className="space-y-6">
      {/* Metadata Preview (if available) */}
      {metadata && (
        <div className="bg-spotify-lightGray rounded-2xl p-4 flex items-center gap-4">
          {metadata.coverUrl ? (
            <img
              src={metadata.coverUrl}
              alt={metadata.title}
              className="w-16 h-16 rounded-lg object-cover shadow-lg"
            />
          ) : (
            <div className="w-16 h-16 rounded-lg bg-spotify-gray flex items-center justify-center">
              <svg
                className="w-8 h-8 text-spotify-lightGray"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
              </svg>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-white truncate">
              {metadata.title}
            </h3>
            <p className="text-sm text-spotify-gray truncate">
              {metadata.artist}
            </p>
          </div>
        </div>
      )}

      {/* Progress Section */}
      <div className="bg-spotify-lightGray rounded-2xl p-6 space-y-4">
        {/* Animated Loader */}
        <div className="flex justify-center">
          <div className="relative">
            {/* Outer ring */}
            <div className="w-20 h-20 rounded-full border-4 border-spotify-gray/30"></div>

            {/* Spinning progress ring */}
            <svg
              className="absolute inset-0 w-20 h-20 -rotate-90"
              viewBox="0 0 80 80"
            >
              <circle
                className="text-spotify-green"
                strokeWidth="4"
                stroke="currentColor"
                fill="transparent"
                r="36"
                cx="40"
                cy="40"
                strokeDasharray={`${2 * Math.PI * 36}`}
                strokeDashoffset={`${2 * Math.PI * 36 * (1 - progress / 100)}`}
                strokeLinecap="round"
                style={{ transition: "stroke-dashoffset 0.3s ease" }}
              />
            </svg>

            {/* Center percentage */}
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-lg font-bold text-white">{progress}%</span>
            </div>
          </div>
        </div>

        {/* Status Text */}
        <div className="text-center space-y-1">
          <p className="text-white font-medium">{step}</p>
          <p className="text-spotify-gray text-sm">
            This usually takes 5-10 seconds
          </p>
        </div>

        {/* Progress Bar */}
        <div className="h-1.5 bg-spotify-gray/30 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-spotify-green to-emerald-400 rounded-full transition-all duration-300 relative"
            style={{ width: `${progress}%` }}
          >
            <div className="absolute inset-0 shimmer"></div>
          </div>
        </div>

        {/* Step Indicators */}
        <div className="flex justify-between text-xs text-spotify-gray pt-2">
          <span className={progress >= 10 ? "text-spotify-green" : ""}>
            Metadata
          </span>
          <span className={progress >= 35 ? "text-spotify-green" : ""}>
            Source
          </span>
          <span className={progress >= 60 ? "text-spotify-green" : ""}>
            Convert
          </span>
          <span className={progress >= 100 ? "text-spotify-green" : ""}>
            Ready
          </span>
        </div>
      </div>
    </div>
  );
}
