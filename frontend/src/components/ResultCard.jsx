import { formatFileSize } from "../services/api";
import { Download, RotateCcw, CheckCircle, FileAudio, Music } from "lucide-react";

export default function ResultCard({ data, onDownload, onReset }) {
  const { metadata, downloadUrl, filename, fileSize, quality, playlistInfo } =
    data;
  const isPlaylist = metadata?.isPlaylist || playlistInfo;

  const handleDownloadClick = (e) => {
    onDownload();
  };

  return (
    <div className="max-w-3xl mx-auto px-4 space-y-4">
      {/* Success Card */}
      <div className="rounded-3xl bg-white/10 backdrop-blur-md border border-white/20 overflow-hidden">
        {/* Album Art or Placeholder */}
        {metadata?.coverUrl ? (
          <img
            src={metadata.coverUrl}
            alt={metadata.title}
            className="w-full aspect-video object-cover rounded-t-3xl"
          />
        ) : (
          <div className="w-full aspect-video bg-gradient-to-br from-purple-500/30 to-pink-500/30 flex items-center justify-center rounded-t-3xl">
            <Music className="w-20 h-20 text-white/40" />
          </div>
        )}

        {/* Content */}
        <div className="p-8 space-y-6">
          {/* Track Info */}
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">
              {metadata?.title || "Unknown Track"}
            </h2>
            <p className="text-white/70 text-lg md:text-xl">
              {metadata?.artist || "Unknown Artist"}
            </p>
            {metadata?.album && !isPlaylist && (
              <p className="text-white/50 text-base mt-2">
                {metadata.album}
              </p>
            )}
            
            {isPlaylist && playlistInfo && (
              <div className="mt-4 space-y-2 text-base">
                <p className="text-emerald-300 font-semibold">
                  ✓ {playlistInfo.completedTracks} tracks downloaded
                </p>
                {playlistInfo.failedTracks > 0 && (
                  <p className="text-red-300 font-semibold">
                    ✗ {playlistInfo.failedTracks} tracks failed
                  </p>
                )}
              </div>
            )}
          </div>

          {/* File Info Stats */}
          <div className="grid grid-cols-3 gap-3 pt-4">
            <div className="bg-white/10 rounded-lg p-3">
              <p className="text-white/60 text-xs font-medium">QUALITY</p>
              <p className="text-white font-bold text-lg mt-1">{quality}</p>
            </div>
            <div className="bg-white/10 rounded-lg p-3">
              <p className="text-white/60 text-xs font-medium">SIZE</p>
              <p className="text-white font-bold text-lg mt-1">{formatFileSize(fileSize)}</p>
            </div>
            <div className="bg-white/10 rounded-lg p-3">
              <p className="text-white/60 text-xs font-medium">FORMAT</p>
              <p className="text-white font-bold text-lg mt-1">{isPlaylist ? "ZIP" : "MP3"}</p>
            </div>
          </div>

          {/* Download Button */}
          <a
            href={downloadUrl}
            download={filename}
            onClick={handleDownloadClick}
            className="block w-full py-4 px-6 bg-white text-purple-600 font-bold text-center rounded-2xl transition-all duration-300 hover:shadow-2xl hover:shadow-white/40 active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-white/20"
          >
            <Download className="w-5 h-5" />
            {isPlaylist ? "Download ZIP File" : "Download MP3"}
          </a>
        </div>
      </div>

      {/* Convert Another Button */}
      <button
        onClick={onReset}
        className="w-full max-w-3xl mx-auto py-4 px-6 bg-white/15 hover:bg-white/25 border border-white/20 text-white font-bold rounded-2xl transition-all duration-300 flex items-center justify-center gap-2"
      >
        <RotateCcw className="w-5 h-5" />
        {isPlaylist ? "Convert Another Playlist" : "Convert Another Track"}
      </button>
    </div>
  );
}
