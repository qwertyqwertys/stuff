import React, { useState, useRef, useEffect } from 'react';
import { ZoomIn, ZoomOut, Check, X } from 'lucide-react';

export function AvatarCropperModal({ imageSrc, onCancel, onCropComplete }) {
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const imageRef = useRef(null);

  useEffect(() => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  }, [imageSrc]);

  const getCoords = (e) => {
    if (e.touches && e.touches[0]) {
      return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
    return { x: e.clientX, y: e.clientY };
  };

  const handleStart = (e) => {
    setIsDragging(true);
    const coords = getCoords(e);
    setDragStart({ x: coords.x - offset.x, y: coords.y - offset.y });
  };

  const handleMove = (e) => {
    if (!isDragging) return;
    const coords = getCoords(e);
    setOffset({
      x: coords.x - dragStart.x,
      y: coords.y - dragStart.y,
    });
  };

  const handleEnd = () => {
    setIsDragging(false);
  };

  const handleSave = () => {
    const canvas = document.createElement('canvas');
    const outputSize = 300; // Output image size in pixels
    canvas.width = outputSize;
    canvas.height = outputSize;

    const ctx = canvas.getContext('2d');
    const img = imageRef.current;
    if (!img) return;

    // Viewport circle diameter in UI (240px)
    const viewportSize = 240; 
    const scale = outputSize / viewportSize;

    // Background fill
    ctx.fillStyle = '#0f0f11';
    ctx.fillRect(0, 0, outputSize, outputSize);

    // Apply translations and zoom scale to crop canvas
    ctx.save();
    ctx.translate(outputSize / 2, outputSize / 2);
    ctx.translate(offset.x * scale, offset.y * scale);
    ctx.scale(zoom, zoom);

    ctx.drawImage(
      img,
      -img.naturalWidth / 2,
      -img.naturalHeight / 2
    );
    ctx.restore();

    const croppedBase64 = canvas.toDataURL('image/jpeg', 0.9);
    onCropComplete(croppedBase64);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-[#0f0f11] border border-white/10 rounded-2xl p-6 w-full max-w-sm flex flex-col items-center gap-4 shadow-2xl text-white">
        <h3 className="text-xs font-black uppercase tracking-wider text-[var(--theme)]">
          Adjust Profile Picture
        </h3>

        {/* Circular Crop Viewport */}
        <div 
          className="relative w-60 h-60 rounded-full border-2 border-[var(--theme)] overflow-hidden cursor-grab active:cursor-grabbing bg-black/40 flex items-center justify-center select-none touch-none"
          onMouseDown={handleStart}
          onMouseMove={handleMove}
          onMouseUp={handleEnd}
          onMouseLeave={handleEnd}
          onTouchStart={handleStart}
          onTouchMove={handleMove}
          onTouchEnd={handleEnd}
        >
          <img
            ref={imageRef}
            src={imageSrc}
            alt="Crop preview"
            draggable={false}
            style={{
              transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
              transition: isDragging ? 'none' : 'transform 0.05s ease-out',
              maxHeight: '100%',
              maxWidth: '100%',
              objectFit: 'contain',
              pointerEvents: 'none',
            }}
          />
        </div>

        <p className="text-[11px] text-zinc-400 font-sans">
          Click or touch and drag to move image
        </p>

        {/* Zoom Slider */}
        <div className="w-full flex items-center gap-3 px-2">
          <ZoomOut className="w-4 h-4 text-zinc-400 flex-shrink-0" />
          <input
            type="range"
            min="1"
            max="3.5"
            step="0.05"
            value={zoom}
            onChange={(e) => setZoom(parseFloat(e.target.value))}
            className="w-full accent-[var(--theme)] bg-white/10 rounded-lg h-1.5 cursor-pointer"
          />
          <ZoomIn className="w-4 h-4 text-zinc-400 flex-shrink-0" />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 w-full mt-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-white/5 hover:bg-white/10 text-zinc-300 transition-all outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <X className="w-4 h-4" /> Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[var(--theme)] text-black hover:scale-[1.02] active:scale-95 transition-all outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <Check className="w-4 h-4" /> Apply Picture
          </button>
        </div>
      </div>
    </div>
  );
}
