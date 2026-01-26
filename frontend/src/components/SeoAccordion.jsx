import { useState } from "react";

export default function SeoAccordion() {
  const [openItems, setOpenItems] = useState([0]); // First item open by default

  const toggleItem = (index) => {
    setOpenItems(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  const items = [
    {
      title: "What is this?",
      content: (
        <>
          <p className="text-white/70 leading-relaxed">
            A convenient and easy-to-use Spotify to MP3 converter for downloading music from Spotify and YouTube. 
            You can quickly download individual tracks, albums, or playlists by simply pasting the link.
          </p>
          <p className="text-white/70 leading-relaxed mt-3">
            Full album or playlist ZIP downloads are supported, including MP3 format with high-quality audio. 
            Downloaded files include metadata such as cover art, artist names, and release dates.
          </p>
          <div className="mt-4 pt-4 border-t border-white/10">
            <p className="text-white/50 text-sm">
              ✓ Supported: <span className="text-green-400">Spotify</span>, <span className="text-red-400">YouTube</span>
            </p>
          </div>
        </>
      )
    },
    {
      title: "Features",
      content: (
        <ul className="space-y-2.5 text-white/70">
          <li className="flex items-start gap-3">
            <span className="text-green-400 mt-0.5">✓</span>
            <span>Download individual tracks or full playlists as ZIP</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-green-400 mt-0.5">✓</span>
            <span>High-quality MP3 format with embedded metadata</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-green-400 mt-0.5">✓</span>
            <span>Album art, artist names, and release dates included</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-green-400 mt-0.5">✓</span>
            <span>Fast conversion and easy to use</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-green-400 mt-0.5">✓</span>
            <span>Works on any device - mobile, tablet, or desktop</span>
          </li>
        </ul>
      )
    },
    {
      title: "How to Download?",
      content: (
        <>
          <ol className="space-y-4 text-white/70">
            <li className="flex gap-4">
              <span className="flex-shrink-0 w-7 h-7 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center text-sm font-bold">1</span>
              <div>
                <p className="font-medium text-white">Copy the link</p>
                <p className="text-sm text-white/50 mt-1">Open Spotify or YouTube and copy the track/playlist URL</p>
              </div>
            </li>
            <li className="flex gap-4">
              <span className="flex-shrink-0 w-7 h-7 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center text-sm font-bold">2</span>
              <div>
                <p className="font-medium text-white">Paste & Load</p>
                <p className="text-sm text-white/50 mt-1">Paste the link above and click the Load button</p>
              </div>
            </li>
            <li className="flex gap-4">
              <span className="flex-shrink-0 w-7 h-7 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center text-sm font-bold">3</span>
              <div>
                <p className="font-medium text-white">Download MP3</p>
                <p className="text-sm text-white/50 mt-1">Click Download and save your music</p>
              </div>
            </li>
          </ol>
          <div className="mt-5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <p className="text-amber-300/90 text-sm">
              💡 <strong>Tip:</strong> All files include full metadata for easy music library management
            </p>
          </div>
        </>
      )
    },
    {
      title: "Are there any limits?",
      content: (
        <div className="space-y-4">
          <p className="text-white/70">Usage limits depend on your account type:</p>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <p className="font-semibold text-white mb-2">Free Users</p>
              <ul className="space-y-1 text-sm text-white/60">
                <li>• Up to 100 tracks per ZIP</li>
                <li>• Playlist loading up to 200 tracks</li>
                <li>• Standard quality audio</li>
              </ul>
            </div>
            <div className="p-4 rounded-xl bg-gradient-to-br from-amber-500/10 to-yellow-500/10 border border-amber-500/20">
              <p className="font-semibold text-amber-400 mb-2">Premium Users ⭐</p>
              <ul className="space-y-1 text-sm text-white/60">
                <li>• Unlimited tracks per download</li>
                <li>• No playlist limits</li>
                <li>• Highest quality audio</li>
              </ul>
            </div>
          </div>
        </div>
      )
    }
  ];

  return (
    <section className="w-full max-w-3xl mx-auto px-4 mt-12 mb-16">
      <div className="space-y-3">
        {items.map((item, index) => (
          <div 
            key={index}
            className="rounded-2xl bg-white/[0.02] border border-white/10 overflow-hidden transition-all hover:border-white/15"
          >
            <button
              onClick={() => toggleItem(index)}
              className="w-full flex items-center justify-between px-5 py-4 text-left"
            >
              <span className="font-medium text-white">{item.title}</span>
              <svg 
                className={`w-5 h-5 text-white/50 transition-transform duration-200 ${openItems.includes(index) ? 'rotate-180' : ''}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <div className={`overflow-hidden transition-all duration-300 ${openItems.includes(index) ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'}`}>
              <div className="px-5 pb-5">
                {item.content}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
