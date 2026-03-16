import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';
import { fileURLToPath } from 'url';
import path from 'path';

// __dirname की कमी को पूरा करने के लिए ये दो लाइनें ज़रूरी हैं
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    plugins: [react(), tailwindcss()],
    define: {
      // ध्यान दें: Vite में 'import.meta.env' इस्तेमाल करना बेहतर है, 
      // लेकिन अगर आपका पुराना कोड 'process.env' ढूंढ रहा है तो इसे रहने दें।
      'process.env.GEMINI_API_KEY': JSON.stringify(env.VITE_GEMINI_API_KEY || env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      // AI Studio के लिए HMR की सेटिंग्स
      hmr: process.env.DISABLE_HMR !== 'true',
    },
    build: {
      // इससे बिल्ड थोड़ा क्लीन बनेगा
      outDir: 'dist',
    }
  };
});
