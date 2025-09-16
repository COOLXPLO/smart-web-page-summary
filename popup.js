// popup.js - UI logic for Smart Page Summary
const summarizeBtn = document.getElementById('summarize');
const copyBtn = document.getElementById('copy');
const downloadBtn = document.getElementById('download');
const summaryDiv = document.getElementById('summary');
const statusDiv = document.getElementById('status');

function setStatus(txt, muted=false) {
  statusDiv.textContent = txt;
  statusDiv.style.color = muted ? '' : '';
}

function enableControls(enabled) {
  copyBtn.disabled = !enabled;
  downloadBtn.disabled = !enabled;
}

async function fetchSummaryFromAPI(text) {
  // ======= IMPORTANT: Replace this implementation with the Chrome Built-in AI API call =======
  // This is a placeholder fetch to an example endpoint. Replace the URL and payload with the
  // required request for Chrome Built-in AI or your own summarization endpoint.
  //
  // Example: use chrome.identity or the chrome.runtime.getURL method if you handle auth in background.
  //
  // For now this mimics an API call with a summarization using the first ~1200 chars for speed.

  // Basic safety/size limiting:
  const CHUNK = 12000;
  const payloadText = text.length > CHUNK ? text.slice(0, CHUNK) : text;

  // Demo local summarization endpoint (non-functional). Replace below:
  const demoEndpoint = 'https://example.com/api/summarize'; // <-- REPLACE THIS

  // For demo: we'll return the first few lines as "summary" if endpoint isn't configured.
  try {
    // If you have a real endpoint, uncomment below and configure correctly:
    /*
    const res = await fetch(demoEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: payloadText, mode: 'bullet' })
    });
    if (!res.ok) throw new Error('API error ' + res.status);
    const json = await res.json();
    return json.summary || json.result || '';
    */

    // Placeholder fallback:
    // create a human-like short summary by extracting top sentences (very naive)
    const sentences = payloadText
      .replace(/\s+/g, ' ')
      .match(/[^\.!\?]+[\.!\?]+/g) || [payloadText.slice(0, 300)];
    const firstSentences = sentences.slice(0, 3).map(s => s.trim());
    return firstSentences.join(' ').slice(0, 1200);
  } catch (err) {
    console.error('Summarize error', err);
    throw err;
  }
}

async function extractPageText(tabId) {
  // Inject script to read readable text from the page
  const [{ result }] = await chrome.scripting.executeScript({
    target: { tabId },
    func: () => {
      // Extract article-like content
      const selectors = ['article', 'main', '[role="main"]', '#content', '.post', '.article'];
      let text = '';

      // prefer article/main
      for (const s of selectors) {
        const el = document.querySelector(s);
        if (el) {
          text = el.innerText;
          break;
        }
      }

      // fallback to body visible text
      if (!text) {
        // remove script/style elements before grabbing text
        const cloned = document.body.cloneNode(true);
        const remove = cloned.querySelectorAll('script, style, noscript, iframe, header, footer, nav');
        remove.forEach(n => n.remove());
        text = cloned.innerText || '';
      }

      // trim and normalize whitespace
      return text.replace(/\s+/g, ' ').trim();
    }
  });

  return result || '';
}

async function onSummarizeClick() {
  try {
    setStatus('Extracting page text...');
    summaryDiv.textContent = '';
    enableControls(false);
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.id) {
      setStatus('No active tab found.', true);
      return;
    }

    const pageText = await extractPageText(tab.id);
    if (!pageText || pageText.length < 50) {
      setStatus('Could not extract enough text from this page.', true);
      return;
    }

    setStatus('Generating summary... (using local fallback — replace with AI API)');
    // Call placeholder API - replace with real endpoint or Chrome Built-in AI API.
    const summary = await fetchSummaryFromAPI(pageText);

    if (!summary || summary.trim().length === 0) {
      setStatus('No summary returned from API.', true);
      return;
    }

    summaryDiv.textContent = summary;
    setStatus('Summary ready.');
    enableControls(true);
  } catch (err) {
    console.error(err);
    setStatus('Failed to summarize page. See console for details.', true);
  }
}

summarizeBtn.addEventListener('click', onSummarizeClick);

copyBtn.addEventListener('click', async () => {
  const text = summaryDiv.textContent || '';
  try {
    await navigator.clipboard.writeText(text);
    setStatus('Summary copied to clipboard.');
  } catch {
    setStatus('Copy failed — your browser may block clipboard access.', true);
  }
});

downloadBtn.addEventListener('click', () => {
  const text = summaryDiv.textContent || '';
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'page-summary.txt';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
});
