import React from 'react';
import { Scan, Sparkles, FileText, Table as TableIcon, Shield, Zap, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';
import { AdBanner } from './AdBanner';

interface LandingPageProps {
  onStart: () => void;
}

export function LandingPage({ onStart }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-[#F5F5F7] overflow-x-hidden">
      {/* Hero Section */}
      <section className="relative pt-20 pb-16 md:pt-32 md:pb-24 px-6">
        <div className="max-w-6xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold uppercase tracking-wider mb-6">
              <Sparkles className="w-3.5 h-3.5" />
              Next-Gen AI Document Scanner
            </div>
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-zinc-900 mb-6 leading-[1.1]">
              Transform your documents <br />
              <span className="text-emerald-600">into digital data instantly.</span>
            </h1>
            <p className="text-lg md:text-xl text-zinc-500 max-w-2xl mx-auto mb-10 leading-relaxed">
              ScanMaster AI uses advanced Gemini models to extract text, handwriting, and tables from any photo with incredible precision.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={onStart}
                className="w-full sm:w-auto bg-emerald-600 text-white px-8 py-4 rounded-2xl font-bold text-lg shadow-xl shadow-emerald-200 hover:bg-emerald-700 hover:-translate-y-1 transition-all flex items-center justify-center gap-3"
              >
                Get Started for Free
                <Zap className="w-5 h-5 fill-current" />
              </button>
              <p className="text-sm text-zinc-400 font-medium">No account required • PWA Ready</p>
            </div>
          </motion.div>
        </div>

        {/* Background Decoration */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full -z-0 opacity-20 pointer-events-none">
          <div className="absolute top-20 left-10 w-64 h-64 bg-emerald-400 rounded-full blur-[120px]" />
          <div className="absolute bottom-0 right-10 w-96 h-96 bg-blue-400 rounded-full blur-[150px]" />
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-6 bg-white border-y border-zinc-200">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="space-y-4">
              <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
                <FileText className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-zinc-900">Text Extraction</h3>
              <p className="text-zinc-500 leading-relaxed">
                Extract printed or handwritten text from any document, receipt, or note with high accuracy.
              </p>
            </div>
            <div className="space-y-4">
              <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                <TableIcon className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-zinc-900">Table Recognition</h3>
              <p className="text-zinc-500 leading-relaxed">
                Automatically detect and convert tables into structured formats like CSV or Excel-ready text.
              </p>
            </div>
            <div className="space-y-4">
              <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600">
                <Shield className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-zinc-900">Privacy First</h3>
              <p className="text-zinc-500 leading-relaxed">
                Your documents are processed securely and never stored on our servers. You remain in control.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Badges */}
      <section className="py-16 px-6">
        <div className="max-w-6xl mx-auto flex flex-wrap justify-center items-center gap-8 md:gap-16 opacity-50 grayscale">
          <div className="flex items-center gap-2 font-bold text-xl text-zinc-400">
            <CheckCircle2 className="w-6 h-6" />
            SECURE
          </div>
          <div className="flex items-center gap-2 font-bold text-xl text-zinc-400">
            <CheckCircle2 className="w-6 h-6" />
            AI-POWERED
          </div>
          <div className="flex items-center gap-2 font-bold text-xl text-zinc-400">
            <CheckCircle2 className="w-6 h-6" />
            FAST
          </div>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-6">
        <AdBanner slot="0987654321" />
      </div>

      {/* Footer */}
      <footer className="py-12 px-6 text-center border-t border-zinc-200">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Scan className="text-emerald-600 w-6 h-6" />
          <span className="font-bold text-xl">ScanMaster AI</span>
        </div>
        <p className="text-zinc-400 text-sm">
          © 2026 ScanMaster AI. All rights reserved. Built with Gemini.
        </p>
      </footer>
    </div>
  );
}
