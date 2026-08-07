'use client';

import Script from 'next/script';

const KLAVIYO_BOOTSTRAP = `
window._klOnsite = window._klOnsite || [];
if (!window.klaviyo) {
  window.klaviyo = {
    track: function(){ window._klOnsite.push(['track'].concat(Array.prototype.slice.call(arguments))); },
    identify: function(){ window._klOnsite.push(['identify'].concat(Array.prototype.slice.call(arguments))); },
    trackViewedItem: function(){ window._klOnsite.push(['trackViewedItem'].concat(Array.prototype.slice.call(arguments))); }
  };
}
`;

export default function KlaviyoLoader({ siteId }: { siteId: string }) {
  if (!siteId) {
    return null;
  }

  return (
    <>
      <Script id="klaviyo-bootstrap" strategy="afterInteractive">
        {KLAVIYO_BOOTSTRAP}
      </Script>
      <Script
        id="klaviyo-onsite"
        src={`https://static.klaviyo.com/onsite/js/${siteId}/klaviyo.js`}
        strategy="afterInteractive"
      />
    </>
  );
}
