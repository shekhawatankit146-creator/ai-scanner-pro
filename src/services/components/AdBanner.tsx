import React, { useEffect } from 'react';

interface AdBannerProps {
  slot: string;
  format?: 'auto' | 'fluid' | 'rectangle';
  style?: React.CSSProperties;
}

// Replace this with your actual AdSense Publisher ID (e.g., ca-pub-xxxxxxxxxxxx)
const ADSENSE_CLIENT_ID = 'ca-pub-placeholder';

export function AdBanner({ slot, format = 'auto', style }: AdBannerProps) {
  useEffect(() => {
    try {
      // @ts-ignore
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (e) {
      console.error('AdSense error:', e);
    }
  }, []);

  return (
    <div className="ad-container my-8 flex justify-center overflow-hidden">
      <ins
        className="adsbygoogle"
        style={style || { display: 'block', width: '100%' }}
        data-ad-client={ADSENSE_CLIENT_ID}
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
    </div>
  );
}
