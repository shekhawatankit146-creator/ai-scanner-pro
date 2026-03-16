import React, { useState, useRef, useCallback } from 'react';
import { Camera, Upload, Trash2, Loader2, Table as TableIcon, FileText, Sparkles, Scan, Crop } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { scanImage, ScanResult } from './services/gemini';
import { ResultView } from './components/ResultView';
import { CropModal } from './components/CropModal';
import { LandingPage } from './components/LandingPage';
import { AdBanner } from './components/AdBanner';

export default function App() {
  const [hasStarted, setHasStarted] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const [tempImage, setTempImage] = useState<string | null>(null);
  const [isCropping, setIsCropping] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanMode, setScanMode] = useState<'text' | 'table'>('text');
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [showCamera, setShowCamera] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setTempImage(reader.result as string);
        setIsCropping(true);
        setResult(null);
        setError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = async () => {
    setShowCamera(true);
    setError(null);
  };

  // Initialize camera when showCamera becomes true
  React.useEffect(() => {
    if (showCamera && !streamRef.current) {
      const initCamera = async () => {
        try {
          const constraints = { 
            video: { 
              facingMode: { exact: 'environment' },
              width: { ideal: 1920 },
              height: { ideal: 1080 }
            } 
          };
          
          let stream;
          try {
            stream = await navigator.mediaDevices.getUserMedia(constraints);
          } catch (e) {
            console.log("Exact environment camera not found, trying ideal...");
            stream = await navigator.mediaDevices.getUserMedia({ 
              video: { 
                facingMode: 'environment',
                width: { ideal: 1920 },
                height: { ideal: 1080 }
              } 
            });
          }
          
          streamRef.current = stream;
          
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            try {
              await videoRef.current.play();
            } catch (e) {
              console.error("Autoplay failed:", e);
            }
          }
        } catch (err) {
          console.error("Camera error:", err);
          try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            streamRef.current = stream;
            if (videoRef.current) {
              videoRef.current.srcObject = stream;
            }
          } catch (fallbackErr) {
            setError("Camera access denied or not available.");
            setShowCamera(false);
          }
        }
      };
      initCamera();
    }
  }, [showCamera]);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setShowCamera(false);
  };

  const captureImage = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      // Use actual video dimensions for better quality
      canvas.width = videoRef.current.videoWidth || 1280;
      canvas.height = videoRef.current.videoHeight || 720;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0);
        setTempImage(canvas.toDataURL('image/jpeg', 0.9));
        setIsCropping(true);
        stopCamera();
      }
    }
  };

  const onCropComplete = (croppedImage: string) => {
    setImage(croppedImage);
    setTempImage(null);
    setIsCropping(false);
  };

  const handleScanModeChange = (mode: 'text' | 'table') => {
    setScanMode(mode);
    if (image && !isScanning) {
      // Small delay to ensure state is updated or just pass the mode directly
      setTimeout(() => {
        handleScan(mode);
      }, 0);
    }
  };

  const handleScan = async (overrideMode?: 'text' | 'table') => {
    if (!image) return;
    setIsScanning(true);
    setError(null);
    try {
      const mimeType = image.split(';')[0].split(':')[1];
      const res = await scanImage(image, mimeType, overrideMode || scanMode);
      setResult(res);
    } catch (err) {
      setError("Failed to scan image. Please try again.");
      console.error(err);
    } finally {
      setIsScanning(false);
    }
  };

  const reset = () => {
    setImage(null);
    setTempImage(null);
    setIsCropping(false);
    setResult(null);
    setError(null);
    stopCamera();
  };

  if (!hasStarted) {
    return <LandingPage onStart={() => setHasStarted(true)} />;
  }

  return (
    <div className="min-h-screen bg-[#F5F5F7] text-zinc-900 font-sans selection:bg-emerald-100">
      {/* Crop Modal */}
      {isCropping && tempImage && (
        <CropModal 
          image={tempImage} 
          onCropComplete={onCropComplete} 
          onCancel={() => { setIsCropping(false); setTempImage(null); }} 
        />
      )}

      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-zinc-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => setHasStarted(false)}>
            <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-200">
              <Scan className="text-white w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">ScanMaster AI</h1>
              <p className="text-[10px] text-zinc-500 uppercase font-semibold tracking-widest">Powered by Gemini</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 bg-zinc-100 p-1 rounded-xl border border-zinc-200">
            <button
              onClick={() => handleScanModeChange('text')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                scanMode === 'text' 
                  ? 'bg-white text-zinc-900 shadow-sm' 
                  : 'text-zinc-500 hover:text-zinc-700'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Text</span>
            </button>
            <button
              onClick={() => handleScanModeChange('table')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                scanMode === 'table' 
                  ? 'bg-white text-zinc-900 shadow-sm' 
                  : 'text-zinc-500 hover:text-zinc-700'
              }`}
            >
              <TableIcon className="w-4 h-4" />
              <span>Table</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6 md:p-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          {/* Input Section */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-zinc-800">Source Image</h2>
              {image && (
                <button 
                  onClick={reset}
                  className="text-zinc-400 hover:text-red-500 transition-colors p-2 hover:bg-red-50 rounded-full"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              )}
            </div>

            <div className="relative aspect-[4/3] w-full bg-white rounded-3xl border-2 border-dashed border-zinc-200 overflow-hidden group transition-all hover:border-emerald-400/50">
              <AnimatePresence mode="wait">
                {!image && !showCamera ? (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center"
                  >
                    <div className="w-16 h-16 bg-zinc-50 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-500">
                      <Upload className="w-8 h-8 text-zinc-400" />
                    </div>
                    <p className="text-zinc-600 font-medium mb-1">Upload or capture an image</p>
                    <p className="text-zinc-400 text-sm mb-6">Supports text, handwriting, and tables</p>
                    
                    <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
                      <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="flex-1 bg-white border border-zinc-200 px-4 py-2.5 rounded-xl text-sm font-semibold text-zinc-700 hover:bg-zinc-50 transition-colors flex items-center justify-center gap-2"
                      >
                        <Upload className="w-4 h-4" />
                        Choose File
                      </button>
                      <button 
                        onClick={startCamera}
                        className="flex-1 bg-zinc-900 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2"
                      >
                        <Camera className="w-4 h-4" />
                        Camera
                      </button>
                    </div>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleFileUpload} 
                      accept="image/*" 
                      className="hidden" 
                    />
                  </motion.div>
                ) : showCamera ? (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-black"
                  >
                    <video 
                      ref={videoRef} 
                      autoPlay 
                      playsInline 
                      muted
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-4">
                      <button 
                        onClick={stopCamera}
                        className="bg-white/20 backdrop-blur-md text-white px-6 py-2 rounded-full text-sm font-medium hover:bg-white/30"
                      >
                        Cancel
                      </button>
                      <button 
                        onClick={captureImage}
                        className="bg-white text-zinc-900 w-14 h-14 rounded-full flex items-center justify-center shadow-xl hover:scale-105 active:scale-95 transition-all"
                      >
                        <div className="w-10 h-10 border-2 border-zinc-900 rounded-full" />
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="absolute inset-0"
                  >
                    <img src={image!} alt="Preview" className="w-full h-full object-contain bg-zinc-900" />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {image && !isScanning && !result && (
              <button
                onClick={() => handleScan()}
                className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-bold text-lg shadow-xl shadow-emerald-200 hover:bg-emerald-700 hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-3"
              >
                <Sparkles className="w-6 h-6" />
                Scan {scanMode === 'text' ? 'Text' : 'Table'}
              </button>
            )}

            {isScanning && (
              <div className="w-full bg-white py-4 rounded-2xl border border-zinc-200 flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
                <p className="text-zinc-500 font-medium animate-pulse">Analyzing image with AI...</p>
              </div>
            )}

            {error && (
              <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-sm font-medium">
                {error}
              </div>
            )}
          </div>

          {/* Result Section */}
          <div className="space-y-6 flex flex-col">
            <h2 className="text-lg font-semibold text-zinc-800">Results</h2>
            <div className="flex-1 min-h-[400px]">
              <AnimatePresence mode="wait">
                {result ? (
                  <motion.div
                    key="result"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="h-full"
                  >
                    <ResultView result={result} />
                  </motion.div>
                ) : (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="h-full flex flex-col items-center justify-center bg-white rounded-3xl border border-zinc-200 p-10 text-center"
                  >
                    <div className="w-16 h-16 bg-zinc-50 rounded-full flex items-center justify-center mb-4">
                      <FileText className="w-8 h-8 text-zinc-300" />
                    </div>
                    <p className="text-zinc-400 font-medium">Scan an image to see results here</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </main>

      {/* Footer Info */}
      <footer className="max-w-6xl mx-auto px-6 py-10 text-center">
        <AdBanner slot="1234567890" />
        <p className="text-zinc-400 text-sm">
          Supports printed text, handwriting, and complex table structures.
        </p>
      </footer>
    </div>
  );
}
