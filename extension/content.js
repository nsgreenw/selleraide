// SellerAide Content Script - Extracts listing data from Amazon & eBay

function detectMarketplace() {
  const url = window.location.href;
  if (/amazon\.(com|co\.uk|ca|de)/.test(url) && /\/dp\//.test(url)) return 'amazon';
  if (/ebay\.(com|co\.uk)\/itm\//.test(url)) return 'ebay';
  return null;
}

function extractAmazonData() {
  const url = window.location.href;
  const asinMatch = url.match(/\/dp\/([A-Z0-9]{10})/);
  const asin = asinMatch?.[1] || document.querySelector('input[name="ASIN"]')?.value || null;

  const title = document.querySelector('#productTitle')?.textContent?.trim() || '';
  const bullets = Array.from(document.querySelectorAll('#feature-bullets .a-list-item'))
    .map(el => el.textContent?.trim())
    .filter(Boolean);
  const description = document.querySelector('#productDescription')?.textContent?.trim()
    || document.querySelector('#aplus_feature_div')?.textContent?.trim()
    || '';

  return {
    marketplace: 'amazon',
    title,
    bullets,
    description,
    backend_keywords: '',
    asin,
    item_specifics: null
  };
}

function extractEbayData() {
  const title = document.querySelector('.x-item-title__mainTitle')?.textContent?.trim() || '';

  // Try iframe description first, fallback to inline
  let description = '';
  const iframe = document.querySelector('#desc_ifr');
  if (iframe) {
    try {
      description = iframe.contentDocument?.body?.textContent?.trim() || '';
    } catch (e) {
      // Cross-origin iframe, fall through
    }
  }
  if (!description) {
    description = document.querySelector('.x-item-description')?.textContent?.trim() || '';
  }

  // Collect item specifics
  const itemSpecifics = {};
  document.querySelectorAll('.ux-labels-values').forEach(row => {
    const label = row.querySelector('.ux-labels-values__labels')?.textContent?.trim();
    const value = row.querySelector('.ux-labels-values__values')?.textContent?.trim();
    if (label && value) itemSpecifics[label] = value;
  });

  return {
    marketplace: 'ebay',
    title,
    bullets: [],
    description,
    backend_keywords: '',
    asin: null,
    item_specifics: itemSpecifics
  };
}

function extractListingData() {
  const marketplace = detectMarketplace();
  if (marketplace === 'amazon') return extractAmazonData();
  if (marketplace === 'ebay') return extractEbayData();
  return {
    marketplace: null,
    title: '',
    bullets: [],
    description: '',
    backend_keywords: '',
    asin: null,
    item_specifics: null
  };
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extractListing') {
    const data = extractListingData();
    sendResponse(data);
  }
  return true;
});
