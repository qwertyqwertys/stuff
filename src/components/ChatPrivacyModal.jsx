import React from 'react';

export function ChatPrivacyModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-6 max-w-md w-full shadow-2xl">
        <h3 className="text-xl font-bold text-white mb-4">🔒 Chat Privacy & Data Notice</h3>
        
        <div className="space-y-3 text-zinc-200 text-sm leading-relaxed">
          <p>
            This website uses a database to power our live chat feature. Here is how your data is handled:
          </p>
          <ul className="list-disc list-inside space-y-2 pl-1">
            <li><strong className="text-white">Data Stored:</strong> We temporarily store the text messages you type and a timestamp so other users can see them in real time.</li>
            <li><strong className="text-white">Privacy First:</strong> Your messages are strictly used for this live chat. We never track, share, or sell your info.</li>
            <li><strong className="text-white">Stay Safe:</strong> Please don't share personal info like your real name, location, or passwords in the chat!</li>
          </ul>
        </div>

        <button 
          onClick={onClose}
          className="mt-6 w-full bg-zinc-800 hover:bg-zinc-700 text-white font-medium py-2 px-4 rounded transition-colors outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          Got it, thanks!
        </button>
      </div>
    </div>
  );
}
