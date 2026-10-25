import React, { useState } from 'react';
import UserProfile from './UserProfile';
import './Shop.css';

// Sample shop inventory (all free!)
const shopItems = [
  { id: 1, type: 'frame', name: 'Neon Cyber Border', url: 'https://i.imgur.com/8PKp3S6.png' },
  { id: 2, type: 'frame', name: 'Golden Crown', url: 'https://i.imgur.com/6VBx3io.png' }, // Replace with frame URL
  { id: 3, type: 'effect', name: 'Matrix Rain', url: 'https://media.giphy.com/media/26bro9GJSo4M4yK40/giphy.gif' },
  { id: 4, type: 'effect', name: 'Sparkle Aura', url: 'https://media.giphy.com/media/xTiTnMhJTwNHCHdAIU/giphy.gif' }
];

export default function Shop() {
  const [selectedFrame, setSelectedFrame] = useState(shopItems[0].url);
  const [selectedEffect, setSelectedEffect] = useState(shopItems[2].url);

  return (
    <div className="shop-container">
      <div className="shop-preview">
        <h2>Live Preview</h2>
        <UserProfile 
          username="CapybaraCoder" 
          handle="@science_lead" 
          frameUrl={selectedFrame} 
          effectUrl={selectedEffect} 
        />
      </div>

      <div className="shop-catalog">
        <h2>Avatar & Profile Shop</h2>
        <div className="item-grid">
          {shopItems.map(item => (
            <div key={item.id} className="shop-item">
              <h4>{item.name}</h4>
              <p>Price: <strong>FREE</strong></p>
              <button 
                onClick={() => {
                  if (item.type === 'frame') setSelectedFrame(item.url);
                  if (item.type === 'effect') setSelectedEffect(item.url);
                }}
              >
                Equip / Buy
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
