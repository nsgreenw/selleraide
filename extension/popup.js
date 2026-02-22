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
const resultsEl = document.getElementById('results');
const scoreCircle = document.getElementById('score-circle');
const gradeEl = document.getElementById('grade');
const issuesList = document.getElementById('issues-list');
const btnFullReport = document.getElementById('btn-full-report');

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

btnAudit.addEventListener('click', async () => {
  btnAudit.disabled = true;
  btnAudit.textContent = 'Auditing...';
  resultsEl.classList.remove('visible');

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
    item_specifics: listingData?.item_specifics || null
  };

  try {
    const res = await fetch(`${API_BASE}/api/audit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const result = await res.json();
    displayResults(result, payload);
  } catch (err) {
    statusEl.textContent = `Audit failed: ${err.message}`;
    statusEl.classList.remove('detected');
    statusEl.classList.add('error');
  } finally {
    btnAudit.disabled = false;
    btnAudit.textContent = 'Run Audit';
  }
});

function displayResults(result, payload) {
  const score = result.score ?? 0;
  scoreCircle.textContent = score;
  scoreCircle.className = 'score-circle ' + (score < 50 ? 'red' : score < 80 ? 'yellow' : 'green');
  gradeEl.textContent = result.grade || (score >= 80 ? 'Great' : score >= 50 ? 'Needs Work' : 'Poor');

  issuesList.innerHTML = '';
  const SEV_CLASS = { error: 'high', warning: 'medium', info: 'low' };
  const issues = (result.validation || []).slice(0, 5);
  if (issues.length === 0) {
    issuesList.innerHTML = '<div class="issue" style="color:#4ade80">No major issues found!</div>';
  } else {
    issues.forEach(issue => {
      const div = document.createElement('div');
      div.className = 'issue';
      const sev = issue.severity || 'warning';
      const sevClass = SEV_CLASS[sev] || 'medium';
      div.innerHTML = `<span class="severity ${sevClass}">${sev.toUpperCase()}</span>${issue.message || issue}`;
      issuesList.appendChild(div);
    });
  }

  // Full report link
  const encoded = btoa(JSON.stringify(payload));
  btnFullReport.href = `${SITE_URL}/audit?data=${encoded}`;

  resultsEl.classList.add('visible');
}

btnFullReport.addEventListener('click', (e) => {
  e.preventDefault();
  chrome.tabs.create({ url: btnFullReport.href });
});
