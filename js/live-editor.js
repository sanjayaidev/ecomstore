/**
 * Live Editor - Frontend JavaScript for inline editing
 * Handles element selection, inline editing, and saving to database
 */

(function() {
  'use strict';

  // State
  let selectedElement = null;
  let originalContent = null;
  let pendingChanges = {};
  let isEditMode = false;

  // Initialize when DOM is ready
  function init() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', setupEditMode);
    } else {
      setupEditMode();
    }
  }

  // Setup edit mode - called from parent window or directly
  function setupEditMode() {
    isEditMode = true;
    
    // Add editor styles
    let style = document.getElementById('__live_editor_styles');
    if (!style) {
      style = document.createElement('style');
      style.id = '__live_editor_styles';
      document.head.appendChild(style);
    }
    style.textContent = `
      [data-editable]:hover { 
        outline: 2px dashed #3b82f6 !important; 
        outline-offset: 2px; 
        cursor: pointer !important; 
      }
      [data-editable].editing { 
        outline: 2px solid #3b82f6 !important; 
        outline-offset: 2px; 
      }
      [contenteditable="true"] { 
        outline: 2px solid #22c55e !important; 
        outline-offset: 2px; 
        cursor: text !important; 
      }
      .live-editor-toolbar {
        position: fixed;
        top: 10px;
        right: 10px;
        background: #18181b;
        border: 1px solid #2d2d30;
        border-radius: 8px;
        padding: 8px;
        display: flex;
        gap: 6px;
        z-index: 99999;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      }
      .live-editor-toolbar button {
        background: #27272a;
        color: #e4e4e7;
        border: none;
        padding: 6px 12px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 13px;
        font-weight: 500;
        transition: all 0.15s;
      }
      .live-editor-toolbar button:hover {
        background: #3f3f46;
      }
      .live-editor-toolbar button.save-btn {
        background: #3b82f6;
      }
      .live-editor-toolbar button.save-btn:hover {
        background: #2563eb;
      }
      .live-editor-toolbar button.save-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    `;

    // Find all editable elements
    const editableElements = document.querySelectorAll('[data-editable]');
    editableElements.forEach((el, index) => {
      // Ensure data-edit-label exists
      if (!el.dataset.editLabel) {
        el.dataset.editLabel = el.dataset.editable + '-' + (index + 1);
      }
      
      // Add event listeners
      el.addEventListener('click', handleElementClick);
      el.addEventListener('mouseenter', handleElementHover);
      el.addEventListener('mouseleave', handleElementLeave);
    });

    console.log('[LiveEditor] Edit mode initialized,', editableElements.length, 'editable elements found');
  }

  // Handle element click
  function handleElementClick(e) {
    if (this.contentEditable === 'true') return;
    e.preventDefault();
    e.stopPropagation();
    selectElement(this);
  }

  // Handle element hover
  function handleElementHover() {
    if (this !== selectedElement) {
      this.style.outline = '2px dashed rgba(59, 130, 246, 0.5)';
      this.style.outlineOffset = '2px';
    }
  }

  // Handle element leave
  function handleElementLeave() {
    if (this !== selectedElement) {
      this.style.outline = '';
    }
  }

  // Select an element for editing
  function selectElement(el) {
    // Deselect previous
    if (selectedElement) {
      selectedElement.classList.remove('editing');
      selectedElement.style.outline = '';
    }

    selectedElement = el;
    el.classList.add('editing');
    el.style.outline = '2px solid #3b82f6';
    el.style.outlineOffset = '2px';

    // Show edit options
    showEditToolbar(el);
  }

  // Show edit toolbar near selected element
  function showEditToolbar(el) {
    // Remove existing toolbar
    removeEditToolbar();

    const toolbar = document.createElement('div');
    toolbar.className = 'live-editor-toolbar';
    toolbar.id = '__live_editor_toolbar';
    
    toolbar.innerHTML = `
      <button onclick="window.LiveEditor.makeEditable()">✏️ Edit Text</button>
      <button onclick="window.LiveEditor.openPanel()">⚙️ Advanced</button>
      <button class="save-btn" onclick="window.LiveEditor.saveChanges()" id="__live_save_btn" disabled>💾 Save</button>
      <button onclick="window.LiveEditor.cancelEdit()">✕ Cancel</button>
    `;

    document.body.appendChild(toolbar);

    // Position toolbar
    const rect = el.getBoundingClientRect();
    const toolbarRect = toolbar.getBoundingClientRect();
    
    let top = rect.top - toolbarRect.height - 10;
    let left = rect.right - toolbarRect.width;

    if (top < 10) top = rect.bottom + 10;
    if (left < 10) left = 10;

    toolbar.style.top = top + 'px';
    toolbar.style.left = left + 'px';
  }

  // Remove edit toolbar
  function removeEditToolbar() {
    const toolbar = document.getElementById('__live_editor_toolbar');
    if (toolbar) toolbar.remove();
  }

  // Make element editable (inline editing)
  function makeEditable() {
    if (!selectedElement) return;

    const type = selectedElement.dataset.editable;
    
    // For bg, slide, image types, open panel instead
    if (type === 'bg' || type === 'slide' || type === 'image') {
      openPanel();
      return;
    }

    // Store original content
    originalContent = selectedElement.textContent;

    // Enable contenteditable
    selectedElement.contentEditable = 'true';
    selectedElement.focus();

    // Select all text
    const range = document.createRange();
    range.selectNodeContents(selectedElement);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);

    // Add blur handler to save on click away
    selectedElement.addEventListener('blur', function onBlur() {
      selectedElement.removeEventListener('blur', onBlur);
      selectedElement.contentEditable = 'false';
      
      const newText = selectedElement.textContent;
      if (newText !== originalContent) {
        queueChange(selectedElement, 'text', newText);
        updateSaveButton();
      }
    }, { once: true });

    showToast('Type to edit, click away to save');
  }

  // Open advanced edit panel
  function openPanel() {
    if (!selectedElement) return;

    const type = selectedElement.dataset.editable;
    const label = selectedElement.dataset.editLabel || 'Element';

    // Remove existing panel
    closePanel();

    const panel = document.createElement('div');
    panel.id = '__live_editor_panel';
    panel.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: #1c1c1f;
      border: 1px solid #2d2d30;
      border-radius: 8px;
      padding: 20px;
      min-width: 320px;
      max-width: 90vw;
      z-index: 99999;
      box-shadow: 0 8px 32px rgba(0,0,0,0.4);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    `;

    let html = `<h3 style="margin: 0 0 16px 0; color: #e4e4e7; font-size: 16px;">Edit: ${label}</h3>`;

    if (type === 'text') {
      const txt = selectedElement.textContent.trim();
      html += `
        <div style="margin-bottom: 16px;">
          <label style="display: block; color: #a1a1aa; font-size: 12px; margin-bottom: 6px; text-transform: uppercase;">Text Content</label>
          <textarea id="__le_text" rows="4" style="width: 100%; background: #27272a; border: 1px solid #3f3f46; border-radius: 6px; color: #e4e4e7; padding: 10px; font-size: 14px;">${escapeHtml(txt)}</textarea>
        </div>
        <div style="margin-bottom: 16px;">
          <label style="display: block; color: #a1a1aa; font-size: 12px; margin-bottom: 6px; text-transform: uppercase;">Text Color</label>
          <input type="color" id="__le_color" value="${rgbToHex(getComputedStyle(selectedElement).color)}" style="width: 50px; height: 36px; border: 1px solid #3f3f46; border-radius: 4px; cursor: pointer;">
        </div>
      `;
    }

    if (type === 'bg') {
      const bgColor = getComputedStyle(selectedElement).backgroundColor;
      html += `
        <div style="margin-bottom: 16px;">
          <label style="display: block; color: #a1a1aa; font-size: 12px; margin-bottom: 6px; text-transform: uppercase;">Background Color</label>
          <input type="color" id="__le_bg" value="${rgbToHex(bgColor)}" style="width: 50px; height: 36px; border: 1px solid #3f3f46; border-radius: 4px; cursor: pointer;">
        </div>
      `;
    }

    if (type === 'image') {
      const src = selectedElement.src || '';
      html += `
        <div style="margin-bottom: 16px;">
          <label style="display: block; color: #a1a1aa; font-size: 12px; margin-bottom: 6px; text-transform: uppercase;">Image URL</label>
          <input type="url" id="__le_img" value="${escapeHtml(src)}" placeholder="https://..." style="width: 100%; background: #27272a; border: 1px solid #3f3f46; border-radius: 6px; color: #e4e4e7; padding: 10px; font-size: 14px;">
          ${src ? `<img src="${escapeHtml(src)}" style="width: 100%; height: 100px; object-fit: cover; border-radius: 6px; margin-top: 8px;">` : ''}
        </div>
      `;
    }

    if (type === 'slide') {
      const titleEl = selectedElement.querySelector('.slide-title');
      const subEl = selectedElement.querySelector('.slide-subtitle');
      const btnEl = selectedElement.querySelector('.btn-slide');
      html += `
        <div style="margin-bottom: 16px;">
          <label style="display: block; color: #a1a1aa; font-size: 12px; margin-bottom: 6px; text-transform: uppercase;">Title</label>
          <input type="text" id="__le_stitle" value="${escapeHtml(titleEl ? titleEl.textContent.trim() : '')}" style="width: 100%; background: #27272a; border: 1px solid #3f3f46; border-radius: 6px; color: #e4e4e7; padding: 10px; font-size: 14px;">
        </div>
        <div style="margin-bottom: 16px;">
          <label style="display: block; color: #a1a1aa; font-size: 12px; margin-bottom: 6px; text-transform: uppercase;">Subtitle</label>
          <input type="text" id="__le_ssub" value="${escapeHtml(subEl ? subEl.textContent.trim() : '')}" style="width: 100%; background: #27272a; border: 1px solid #3f3f46; border-radius: 6px; color: #e4e4e7; padding: 10px; font-size: 14px;">
        </div>
        <div style="margin-bottom: 16px;">
          <label style="display: block; color: #a1a1aa; font-size: 12px; margin-bottom: 6px; text-transform: uppercase;">Button Text</label>
          <input type="text" id="__le_sbtn" value="${escapeHtml(btnEl ? btnEl.textContent.trim() : '')}" style="width: 100%; background: #27272a; border: 1px solid #3f3f46; border-radius: 6px; color: #e4e4e7; padding: 10px; font-size: 14px;">
        </div>
        <div style="margin-bottom: 16px;">
          <label style="display: block; color: #a1a1aa; font-size: 12px; margin-bottom: 6px; text-transform: uppercase;">Button Link</label>
          <input type="url" id="__le_sbtnlink" value="${escapeHtml(btnEl ? btnEl.href : '')}" style="width: 100%; background: #27272a; border: 1px solid #3f3f46; border-radius: 6px; color: #e4e4e7; padding: 10px; font-size: 14px;">
        </div>
      `;
    }

    html += `
      <div style="display: flex; gap: 8px; margin-top: 20px; padding-top: 16px; border-top: 1px solid #2d2d30;">
        <button onclick="window.LiveEditor.closePanel()" style="flex: 1; background: #27272a; color: #e4e4e7; border: none; padding: 10px; border-radius: 6px; cursor: pointer; font-size: 14px;">Cancel</button>
        <button onclick="window.LiveEditor.applyPanelEdits()" style="flex: 1; background: #3b82f6; color: white; border: none; padding: 10px; border-radius: 6px; cursor: pointer; font-size: 14px;">Apply</button>
      </div>
    `;

    panel.innerHTML = html;
    document.body.appendChild(panel);

    // Close panel on outside click
    setTimeout(() => {
      document.addEventListener('click', function closeOnOutside(e) {
        if (!panel.contains(e.target) && !selectedElement.contains(e.target)) {
          closePanel();
          document.removeEventListener('click', closeOnOutside);
        }
      });
    }, 100);
  }

  // Close edit panel
  function closePanel() {
    const panel = document.getElementById('__live_editor_panel');
    if (panel) panel.remove();
  }

  // Apply edits from panel
  function applyPanelEdits() {
    if (!selectedElement) return;

    const type = selectedElement.dataset.editable;

    if (type === 'text') {
      const textEl = document.getElementById('__le_text');
      const colorEl = document.getElementById('__le_color');
      if (textEl) selectedElement.textContent = textEl.value;
      if (colorEl) selectedElement.style.color = colorEl.value;
      if (textEl) queueChange(selectedElement, 'text', textEl.value);
      if (colorEl) queueChange(selectedElement, 'color', colorEl.value);
    }

    if (type === 'bg') {
      const bgEl = document.getElementById('__le_bg');
      if (bgEl) {
        selectedElement.style.background = bgEl.value;
        queueChange(selectedElement, 'background', bgEl.value);
      }
    }

    if (type === 'image') {
      const imgEl = document.getElementById('__le_img');
      if (imgEl) {
        selectedElement.src = imgEl.value;
        queueChange(selectedElement, 'src', imgEl.value);
      }
    }

    if (type === 'slide') {
      const titleEl = document.getElementById('__le_stitle');
      const subEl = document.getElementById('__le_ssub');
      const btnEl = document.getElementById('__le_sbtn');
      const btnLinkEl = document.getElementById('__le_sbtnlink');
      
      const slideTitle = selectedElement.querySelector('.slide-title');
      const slideSub = selectedElement.querySelector('.slide-subtitle');
      const slideBtn = selectedElement.querySelector('.btn-slide');

      if (titleEl && slideTitle) {
        slideTitle.textContent = titleEl.value;
        queueChange(selectedElement, 'slideTitle', titleEl.value);
      }
      if (subEl && slideSub) {
        slideSub.textContent = subEl.value;
        queueChange(selectedElement, 'slideSub', subEl.value);
      }
      if (btnEl && slideBtn) {
        slideBtn.textContent = btnEl.value;
        queueChange(selectedElement, 'slideBtn', btnEl.value);
      }
      if (btnLinkEl && slideBtn) {
        slideBtn.href = btnLinkEl.value;
        queueChange(selectedElement, 'slideBtnLink', btnLinkEl.value);
      }
    }

    closePanel();
    updateSaveButton();
    showToast('Changes applied - click Save to persist');
  }

  // Queue a change for saving
  function queueChange(el, type, value) {
    const elementKey = generateElementKey(el);
    const selector = generateSelector(el);
    
    if (!pendingChanges[elementKey]) {
      pendingChanges[elementKey] = {
        selector: selector,
        changes: {}
      };
    }
    
    pendingChanges[elementKey].changes[type] = value;
  }

  // Generate unique key for element
  function generateElementKey(el) {
    return el.dataset.editLabel?.replace(/\s+/g, '_') || 
           el.id || 
           'el_' + Math.random().toString(36).slice(2, 8);
  }

  // Generate CSS selector for element
  function generateSelector(el) {
    if (el.id) return '#' + el.id;
    
    const parts = [];
    let cur = el;
    
    while (cur && cur.nodeType === 1 && cur !== document.body) {
      let sel = cur.tagName.toLowerCase();
      
      if (cur.className && typeof cur.className === 'string') {
        const classes = cur.className.trim().split(/\s+/).filter(c => c && !['editing', 'active'].includes(c));
        if (classes.length > 0) {
          sel += '.' + classes[0];
        }
      }
      
      if (cur.hasAttribute('data-editable')) {
        sel += '[data-editable]';
      }
      
      const siblings = cur.parentNode?.children;
      if (siblings) {
        const sameTag = Array.from(siblings).filter(s => s.tagName === cur.tagName);
        if (sameTag.length > 1) {
          const idx = Array.from(siblings).indexOf(cur) + 1;
          sel += `:nth-child(${idx})`;
        }
      }
      
      parts.unshift(sel);
      cur = cur.parentNode;
      
      // Limit depth
      if (parts.length > 5) break;
    }
    
    return parts.join(' > ');
  }

  // Update save button state
  function updateSaveButton() {
    const saveBtn = document.getElementById('__live_save_btn');
    if (saveBtn) {
      saveBtn.disabled = Object.keys(pendingChanges).length === 0;
    }
  }

  // Save changes to database
  async function saveChanges() {
    if (Object.keys(pendingChanges).length === 0) {
      showToast('No changes to save');
      return;
    }

    const saveBtn = document.getElementById('__live_save_btn');
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.textContent = 'Saving...';
    }

    try {
      const page = window.location.pathname || '/';
      
      const response = await fetch('/api/cms/live-edits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          page: page,
          changes: pendingChanges
        })
      });

      if (response.ok) {
        const result = await response.json();
        pendingChanges = {};
        updateSaveButton();
        showToast(`Saved ${result.saved || 0} changes!`, 'success');
        
        // Clear selection
        cancelEdit();
      } else {
        const error = await response.json().catch(() => ({}));
        showToast('Save failed: ' + (error.error || 'Unknown error'), 'error');
      }
    } catch (err) {
      console.error('[LiveEditor] Save error:', err);
      showToast('Network error - check connection', 'error');
    } finally {
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.textContent = '💾 Save';
      }
    }
  }

  // Cancel current edit
  function cancelEdit() {
    if (selectedElement) {
      selectedElement.classList.remove('editing');
      selectedElement.style.outline = '';
      selectedElement.contentEditable = 'false';
      selectedElement = null;
    }
    originalContent = null;
    removeEditToolbar();
    closePanel();
  }

  // Show toast notification
  function showToast(message, type = '') {
    const existing = document.getElementById('__live_toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = '__live_toast';
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: #18181b;
      color: #e4e4e7;
      padding: 10px 20px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      border: 1px solid ${type === 'error' ? '#ef4444' : type === 'success' ? '#22c55e' : '#2d2d30'};
      z-index: 99999;
      animation: __toast_slide_up 0.25s ease;
    `;

    // Add animation styles if not present
    if (!document.getElementById('__toast_animations')) {
      const animStyle = document.createElement('style');
      animStyle.id = '__toast_animations';
      animStyle.textContent = `
        @keyframes __toast_slide_up {
          from { opacity: 0; transform: translateX(-50%) translateY(20px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `;
      document.head.appendChild(animStyle);
    }

    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.25s ease';
      setTimeout(() => toast.remove(), 250);
    }, 2500);
  }

  // Helper: Escape HTML
  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // Helper: RGB to Hex
  function rgbToHex(rgb) {
    if (!rgb || rgb === 'transparent') return '#ffffff';
    if (rgb.startsWith('#')) return rgb;
    
    const match = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (!match) return '#ffffff';
    
    return '#' + [match[1], match[2], match[3]]
      .map(x => parseInt(x).toString(16).padStart(2, '0'))
      .join('');
  }

  // Expose API
  window.LiveEditor = {
    init: setupEditMode,
    makeEditable: makeEditable,
    openPanel: openPanel,
    closePanel: closePanel,
    applyPanelEdits: applyPanelEdits,
    saveChanges: saveChanges,
    cancelEdit: cancelEdit,
    getPendingChanges: () => pendingChanges
  };

  // Auto-initialize
  init();
})();
