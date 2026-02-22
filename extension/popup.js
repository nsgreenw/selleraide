// SellerAide Popup — Configurable API endpoint
const API_BASE = 'https://selleraide.com'; // Change to http://localhost:3000 for dev
const SITE_URL = 'https://selleraide.com';

let listingData = null;

const statusEl = document.getElementById('status');
const formSection = document.getElementById('form-section');
const titleField = document.getElementById('field-title');
const descField = document.getElementById('field-description');
const bulletsContainer = document.getElementById('bullets-container');
const btnAddBullet = document.getElementById('btn-add-bullet');
const btnAudit = document.getElementById('btn-audit');

// Extract data from content script on popup open
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  if (!tabs[0]?.id) {
    statusEl.textContent = 'No active tab found.';
    statusEl.classList.add('error');
    return;
  }
  chrome.tabs.sendMessage(tabs[0].id, { action: 'extractListing' }, (response) => {
    if (chrome.runtime.lastError || !response) {
      statusEl.textContent = 'Navigate to an Amazon or eBay listing to audit it.';
      statusEl.classList.add('error');
      return;
    }
    listingData = response;
    if (!response.marketplace) {
      statusEl.textContent = 'Not on a recognized listing page. Navigate to an Amazon or eBay product.';
      statusEl.classList.add('error');
      return;
    }
    statusEl.textContent = `${response.marketplace === 'amazon' ? 'Amazon' : 'eBay'} listing detected` + (response.asin ? ` · ${response.asin}` : '');
    statusEl.classList.add('detected');
    populateForm(response);
    formSection.classList.remove('hidden');
  });
});

function populateForm(data) {
  titleField.value = data.title || '';
  descField.value = data.description || '';
  bulletsContainer.innerHTML = '';
  const bullets = data.bullets?.length ? data.bullets : [''];
  bullets.forEach(b => addBulletInput(b));
}

function addBulletInput(value = '') {
  const input = document.createElement('input');
  input.type = 'text';
  input.value = value;
  input.className = 'bullet-input';
  input.placeholder = 'Bullet point...';
  bulletsContainer.appendChild(input);
}

btnAddBullet.addEventListener('click', () => addBulletInput());

btnAudit.addEventListener('click', () => {
  const bullets = Array.from(bulletsContainer.querySelectorAll('input'))
    .map(el => el.value.trim())
    .filter(Boolean);

  const payload = {
    marketplace: listingData?.marketplace || 'amazon',
    title: titleField.value.trim(),
    bullets,
    description: descField.value.trim(),
    backend_keywords: listingData?.backend_keywords || '',
    asin: listingData?.asin || null,
    a_plus_modules: listingData?.a_plus_modules || [],
  };

  try {
    const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
    chrome.tabs.create({ url: `${SITE_URL}/audit?data=${encoded}` });
  } catch (err) {
    statusEl.textContent = `Error: ${err.message}`;
    statusEl.classList.add('error');
  }
});
