const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'frontend', 'sidebar-navigation.css');
let raw = fs.readFileSync(filePath, 'utf8');
const isCRLF = raw.includes('\r\n');
let content = raw.replace(/\r\n/g, '\n');

// 1. Base active
const t1 = `.flyout-item-link.active {
  background: linear-gradient(105deg, #134931, #1d6844) !important;
  border-color: rgba(143, 224, 170, 0.4) !important;
  color: #ffffff !important;
}`;

const r1 = `.flyout-item-link.active {
  background: linear-gradient(105deg, #134931, #1d6844) !important;
  border-color: rgba(143, 224, 170, 0.4) !important;
  color: #ffffff !important;
}

.flyout-item-link.active .flyout-item-title {
  color: #ffffff !important;
}

.flyout-item-link.active .flyout-item-desc,
.flyout-item-link.active:hover .flyout-item-desc {
  color: #ecfdf5 !important;
  opacity: 0.95;
  font-weight: 500;
}`;

// 2. Gold active
const t2 = `body:not([data-theme="healthy"]) .flyout-item-link.active,
body[data-theme="gold"] .flyout-item-link.active {
  background: linear-gradient(105deg, #b78022, #e0b750) !important;
  border-color: #f2d181 !important;
  color: #0a0a09 !important;
  font-weight: 750 !important;
}`;

const r2 = `body:not([data-theme="healthy"]) .flyout-item-link.active,
body[data-theme="gold"] .flyout-item-link.active {
  background: linear-gradient(105deg, #b78022, #e0b750) !important;
  border-color: #f2d181 !important;
  color: #0a0a09 !important;
  font-weight: 750 !important;
}

body:not([data-theme="healthy"]) .flyout-item-link.active .flyout-item-title,
body[data-theme="gold"] .flyout-item-link.active .flyout-item-title {
  color: #120e08 !important;
}

body:not([data-theme="healthy"]) .flyout-item-link.active .flyout-item-desc,
body[data-theme="gold"] .flyout-item-link.active .flyout-item-desc,
body:not([data-theme="healthy"]) .flyout-item-link.active:hover .flyout-item-desc,
body[data-theme="gold"] .flyout-item-link.active:hover .flyout-item-desc {
  color: #241805 !important;
  font-weight: 550 !important;
  opacity: 1 !important;
}

body:not([data-theme="healthy"]) .flyout-item-link.active .flyout-item-icon,
body[data-theme="gold"] .flyout-item-link.active .flyout-item-icon {
  background: rgba(0, 0, 0, 0.16) !important;
  color: #120e08 !important;
}`;

// 3. Healthy active
const t3 = `body[data-theme="healthy"] .flyout-item-link.active {
  background: linear-gradient(105deg, #10b981, #059669) !important;
  border-color: rgba(110, 231, 183, 0.4) !important;
  color: #ffffff !important;
}`;

const r3 = `body[data-theme="healthy"] .flyout-item-link.active {
  background: linear-gradient(105deg, #10b981, #059669) !important;
  border-color: rgba(110, 231, 183, 0.4) !important;
  color: #ffffff !important;
}

body[data-theme="healthy"] .flyout-item-link.active .flyout-item-title {
  color: #ffffff !important;
}

body[data-theme="healthy"] .flyout-item-link.active .flyout-item-desc,
body[data-theme="healthy"] .flyout-item-link.active:hover .flyout-item-desc {
  color: #ecfdf5 !important;
  opacity: 0.95;
  font-weight: 500;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

body[data-theme="healthy"] .flyout-item-link.active .flyout-item-icon {
  background: rgba(255, 255, 255, 0.22) !important;
  color: #ffffff !important;
}`;

if (!content.includes(t1)) throw new Error('t1 not found');
content = content.replace(t1, r1);

if (!content.includes(t2)) throw new Error('t2 not found');
content = content.replace(t2, r2);

if (!content.includes(t3)) throw new Error('t3 not found');
content = content.replace(t3, r3);

if (isCRLF) {
  content = content.replace(/\n/g, '\r\n');
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully patched sidebar-navigation.css');
