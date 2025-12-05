import { formatFileSize } from "../services/api";

export default function ResultCard({ data, onDownload, onReset }) {
  const { metadata, downloadUrl, filename, fileSize, quality, playlistInfo } =
    data;
  const isPlaylist = metadata?.isPlaylist || playlistInfo;

  const handleDownloadClick = (e) => {
    // Don't prevent default - let the download happen
    onDownload();
  };

  return (
    <div className="space-y-4">
      {/* Success Card */}
      <div className="bg-gradient-to-br from-spotify-lightGray to-spotify-black rounded-2xl overflow-hidden shadow-xl">
        {/* Album Art Header */}
        <div className="relative">
          {metadata?.coverUrl ? (
            <div className="relative">
              <img
                src={metadata.coverUrl}
                alt={metadata.title}
                className="w-full aspect-square object-cover"
              />
              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-spotify-lightGray via-transparent to-transparent"></div>
            </div>
          ) : (
            <div className="w-full aspect-square bg-spotify-gray flex items-center justify-center">
              <svg
                className="w-24 h-24 text-spotify-lightGray"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
              </svg>
            </div>
          )}

          {/* Success Badge */}
          <div className="absolute top-4 right-4">
            <div className="bg-spotify-green text-black px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-1">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              Ready
            </div>
          </div>
        </div>

        {/* Track Info */}
        <div className="p-5 space-y-4">
          <div>
            <h2 className="text-xl font-bold text-white truncate">
              {metadata?.title || "Unknown Track"}
              {isPlaylist && (
                <span className="ml-2 text-sm bg-spotify-green/20 text-spotify-green px-2 py-0.5 rounded-full">
                  Playlist
                </span>
              )}
            </h2>
            <p className="text-spotify-gray truncate">
              {metadata?.artist || "Unknown Artist"}
            </p>
            {metadata?.album && !isPlaylist && (
              <p className="text-spotify-gray text-sm truncate mt-1">
                {metadata.album}
              </p>
            )}
            {isPlaylist && playlistInfo && (
              <div className="mt-2 text-sm">
                <p className="text-spotify-green">
                  ✓ {playlistInfo.completedTracks} tracks downloaded
                </p>
                {playlistInfo.failedTracks > 0 && (
                  <p className="text-red-400">
                    ✗ {playlistInfo.failedTracks} tracks failed
                  </p>
                )}
              </div>
            )}
          </div>

          {/* File Info */}
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5 text-spotify-green">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="font-medium">{quality}</span>
            </div>
            <div className="flex items-center gap-1.5 text-spotify-gray">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
              <span>{formatFileSize(fileSize)}</span>
            </div>
            <div className="flex items-center gap-1.5 text-spotify-gray">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
              </svg>
              <span>{isPlaylist ? "ZIP" : "MP3"}</span>
            </div>
          </div>

          {/* Download Button */}
          <a
            href={downloadUrl}
            download={filename}
            onClick={handleDownloadClick}
            className="block w-full py-4 px-6 bg-spotify-green hover:bg-spotify-greenDark text-black font-semibold text-center rounded-full transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-spotify-green/25"
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
              {isPlaylist ? "Download ZIP" : "Download MP3"}
            </span>
          </a>
        </div>
      </div>

      {/* Convert Another Button */}
      <button
        onClick={onReset}
        className="w-full py-3 px-6 bg-transparent border border-spotify-gray text-white font-medium rounded-full hover:bg-spotify-lightGray transition-colors"
      >
        {isPlaylist ? "Convert Another Playlist" : "Convert Another Track"}
      </button>
    </div>
  );
}
