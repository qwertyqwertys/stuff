import React from 'react';
import './UserProfile.css';

export default function UserProfile({ 
  username = "Username", 
  handle = "@capybara_user", 
  avatarUrl = "https://i.imgur.com/6VBx3io.png", 
  frameUrl = "https://i.imgur.com/8PKp3S6.png", 
  effectUrl = "https://media.giphy.com/media/26bro9GJSo4M4yK40/giphy.gif" 
}) {
  return (
    <div className="profile-card">
      {/* Background Profile Effect Layer */}
      {effectUrl && <img className="profile-effect" src={effectUrl} alt="Profile Effect" />}

      {/* Avatar + Frame Container */}
      <div className="avatar-container">
        <img className="user-avatar" src={avatarUrl} alt="User Avatar" />
        {frameUrl && <img className="avatar-frame" src={frameUrl} alt="Avatar Decoration" />}
      </div>

      {/* User Information */}
      <div className="user-details">
        <h3>{username}</h3>
        <p>{handle}</p>
      </div>
    </div>
  );
}
