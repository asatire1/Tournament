/**
 * BugsIQ Feedback Button - Standalone (no bundler required)
 * Include this script on any page to add the floating bug report button.
 * Loads html2canvas-pro from CDN for screenshot capture.
 */
(function() {
  'use strict';

  const CLOUD_FUNCTION_URL =
    'https://europe-west2-recruitment-633bd.cloudfunctions.net/submitFeedbackToIssueIQ';
  const PRIORITY_MAP = { urgent: 'critical', standard: 'medium', improvement: 'low' };

  // Inject styles
  const style = document.createElement('style');
  style.textContent = `
.feedback-fab{position:fixed;bottom:20px;right:20px;width:44px;height:44px;border-radius:50%;border:none;background:#0d9488;color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,.15);transition:background .2s,transform .2s,box-shadow .2s;z-index:10001;opacity:.7}
.feedback-fab:hover{background:#0f766e;transform:scale(1.08);box-shadow:0 4px 12px rgba(0,0,0,.2);opacity:1}
.feedback-fab:active{transform:scale(.96)}
.feedback-overlay{position:fixed;inset:0;background:rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;z-index:9999;padding:16px}
.feedback-modal{background:#fff;border-radius:12px;width:100%;max-width:480px;max-height:90vh;display:flex;flex-direction:column;box-shadow:0 20px 60px rgba(0,0,0,.2);animation:fbUp .2s ease-out;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif}
@keyframes fbUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
.feedback-modal-header{display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid #e5e7eb}
.feedback-modal-header h3{margin:0;font-size:16px;font-weight:600;color:#111827}
.fb-close{background:none;border:none;padding:4px;cursor:pointer;color:#6b7280;border-radius:4px;display:flex;align-items:center;justify-content:center}
.fb-close:hover{color:#111827;background:#f3f4f6}
.feedback-modal-body{padding:20px;overflow-y:auto;flex:1}
.fb-field{margin-bottom:16px}.fb-field:last-child{margin-bottom:0}
.fb-label{display:block;font-size:13px;font-weight:600;color:#374151;margin-bottom:6px}
.fb-req{color:#ef4444}
.fb-pgroup{display:flex;gap:8px}
.fb-pbtn{flex:1;padding:8px 12px;border:2px solid #e5e7eb;border-radius:8px;background:#fff;font-size:13px;font-weight:500;color:#6b7280;cursor:pointer;transition:all .15s}
.fb-pbtn:hover{border-color:#d1d5db}
.fb-pbtn.au{border-color:#ef4444;background:#fef2f2;color:#dc2626}
.fb-pbtn.as{border-color:#3b82f6;background:#eff6ff;color:#2563eb}
.fb-pbtn.ai{border-color:#10b981;background:#ecfdf5;color:#059669}
.fb-input{width:100%;padding:10px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:14px;font-family:inherit;color:#111827;resize:vertical;min-height:80px;transition:border-color .15s;box-sizing:border-box}
.fb-input:focus{outline:none;border-color:#3b82f6;box-shadow:0 0 0 3px rgba(59,130,246,.1)}
.fb-input::placeholder{color:#9ca3af}
.fb-imgprev{position:relative;border-radius:8px;overflow:hidden;border:1px solid #e5e7eb}
.fb-imgprev img{width:100%;max-height:200px;object-fit:cover;display:block}
.fb-imgact{position:absolute;top:8px;right:8px;display:flex;gap:4px}
.fb-imgbtn{background:rgba(0,0,0,.6);color:#fff;border:none;border-radius:4px;padding:4px 10px;font-size:12px;cursor:pointer}
.fb-imgbtn:hover{background:rgba(0,0,0,.8)}
.fb-autob{font-size:11px;font-weight:400;color:#059669;margin-left:6px}
.fb-info{padding:0 20px 4px;font-size:12px;color:#9ca3af}
.fb-footer{display:flex;justify-content:flex-end;gap:8px;padding:12px 20px;border-top:1px solid #e5e7eb}
.fb-cancel{padding:8px 16px;border:1px solid #d1d5db;border-radius:8px;background:#fff;font-size:14px;color:#374151;cursor:pointer;font-weight:500}
.fb-cancel:hover{background:#f3f4f6}
.fb-submit{padding:8px 20px;border:none;border-radius:8px;background:#0d4a6f;font-size:14px;color:#fff;cursor:pointer;font-weight:500;transition:background .15s}
.fb-submit:hover:not(:disabled){background:#0b3d5c}
.fb-submit:disabled{opacity:.5;cursor:not-allowed}
.fb-toast{position:fixed;bottom:80px;right:24px;padding:12px 20px;border-radius:8px;font-size:14px;font-weight:500;z-index:10000;animation:fbTin .3s ease-out;box-shadow:0 4px 12px rgba(0,0,0,.15);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif}
.fb-toast-ok{background:#ecfdf5;color:#065f46;border:1px solid #a7f3d0}
.fb-toast-err{background:#fef2f2;color:#991b1b;border:1px solid #fecaca}
@keyframes fbTin{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
@media(max-width:640px){.feedback-fab{bottom:72px;right:12px}.feedback-modal{max-width:100%;max-height:85vh}.fb-toast{bottom:136px;right:16px;left:16px}}
  `;
  document.head.appendChild(style);

  // Load html2canvas-pro from CDN
  const script = document.createElement('script');
  script.src = 'https://unpkg.com/html2canvas-pro@1.5.8/dist/html2canvas-pro.min.js';
  document.head.appendChild(script);

  const BUG_SVG = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="6" r="2.5"/><ellipse cx="12" cy="15" rx="5" ry="7"/><line x1="7" y1="14" x2="17" y2="14"/><path d="M10 4L7 1"/><path d="M14 4L17 1"/><path d="M7.5 11L3 9"/><path d="M16.5 11L21 9"/><path d="M7 15L3 15"/><path d="M17 15L21 15"/><path d="M7.5 19L4 22"/><path d="M16.5 19L20 22"/></svg>';

  let autoScreenshot = null;
  let priority = 'standard';
  let submitting = false;
  let overlay = null;

  // Create FAB
  const fab = document.createElement('button');
  fab.className = 'feedback-fab';
  fab.title = 'Report an issue or suggestion';
  fab.setAttribute('aria-label', 'Report an issue or suggestion');
  fab.innerHTML = BUG_SVG;
  fab.addEventListener('click', handleOpen);

  // Add FAB when DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => document.body.appendChild(fab));
  } else {
    document.body.appendChild(fab);
  }

  async function handleOpen() {
    try {
      if (typeof html2canvas === 'function') {
        const target = document.getElementById('app') || document.body;
        const canvas = await html2canvas(target, {
          logging: false, useCORS: true, allowTaint: true, scale: 0.5,
          ignoreElements: function(el) { return el.classList && el.classList.contains('feedback-fab'); },
        });
        autoScreenshot = canvas.toDataURL('image/png', 0.7);
      }
    } catch (err) {
      console.error('Screenshot capture failed:', err);
      autoScreenshot = null;
    }
    openModal();
  }

  function openModal() {
    priority = 'standard';
    overlay = document.createElement('div');
    overlay.className = 'feedback-overlay';
    overlay.addEventListener('click', function(e) { if (e.target === overlay) closeModal(); });

    overlay.innerHTML =
      '<div class="feedback-modal">' +
        '<div class="feedback-modal-header"><h3>Report Issue / Suggestion</h3>' +
        '<button class="fb-close" aria-label="Close"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div>' +
        '<div class="feedback-modal-body">' +
          '<div class="fb-field"><label class="fb-label">Priority</label><div class="fb-pgroup">' +
            '<button type="button" class="fb-pbtn" data-p="urgent">Urgent</button>' +
            '<button type="button" class="fb-pbtn as" data-p="standard">Standard</button>' +
            '<button type="button" class="fb-pbtn" data-p="improvement">Improvement</button>' +
          '</div></div>' +
          '<div class="fb-field"><label class="fb-label" for="fb-title">Title</label>' +
            '<input id="fb-title" type="text" class="fb-input" style="min-height:auto;resize:none;padding:8px 12px" placeholder="Brief summary (optional)"></div>' +
          '<div class="fb-field"><label class="fb-label" for="fb-desc">Description <span class="fb-req">*</span></label>' +
            '<textarea id="fb-desc" class="fb-input" placeholder="Describe the issue or suggestion..." rows="4"></textarea></div>' +
          '<div class="fb-field"><label class="fb-label">Screenshot' +
            (autoScreenshot ? ' <span class="fb-autob">auto-captured</span>' : '') + '</label>' +
            '<div id="fb-img"></div></div>' +
        '</div>' +
        '<div class="fb-info">Page info is included automatically.</div>' +
        '<div class="fb-footer"><button class="fb-cancel">Cancel</button><button class="fb-submit" disabled>Submit</button></div>' +
      '</div>';

    document.body.appendChild(overlay);

    // Screenshot preview
    var imgArea = overlay.querySelector('#fb-img');
    if (autoScreenshot) {
      imgArea.innerHTML = '<div class="fb-imgprev"><img src="' + autoScreenshot + '" alt="Preview"><div class="fb-imgact"><button class="fb-imgbtn" type="button">Remove</button></div></div>';
      imgArea.querySelector('.fb-imgbtn').addEventListener('click', function() {
        autoScreenshot = null;
        imgArea.innerHTML = '';
      });
    }

    // Priority buttons
    var pBtns = overlay.querySelectorAll('.fb-pbtn');
    pBtns.forEach(function(btn) {
      btn.addEventListener('click', function() {
        pBtns.forEach(function(b) { b.className = 'fb-pbtn'; });
        var p = btn.getAttribute('data-p');
        btn.classList.add(p === 'urgent' ? 'au' : p === 'standard' ? 'as' : 'ai');
        priority = p;
      });
    });

    // Enable/disable submit
    var descEl = overlay.querySelector('#fb-desc');
    var submitBtn = overlay.querySelector('.fb-submit');
    descEl.addEventListener('input', function() { submitBtn.disabled = !descEl.value.trim(); });

    overlay.querySelector('.fb-close').addEventListener('click', closeModal);
    overlay.querySelector('.fb-cancel').addEventListener('click', closeModal);
    submitBtn.addEventListener('click', doSubmit);
  }

  function closeModal() {
    if (submitting) return;
    if (overlay) { overlay.remove(); overlay = null; }
    autoScreenshot = null;
  }

  function showToast(type, message) {
    var t = document.createElement('div');
    t.className = 'fb-toast fb-toast-' + (type === 'success' ? 'ok' : 'err');
    t.textContent = message;
    document.body.appendChild(t);
    setTimeout(function() { t.remove(); }, 4000);
  }

  async function doSubmit() {
    if (submitting || !overlay) return;
    var desc = overlay.querySelector('#fb-desc').value.trim();
    var title = overlay.querySelector('#fb-title').value.trim();
    if (!desc) return;

    submitting = true;
    var btn = overlay.querySelector('.fb-submit');
    btn.textContent = 'Submitting...';
    btn.disabled = true;

    try {
      var imageBase64, imageMimeType;
      if (autoScreenshot) {
        var b64 = autoScreenshot.split(',')[1];
        if (b64) { imageBase64 = b64; imageMimeType = 'image/png'; }
      }

      var resp = await fetch(CLOUD_FUNCTION_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: {
          description: desc,
          priority: PRIORITY_MAP[priority],
          type: priority === 'improvement' ? 'enhancement' : 'bug',
          title: title || undefined,
          imageBase64: imageBase64,
          imageMimeType: imageMimeType,
          pageUrl: window.location.href,
          userAgent: navigator.userAgent,
          appName: 'uberpadel',
        }}),
      });

      if (!resp.ok) throw new Error('HTTP ' + resp.status);
      var result = await resp.json();

      if (result.result && result.result.success) {
        showToast('success', 'Feedback submitted - thank you!');
        closeModal();
      } else {
        showToast('error', 'Failed to submit feedback. Please try again.');
      }
    } catch (e) {
      showToast('error', 'Failed to submit feedback. Please try again.');
    } finally {
      submitting = false;
    }
  }
})();
