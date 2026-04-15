/**
 * FeedbackButton — Internal Bug Report / Suggestion Button
 * Self-contained vanilla JS floating feedback button with modal.
 * Saves reports directly to Firebase Realtime Database.
 */

import html2canvas from 'html2canvas-pro';

const PRIORITY_MAP = { urgent: 'critical', standard: 'medium', improvement: 'low' };

const STYLES = `
.feedback-fab{position:fixed;bottom:20px;right:20px;width:44px;height:44px;border-radius:50%;border:none;background:#0d9488;color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,.15);transition:background .2s,transform .2s,box-shadow .2s;z-index:9990;opacity:.7}
.feedback-fab:hover{background:#0f766e;transform:scale(1.08);box-shadow:0 4px 12px rgba(0,0,0,.2);opacity:1}
.feedback-fab:active{transform:scale(.96)}
.feedback-overlay{position:fixed;inset:0;background:rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;z-index:9999;padding:16px}
.feedback-modal{background:#fff;border-radius:12px;width:100%;max-width:480px;max-height:90vh;display:flex;flex-direction:column;box-shadow:0 20px 60px rgba(0,0,0,.2);animation:fbSlideUp .2s ease-out;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif}
@keyframes fbSlideUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
.feedback-modal-header{display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid #e5e7eb}
.feedback-modal-header h3{margin:0;font-size:16px;font-weight:600;color:#111827}
.feedback-close-btn{background:none;border:none;padding:4px;cursor:pointer;color:#6b7280;border-radius:4px;display:flex;align-items:center;justify-content:center}
.feedback-close-btn:hover{color:#111827;background:#f3f4f6}
.feedback-modal-body{padding:20px;overflow-y:auto;flex:1}
.feedback-field{margin-bottom:16px}
.feedback-label{display:block;font-size:13px;font-weight:600;color:#374151;margin-bottom:6px}
.feedback-required{color:#ef4444}
.feedback-priority-group{display:flex;gap:8px}
.feedback-priority-btn{flex:1;padding:8px 12px;border:2px solid #e5e7eb;border-radius:8px;background:#fff;font-size:13px;font-weight:500;color:#6b7280;cursor:pointer;transition:all .15s}
.feedback-priority-btn:hover{border-color:#d1d5db}
.feedback-priority-btn.active-urgent{border-color:#ef4444;background:#fef2f2;color:#dc2626}
.feedback-priority-btn.active-standard{border-color:#3b82f6;background:#eff6ff;color:#2563eb}
.feedback-priority-btn.active-improvement{border-color:#10b981;background:#ecfdf5;color:#059669}
.feedback-textarea{width:100%;padding:10px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:14px;font-family:inherit;color:#111827;resize:vertical;min-height:80px;transition:border-color .15s;box-sizing:border-box}
.feedback-textarea:focus{outline:none;border-color:#3b82f6;box-shadow:0 0 0 3px rgba(59,130,246,.1)}
.feedback-textarea::placeholder{color:#9ca3af}
.feedback-image-preview{position:relative;border-radius:8px;overflow:hidden;border:1px solid #e5e7eb}
.feedback-image-preview img{width:100%;max-height:200px;object-fit:cover;display:block}
.feedback-image-actions{position:absolute;top:8px;right:8px;display:flex;gap:4px}
.feedback-image-remove{background:rgba(0,0,0,.6);color:#fff;border:none;border-radius:4px;padding:4px 10px;font-size:12px;cursor:pointer}
.feedback-image-remove:hover{background:rgba(0,0,0,.8)}
.feedback-auto-badge{font-size:11px;font-weight:400;color:#059669;margin-left:6px}
.feedback-auto-info{padding:0 20px 4px;font-size:12px;color:#9ca3af}
.feedback-modal-footer{display:flex;justify-content:flex-end;gap:8px;padding:12px 20px;border-top:1px solid #e5e7eb}
.feedback-cancel-btn{padding:8px 16px;border:1px solid #d1d5db;border-radius:8px;background:#fff;font-size:14px;color:#374151;cursor:pointer;font-weight:500}
.feedback-cancel-btn:hover{background:#f3f4f6}
.feedback-submit-btn{padding:8px 20px;border:none;border-radius:8px;background:#7c3aed;font-size:14px;color:#fff;cursor:pointer;font-weight:500;transition:background .15s}
.feedback-submit-btn:hover:not(:disabled){background:#6d28d9}
.feedback-submit-btn:disabled{opacity:.5;cursor:not-allowed}
.feedback-toast{position:fixed;bottom:80px;right:24px;padding:12px 20px;border-radius:8px;font-size:14px;font-weight:500;z-index:10000;animation:fbToastIn .3s ease-out;box-shadow:0 4px 12px rgba(0,0,0,.15);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif}
.feedback-toast-success{background:#ecfdf5;color:#065f46;border:1px solid #a7f3d0}
.feedback-toast-error{background:#fef2f2;color:#991b1b;border:1px solid #fecaca}
@keyframes fbToastIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
@media(max-width:640px){.feedback-fab{bottom:72px;right:12px}.feedback-modal{max-width:100%;max-height:85vh}.feedback-toast{bottom:136px;right:16px;left:16px}}
`;

const BUG_SVG = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="6" r="2.5"/><ellipse cx="12" cy="15" rx="5" ry="7"/><line x1="7" y1="14" x2="17" y2="14"/><path d="M10 4L7 1"/><path d="M14 4L17 1"/><path d="M7.5 11L3 9"/><path d="M16.5 11L21 9"/><path d="M7 15L3 15"/><path d="M17 15L21 15"/><path d="M7.5 19L4 22"/><path d="M16.5 19L20 22"/></svg>`;

export class FeedbackButton {
  constructor() {
    this.isOpen = false;
    this.priority = 'standard';
    this.autoScreenshot = null;
    this.submitting = false;
    this._injectStyles();
    this._createFAB();
  }

  _injectStyles() {
    if (document.getElementById('feedback-btn-styles')) return;
    const style = document.createElement('style');
    style.id = 'feedback-btn-styles';
    style.textContent = STYLES;
    document.head.appendChild(style);
  }

  _createFAB() {
    const btn = document.createElement('button');
    btn.className = 'feedback-fab';
    btn.title = 'Report an issue or suggestion';
    btn.setAttribute('aria-label', 'Report an issue or suggestion');
    btn.innerHTML = BUG_SVG;
    btn.addEventListener('click', () => this._handleOpen());
    document.body.appendChild(btn);
    this.fab = btn;
  }

  async _handleOpen() {
    try {
      const target = document.getElementById('app') || document.body;
      const canvas = await html2canvas(target, {
        logging: false, useCORS: true, allowTaint: true, scale: 0.5,
        ignoreElements: (el) => el.classList?.contains('feedback-fab') === true,
      });
      this.autoScreenshot = canvas.toDataURL('image/png', 0.7);
    } catch (err) {
      console.error('Screenshot capture failed:', err);
      this.autoScreenshot = null;
    }
    this._openModal();
  }

  _openModal() {
    this.isOpen = true;
    this.priority = 'standard';

    const overlay = document.createElement('div');
    overlay.className = 'feedback-overlay';
    overlay.addEventListener('click', (e) => { if (e.target === overlay) this._close(); });

    overlay.innerHTML = `
      <div class="feedback-modal">
        <div class="feedback-modal-header">
          <h3>Report Issue / Suggestion</h3>
          <button class="feedback-close-btn" aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div class="feedback-modal-body">
          <div class="feedback-field">
            <label class="feedback-label">Priority</label>
            <div class="feedback-priority-group">
              <button type="button" class="feedback-priority-btn" data-p="urgent">Urgent</button>
              <button type="button" class="feedback-priority-btn active-standard" data-p="standard">Standard</button>
              <button type="button" class="feedback-priority-btn" data-p="improvement">Improvement</button>
            </div>
          </div>
          <div class="feedback-field">
            <label class="feedback-label" for="fb-title">Title</label>
            <input id="fb-title" type="text" class="feedback-textarea" style="min-height:auto;resize:none;padding:8px 12px" placeholder="Brief summary (optional)">
          </div>
          <div class="feedback-field">
            <label class="feedback-label" for="fb-desc">Description <span class="feedback-required">*</span></label>
            <textarea id="fb-desc" class="feedback-textarea" placeholder="Describe the issue or suggestion..." rows="4"></textarea>
          </div>
          <div class="feedback-field">
            <label class="feedback-label">Screenshot${this.autoScreenshot ? ' <span class="feedback-auto-badge">auto-captured</span>' : ''}</label>
            <div id="fb-img-area"></div>
          </div>
        </div>
        <div class="feedback-auto-info">Page info is included automatically.</div>
        <div class="feedback-modal-footer">
          <button class="feedback-cancel-btn">Cancel</button>
          <button class="feedback-submit-btn" disabled>Submit</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    this.overlay = overlay;

    // Screenshot preview
    const imgArea = overlay.querySelector('#fb-img-area');
    if (this.autoScreenshot) {
      imgArea.innerHTML = `<div class="feedback-image-preview"><img src="${this.autoScreenshot}" alt="Preview"><div class="feedback-image-actions"><button class="feedback-image-remove" type="button">Remove</button></div></div>`;
      imgArea.querySelector('.feedback-image-remove').addEventListener('click', () => {
        this.autoScreenshot = null;
        imgArea.innerHTML = '';
      });
    }

    // Priority buttons
    const pBtns = overlay.querySelectorAll('.feedback-priority-btn');
    pBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        pBtns.forEach(b => b.className = 'feedback-priority-btn');
        const p = btn.dataset.p;
        btn.classList.add(`active-${p}`);
        this.priority = p;
      });
    });

    // Enable/disable submit based on description
    const descEl = overlay.querySelector('#fb-desc');
    const submitBtn = overlay.querySelector('.feedback-submit-btn');
    descEl.addEventListener('input', () => {
      submitBtn.disabled = !descEl.value.trim();
    });

    overlay.querySelector('.feedback-close-btn').addEventListener('click', () => this._close());
    overlay.querySelector('.feedback-cancel-btn').addEventListener('click', () => this._close());
    submitBtn.addEventListener('click', () => this._submit());
  }

  _close() {
    if (this.submitting) return;
    this.overlay?.remove();
    this.overlay = null;
    this.isOpen = false;
    this.autoScreenshot = null;
  }

  _showToast(type, message) {
    const toast = document.createElement('div');
    toast.className = `feedback-toast feedback-toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
  }

  async _submit() {
    if (this.submitting) return;
    const desc = this.overlay.querySelector('#fb-desc').value.trim();
    const title = this.overlay.querySelector('#fb-title').value.trim();
    if (!desc) return;

    this.submitting = true;
    const submitBtn = this.overlay.querySelector('.feedback-submit-btn');
    submitBtn.textContent = 'Submitting...';
    submitBtn.disabled = true;

    try {
      // Use Firebase global (loaded via compat SDK on all pages)
      if (typeof firebase === 'undefined' || !firebase.database) {
        throw new Error('Firebase not available');
      }

      let screenshot = null;
      if (this.autoScreenshot) {
        const b64 = this.autoScreenshot.split(',')[1];
        if (b64) screenshot = b64;
      }

      const report = {
        title: title || null,
        description: desc,
        priority: PRIORITY_MAP[this.priority],
        type: this.priority === 'improvement' ? 'enhancement' : 'bug',
        screenshot,
        pageUrl: window.location.href,
        userAgent: navigator.userAgent,
        createdAt: new Date().toISOString(),
        status: 'open',
        resolvedAt: null,
      };

      await firebase.database().ref('bug-reports').push(report);

      this._showToast('success', 'Report submitted — thank you!');
      this._close();
    } catch {
      this._showToast('error', 'Failed to submit report. Please try again.');
    } finally {
      this.submitting = false;
    }
  }
}

// Auto-initialize
let _instance = null;
export function initFeedbackButton() {
  if (!_instance) _instance = new FeedbackButton();
  return _instance;
}
