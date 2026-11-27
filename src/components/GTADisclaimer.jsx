import React, { useState } from 'react';

export default function GTADisclaimerModal({ isOpen, onClose, onConfirm }) {
  const [dontShowAgain, setDontShowAgain] = useState(false);

  if (!isOpen) return null;

  const handleAccept = () => {
    if (dontShowAgain) {
      localStorage.setItem('gta_disclaimer_accepted', 'true');
    }
    onConfirm();
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/85 p-4 font-sans"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-zinc-900 border border-white/10 rounded-2xl p-6 shadow-2xl text-white"
      >
        <h2 className="text-xl font-bold text-red-500 flex items-center gap-2 m-0">
          ⚠️ Disclaimer &amp; Warning
        </h2>

        <p className="text-zinc-300 text-sm leading-relaxed my-4">
          Capybara Science is not responsible for you getting in trouble for playing GTA in or outside of school.
        </p>

        <label className="flex items-center gap-2 my-5 cursor-pointer text-sm text-zinc-400 select-none">
          <input
            type="checkbox"
            checked={dontShowAgain}
            onChange={(e) => setDontShowAgain(e.target.checked)}
            className="w-4 h-4 rounded cursor-pointer accent-red-500"
          />
          Don't show this again
        </label>

        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white border-0 rounded-lg cursor-pointer text-sm font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleAccept}
            className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white border-0 rounded-lg font-bold cursor-pointer text-sm transition-colors"
          >
            I Understand &amp; Launch GTA
          </button>
        </div>
      </div>
    </div>
  );
}
