import React, { useState, useRef, useEffect } from 'react';
import { X, ZoomIn, ZoomOut, RotateCcw, Check, Move } from 'lucide-react';

export function AvatarCropperModal({
  show,
  imageFile,
  onClose,
  onCropComplete,
  isLightMode = false
}) {
  const [imageSrc, setImageSrc] = useState(null);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const imageRef = useRef(null);

  // Convert File object to temporary Object URL when modal opens
  useEffect(() => {
    if (!imageFile) {
      setImageSrc(null);
      return;
    }

    const objectUrl = URL.createObjectURL(imageFile);
    setImageSrc(objectUrl);

    // Reset crop state
    setScale(1);
    setPosition({ x: 0, y: 0 });

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [imageFile]);

  if (!show || !imageSrc) return null;

  // --- DRAG / POSITIONING HANDLERS ---
  const handleMouseDown = (e) => {
    setIsDragging(true);
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    setDragStart({ x: clientX - position.x, y: clientY - position.y });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    setPosition({
      x: clientX - dragStart.x,
      y: clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // --- HTML5 CANVAS CROP EXPORT ---
  const handleSaveCrop = () => {
    const img = imageRef.current;
    if (!img) return;

    const CROP_SIZE = 300; // Output 300x300 high-res PFP
    const VIEWPORT_SIZE = 200; // UI crop area size in px
    const factor = CROP_SIZE / VIEWPORT_SIZE;

    const canvas = document.createElement('canvas');
    canvas.width = CROP_SIZE;
    canvas.height = CROP_SIZE;
    const ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, CROP_SIZE, CROP_SIZE);

    // Create circular mask
    ctx.save();
    ctx.beginPath();
    ctx.arc(CROP_SIZE / 2, CROP_SIZE / 2, CROP_SIZE / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();

    // Transform canvas matrix based on user scale and pan
    ctx.translate(CROP_SIZE / 2, CROP_SIZE / 2);
    ctx.translate(position.x * factor, position.y * factor);
    ctx.scale(scale, scale);

    // Draw centered image
    const initialScale = Math.max(VIEWPORT_SIZE / img.naturalWidth, VIEWPORT_SIZE / img.naturalHeight);
    const renderWidth = img.naturalWidth * initialScale * factor;
    const renderHeight = img.naturalHeight * initialScale * factor;

    ctx.drawImage(img, -renderWidth / 2, -renderHeight / 2, renderWidth, renderHeight);
    ctx.restore();

    const croppedDataUrl = canvas.toDataURL('image/png');
    onCropComplete(croppedDataUrl);
    onClose();
  };

  const modalBg = isLightMode ? "bg-white border-zinc-200 text-zinc-900" : "bg-zinc-900 border-white/10 text-white";
  const inputBg = isLightMode ? "bg-zinc-100 border-zinc-300" : "bg-zinc-800 border-white/10";

  return (
    <div 
      className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn select-none"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onTouchMove={handleMouseMove}
      onTouchEnd={handleMouseUp}
    >
      <div className={`${modalBg} border rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-5 flex flex-col items-center`}>
        
        {/* HEADER */}
        <div className="flex items-center justify-between w-full border-b pb-3 border-white/10">
          <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
            <Move className="w-4 h-4 text-[var(--theme)]" /> Crop Profile Picture
          </h3>
          <button 
            type="button" 
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* CROP VIEWPORT (200x200 CIRCLE) */}
        <div 
          className="relative w-[200px] h-[200px] rounded-full overflow-hidden border-2 border-[var(--theme)] cursor-grab active:cursor-grabbing shadow-inner bg-black/40 flex items-center justify-center"
          onMouseDown={handleMouseDown}
          onTouchStart={handleMouseDown}
        >
          <img
            ref={imageRef}
            src={imageSrc}
            alt="PFP Preview"
            draggable={false}
            className="absolute max-w-none transition-transform ease-out duration-75 pointer-events-none"
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
              minWidth: '200px',
              minHeight: '200px',
              objectFit: 'cover'
            }}
          />
          <div className="absolute inset-0 rounded-full border border-white/30 pointer-events-none" />
        </div>

        {/* CONTROLS (ZOOM & RESET) */}
        <div className="w-full space-y-3">
          <div className="flex items-center gap-3">
            <ZoomOut className="w-4 h-4 text-zinc-400" />
            <input
              type="range"
              min="1"
              max="3"
              step="0.05"
              value={scale}
              onChange={(e) => setScale(parseFloat(e.target.value))}
              className={`flex-1 h-1.5 ${inputBg} rounded-lg appearance-none cursor-pointer accent-[var(--theme)]`}
            />
            <ZoomIn className="w-4 h-4 text-zinc-400" />
          </div>

          <div className="flex justify-between items-center text-[10px] uppercase font-bold text-zinc-400 px-1">
            <span>Drag image to position</span>
            <button
              type="button"
              onClick={() => { setScale(1); setPosition({ x: 0, y: 0 }); }}
              className="flex items-center gap-1 hover:text-[var(--theme)] transition-colors"
            >
              <RotateCcw className="w-3 h-3" /> Reset
            </button>
          </div>
        </div>

        {/* ACTIONS */}
        <div className="flex gap-2 w-full pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-white/10 hover:bg-white/5 text-[10px] font-black uppercase transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSaveCrop}
            className="flex-1 py-2.5 rounded-xl bg-[var(--theme)] text-black text-[10px] font-black uppercase hover:opacity-90 transition-opacity flex items-center justify-center gap-1 shadow-md"
          >
            <Check className="w-4 h-4" /> Save Avatar
          </button>
        </div>

      </div>
    </div>
  );
}
