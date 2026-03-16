import React, { useState, useRef } from 'react';
import ReactCrop, { Crop, PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { X, Check, RotateCcw } from 'lucide-react';

interface CropModalProps {
  image: string;
  onCropComplete: (croppedImage: string) => void;
  onCancel: () => void;
}

export const CropModal: React.FC<CropModalProps> = ({ image, onCropComplete, onCancel }) => {
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const imgRef = useRef<HTMLImageElement>(null);

  function onImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const { width, height } = e.currentTarget;
    // Start with a crop that covers 100% of the image
    setCrop({
      unit: '%',
      width: 100,
      height: 100,
      x: 0,
      y: 0
    });
  }

  const getCroppedImg = async (image: HTMLImageElement, crop: PixelCrop): Promise<string> => {
    const canvas = document.createElement('canvas');
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    canvas.width = crop.width;
    canvas.height = crop.height;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('No 2d context');
    }

    ctx.drawImage(
      image,
      crop.x * scaleX,
      crop.y * scaleY,
      crop.width * scaleX,
      crop.height * scaleY,
      0,
      0,
      crop.width,
      crop.height
    );

    return canvas.toDataURL('image/jpeg');
  };

  const handleDone = async () => {
    if (completedCrop && imgRef.current) {
      const croppedImage = await getCroppedImg(imgRef.current, completedCrop);
      onCropComplete(croppedImage);
    } else if (imgRef.current) {
      // If no crop was made, just use the whole image
      onCropComplete(image);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col">
      <div className="p-4 flex items-center justify-between bg-zinc-900 text-white border-b border-white/10">
        <button onClick={onCancel} className="p-2 hover:bg-white/10 rounded-full">
          <X className="w-6 h-6" />
        </button>
        <div className="text-center">
          <h3 className="font-semibold text-sm">Crop Image</h3>
          <p className="text-[10px] text-zinc-500 uppercase tracking-widest">Drag corners to select area</p>
        </div>
        <button onClick={handleDone} className="p-2 bg-emerald-600 hover:bg-emerald-700 rounded-full transition-colors">
          <Check className="w-6 h-6" />
        </button>
      </div>

      <div className="flex-1 bg-zinc-950 relative flex items-center justify-center p-4 overflow-hidden">
        <div className="relative w-full h-full flex items-center justify-center">
          <ReactCrop
            crop={crop}
            onChange={(c) => setCrop(c)}
            onComplete={(c) => setCompletedCrop(c)}
            className="max-w-full max-h-full"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <img
              ref={imgRef}
              src={image}
              alt="Crop me"
              onLoad={onImageLoad}
              className="block"
              style={{ 
                maxWidth: '100%', 
                maxHeight: 'calc(100vh - 220px)', 
                width: 'auto', 
                height: 'auto',
                objectFit: 'contain'
              }}
            />
          </ReactCrop>
        </div>
      </div>

      <div className="p-6 bg-zinc-900 border-t border-white/10 flex justify-center">
        <button 
          onClick={() => {
            if (imgRef.current) {
               const { width, height } = imgRef.current;
               setCrop({ unit: '%', width: 100, height: 100, x: 0, y: 0 });
            }
          }}
          className="flex items-center gap-2 text-xs font-bold text-zinc-400 hover:text-white uppercase tracking-widest transition-colors"
        >
          <RotateCcw className="w-3 h-3" />
          Select All
        </button>
      </div>
    </div>
  );
};
