// Load saved settings
chrome.storage.local.get(['apiUrl', 'token'], (data) => {
  document.getElementById('apiUrl').value = data.apiUrl || 'http://localhost:3001';
  document.getElementById('token').value = data.token || '';
});

// Save settings on change
['apiUrl', 'token'].forEach(id => {
  document.getElementById(id).addEventListener('change', () => {
    chrome.storage.local.set({ [id]: document.getElementById(id).value });
  });
});

// Extract from page
document.getElementById('extract').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  chrome.tabs.sendMessage(tab.id, { action: 'extract' }, (data) => {
    if (data) {
      document.getElementById('company').value = data.company || '';
      document.getElementById('role').value = data.role || '';
      document.getElementById('location').value = data.location || '';
      document.getElementById('jd').value = data.job_description?.slice(0, 2000) || '';
      showStatus('Extracted!', 'success');
    } else {
      showStatus('Could not extract. Try a job listing page.', 'error');
    }
  });
});

// Save to backend
document.getElementById('save').addEventListener('click', async () => {
  const apiUrl = document.getElementById('apiUrl').value;
  const token = document.getElementById('token').value;

  if (!token) return showStatus('Please set your auth token', 'error');

  const body = {
    company: document.getElementById('company').value,
    role: document.getElementById('role').value,
    location: document.getElementById('location').value,
    job_description: document.getElementById('jd').value,
    platform: detectPlatform(),
    job_url: (await chrome.tabs.query({ active: true, currentWindow: true }))[0]?.url || ''
  };

  if (!body.company || !body.role) return showStatus('Company and Role required', 'error');

  try {
    const res = await fetch(`${apiUrl}/api/extension/job`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (res.ok) showStatus('✓ Saved successfully!', 'success');
    else showStatus(data.error || 'Failed', 'error');
  } catch (err) {
    showStatus('Connection failed. Check API URL.', 'error');
  }
});

function detectPlatform() {
  const url = document.getElementById('apiUrl').value; // just for reference
  if (location.href?.includes('linkedin')) return 'LinkedIn';
  if (location.href?.includes('naukri')) return 'Naukri';
  if (location.href?.includes('glassdoor')) return 'Glassdoor';
  if (location.href?.includes('indeed')) return 'Indeed';
  return 'Other';
}

function showStatus(msg, type) {
  const el = document.getElementById('status');
  el.textContent = msg;
  el.className = `status ${type}`;
  setTimeout(() => { el.textContent = ''; }, 3000);
}
