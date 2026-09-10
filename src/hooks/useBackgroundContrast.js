import { useEffect, useState } from 'react';

export function useBackgroundContrast(backgroundImage, bgEnabled) {
  const [isHeaderLight, setIsHeaderLight] = useState(false);

  useEffect(() => {
    if (!bgEnabled || !backgroundImage || backgroundImage.startsWith('video/')) {
      setIsHeaderLight(false);
      return;
    }

    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = backgroundImage;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = 100;
      canvas.height = 20;
      
      try {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        
        let r = 0, g = 0, b = 0, count = 0;
        for (let i = 0; i < data.length; i += 4) {
          r += data[i];
          g += data[i+1];
          b += data[i+2];
          count++;
        }
        
        r = Math.floor(r / count);
        g = Math.floor(g / count);
        b = Math.floor(b / count);

        const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
        setIsHeaderLight(luminance > 0.6);
      } catch (e) {
        console.error("Canvas sampling error:", e);
      }
    };
  }, [backgroundImage, bgEnabled]);

  return isHeaderLight;
}
