export default function Footer() {
  return (
    <footer className="py-8 px-4 border-t border-white/5">
      <div className="max-w-4xl mx-auto text-center space-y-4">
        <div className="flex items-center justify-center gap-6 text-white/40 text-sm">
          <a href="#" className="hover:text-white/70 transition-colors">Privacy</a>
          <a href="#" className="hover:text-white/70 transition-colors">Terms</a>
          <a href="#" className="hover:text-white/70 transition-colors">Contact</a>
        </div>
        <p className="text-white/30 text-xs">
          For personal use only • Not affiliated with Spotify or YouTube • © 2026 RIFF
        </p>
      </div>
    </footer>
  );
}
