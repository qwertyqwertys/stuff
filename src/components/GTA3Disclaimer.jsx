import React, { useState } from 'react';

export default function GTA3DisclaimerModal({ isOpen, onClose, onConfirm }) {
  const [dontShowAgain, setDontShowAgain] = useState(false);

  // If modal shouldn't be open, don't render anything
  if (!isOpen) return null;

  const handleAccept = () => {
    if (dontShowAgain) {
      localStorage.setItem('gta3_disclaimer_accepted', 'true');
    }
    onConfirm();
  };

  return (
    <div 
      onClick={onClose} // Clicking overlay closes modal
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.85)', 
        zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', 
        fontFamily: 'system-ui, sans-serif'
      }}
    >
      <div 
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside box
        style={{
          background: '#1a1a1a', color: '#ffffff', padding: '24px', 
          borderRadius: '12px', maxWidth: '450px', width: '90%', 
          border: '1px solid #333', boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
        }}
      >
        <h2 style={{ marginTop: 0, color: '#ff4757', display: 'flex', alignItems: 'center', gap: '8px' }}>
          ⚠️ Disclaimer & Warning
        </h2>
        
        <p style={{ color: '#ccc', lineHeight: '1.5', fontSize: '15px', margin: '16px 0' }}>
          Capybara Science is not responsible for you getting in trouble for playing GTA III in or outside of school.
        </p>
        
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '20px 0', cursor: 'pointer', fontSize: '14px', color: '#aaa' }}>
          <input 
            type="checkbox" 
            checked={dontShowAgain} 
            onChange={(e) => setDontShowAgain(e.target.checked)}
            style={{ width: '16px', height: '16px', cursor: 'pointer' }} 
          />
          Don't show this again
        </label>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button 
            onClick={onClose} 
            style={{ padding: '8px 16px', background: '#333', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px' }}
          >
            Cancel
          </button>
          <button 
            onClick={handleAccept} 
            style={{ padding: '8px 16px', background: '#ff4757', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px' }}
          >
            I Understand & Launch GTA III
          </button>
        </div>
      </div>
    </div>
  );
}
