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
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.85)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#18181b',
          color: '#ffffff',
          padding: '24px',
          borderRadius: '16px',
          maxWidth: '450px',
          width: '100%',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.65)',
        }}
      >
        <h2
          style={{
            margin: 0,
            color: '#ff0000',
            fontWeight: 800,
            fontSize: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <span>⚠️</span>
          <span>Disclaimer &amp; Warning</span>
        </h2>

        <p
          style={{
            color: '#e4e4e7',
            lineHeight: '1.5',
            fontSize: '15px',
            fontWeight: 500,
            margin: '16px 0',
          }}
        >
          Capybara Science is not responsible for you getting in trouble for playing GTA in or outside of school.
        </p>

        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            margin: '20px 0',
            cursor: 'pointer',
            fontSize: '14px',
            color: '#a1a1aa',
            userSelect: 'none',
          }}
        >
          <input
            type="checkbox"
            checked={dontShowAgain}
            onChange={(e) => setDontShowAgain(e.target.checked)}
            style={{ width: '16px', height: '16px', cursor: 'pointer' }}
          />
          <span>Don't show this again</span>
        </label>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '10px 18px',
              background: '#27272a',
              color: '#ffffff',
              border: 'none',
              borderRadius: '10px',
              fontWeight: 700,
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleAccept}
            style={{
              padding: '10px 18px',
              background: '#ff0000',
              color: '#ffffff',
              border: 'none',
              borderRadius: '10px',
              fontWeight: 800,
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            I Understand &amp; Launch GTA
          </button>
        </div>
      </div>
    </div>
  );
}
