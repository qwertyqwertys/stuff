import React from 'react';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 text-zinc-100 px-4 text-center">
      <h1 className="text-8xl font-black text-sky-400 mb-2 font-mono">404</h1>
      <h2 className="text-2xl font-bold mb-4 font-sans">Page Not Found</h2>
      <p className="text-zinc-400 max-w-md mb-8">
        you prob changed the url, and now you are here lol
      </p>
      <a
        href="/"
        className="px-6 py-3 bg-sky-500 hover:bg-sky-400 text-zinc-950 font-bold rounded-xl transition-colors duration-200"
      >
        Return Home
      </a>
    </div>
  );
}
