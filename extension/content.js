// SellerAide Content Script - Extracts listing data from Amazon & eBay

function detectMarketplace() {
  const url = window.location.href;
  if (/amazon\.(com|co\.uk|ca|de)/.test(url) && /\/dp\//.test(url)) return 'amazon';
  if (/ebay\.(com|co\.uk)\/itm\//.test(url)) return 'ebay';
  return null;
}

function extractAPlusModules() {
  const container = document.querySelector('#aplus')
    || document.querySelector('#aplus_feature_div')
    || document.querySelector('#aplus3p_feature_div');
  if (!container) return [];

  const modules = [];

  // Try data-module-type containers first (structured A+ with known type)
  const moduleEls = container.querySelectorAll('[data-module-type]');

  if (moduleEls.length > 0) {
    moduleEls.forEach((el, i) => {
      const type = el.getAttribute('data-module-type') || 'STANDARD_TEXT';
      const headline = el.querySelector('h1, h2, h3, h4, .aplus-h2, .aplus-h3')?.textContent?.trim().slice(0, 200) || '';
      // Body only needs to be non-empty for scoring — cap at 300 chars to keep URL size small
      const body = Array.from(el.querySelectorAll('p'))
        .map(p => p.textContent?.trim())
        .filter(Boolean)
        .join(' ')
        .slice(0, 300);
      const firstImg = el.querySelector('img[alt]');
      const altText = firstImg ? (firstImg.getAttribute('alt') || '').trim().slice(0, 100) : '';

      modules.push({
        type,
        position: i + 1,
        headline,
        body,
        ...(altText ? { image: { alt_text: altText, image_guidance: '' } } : {}),
      });
    });
  } else {
    // Fallback: treat each top-level child as a module
    Array.from(container.querySelectorAll(':scope > div, :scope > section'))
      .slice(0, 7)
      .forEach((el, i) => {
        const headline = el.querySelector('h1, h2, h3, h4')?.textContent?.trim().slice(0, 200) || '';
        const body = Array.from(el.querySelectorAll('p'))
          .map(p => p.textContent?.trim())
          .filter(Boolean)
          .join(' ')
          .slice(0, 300);
        const firstImg = el.querySelector('img[alt]');
        const altText = firstImg ? (firstImg.getAttribute('alt') || '').trim().slice(0, 100) : '';

        if (headline || body || altText) {
          modules.push({
            type: 'STANDARD_TEXT',
            position: i + 1,
            headline,
            body,
            ...(altText ? { image: { alt_text: altText, image_guidance: '' } } : {}),
          });
        }
      });
  }

  return modules;
}

function extractAmazonData() {
  const url = window.location.href;
  const asinMatch = url.match(/\/dp\/([A-Z0-9]{10})/);
  const asin = asinMatch?.[1] || document.querySelector('input[name="ASIN"]')?.value || null;

  const title = document.querySelector('#productTitle')?.textContent?.trim() || '';
  const bullets = Array.from(document.querySelectorAll('#feature-bullets .a-list-item'))
    .map(el => el.textContent?.trim())
    .filter(Boolean);
  const description = (
    document.querySelector('#productDescription')?.textContent?.trim()
    || document.querySelector('#aplus_feature_div')?.textContent?.trim()
    || ''
  ).slice(0, 3000);
  const a_plus_modules = extractAPlusModules();

  return {
    marketplace: 'amazon',
    title,
    bullets,
    description,
    backend_keywords: '',
    asin,
    item_specifics: null,
    a_plus_modules,
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
