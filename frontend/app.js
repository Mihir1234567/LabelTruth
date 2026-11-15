/**
 * LabelTruth Frontend Client Logic
 * Designed with Traffic Light nutrition standards and folder-tab UI components.
 */

// Global State
let currentTab = 'inspector';
let currentModelMode = 'default';
let sampleProducts = [];
let batchItems = [];
let chartsInitialized = false;

// Theme color tokens based on NOVA & Traffic Light systems
const THEME = {
  1: {
    name: 'NOVA 1: Minimally Processed',
    short: 'NOVA 1',
    color: '#10b981',
    pillClass: 'traffic-pill-low',
    bgLight: 'bg-emerald-50',
    borderLight: 'border-emerald-200',
    textMain: 'text-emerald-700',
    categoryTab: 'bg-emerald-700 text-white'
  },
  2: {
    name: 'NOVA 2: Culinary Ingredients',
    short: 'NOVA 2',
    color: '#3b82f6',
    pillClass: 'bg-blue-600 text-white',
    bgLight: 'bg-blue-50',
    borderLight: 'border-blue-200',
    textMain: 'text-blue-700',
    categoryTab: 'bg-blue-600 text-white'
  },
  3: {
    name: 'NOVA 3: Processed Foods',
    short: 'NOVA 3',
    color: '#f59e0b',
    pillClass: 'traffic-pill-medium',
    bgLight: 'bg-amber-50',
    borderLight: 'border-amber-200',
    textMain: 'text-amber-700',
    categoryTab: 'bg-amber-600 text-white'
  },
  4: {
    name: 'NOVA 4: Ultra-Processed (UPF)',
    short: 'NOVA 4',
    color: '#ef4444',
    pillClass: 'traffic-pill-high',
    bgLight: 'bg-rose-50',
    borderLight: 'border-rose-200',
    textMain: 'text-rose-700',
    categoryTab: 'bg-rose-600 text-white'
  }
};

// Preset card category tab colors (Inspired by Image 3)
const CATEGORY_COLORS = {
  'Fruits & Beverages': { tab: 'bg-emerald-600 text-white', icon: 'apple' },
  'Teas': { tab: 'bg-teal-600 text-white', icon: 'coffee' },
  'Culinary Sweeteners': { tab: 'bg-amber-600 text-white', icon: 'droplet' },
  'Culinary Oils': { tab: 'bg-amber-500 text-white', icon: 'flame' },
  'Cheeses': { tab: 'bg-yellow-600 text-white', icon: 'disc' },
  'Charcuterie': { tab: 'bg-orange-600 text-white', icon: 'utensils' },
  'Soft Drinks': { tab: 'bg-rose-600 text-white', icon: 'cup-soda' },
  'Snacks': { tab: 'bg-rose-500 text-white', icon: 'cookie' },
  'Bars': { tab: 'bg-purple-600 text-white', icon: 'zap' },
  'Breakfast Cereals': { tab: 'bg-indigo-600 text-white', icon: 'box' }
};

document.addEventListener('DOMContentLoaded', () => {
  fetchSampleProducts();
  setupCharCounter();
  runAnalysis();
});

// Character Counter
function setupCharCounter() {
  const input = document.getElementById('ingredients-input');
  const counter = document.getElementById('char-count');
  if (input && counter) {
    input.addEventListener('input', () => {
      counter.textContent = `${input.value.length} chars`;
    });
  }
}

// Navigation Tabs
function switchTab(tabId) {
  currentTab = tabId;
  const tabs = ['inspector', 'traffic', 'insights', 'batch'];

  tabs.forEach(t => {
    const el = document.getElementById(`tab-${t}`);
    const navBtn = document.getElementById(`nav-${t}`);
    if (t === tabId) {
      el.classList.remove('hidden');
      navBtn.className = 'px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 bg-white text-brand-800 shadow-sm border border-slate-200/80';
    } else {
      el.classList.add('hidden');
      navBtn.className = 'px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 transition-all flex items-center space-x-2';
    }
  });

  if (tabId === 'insights' && !chartsInitialized) {
    setTimeout(initCharts, 80);
  }

  lucide.createIcons();
}

// Model Paradigm Switcher
function setModelMode(mode) {
  currentModelMode = mode;
  const btnDef = document.getElementById('btn-mode-default');
  const btnBal = document.getElementById('btn-mode-balanced');

  if (mode === 'default') {
    btnDef.className = 'py-1.5 px-2 rounded-lg text-xs font-bold bg-white text-slate-900 shadow-xs border border-slate-200/80 transition-all text-center';
    btnBal.className = 'py-1.5 px-2 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 transition-all text-center';
  } else {
    btnBal.className = 'py-1.5 px-2 rounded-lg text-xs font-bold bg-white text-slate-900 shadow-xs border border-slate-200/80 transition-all text-center';
    btnDef.className = 'py-1.5 px-2 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 transition-all text-center';
  }

  runAnalysis();
}

// Fetch and Render Folder-Tab Presets (Inspired by Reference Image 3)
async function fetchSampleProducts() {
  const container = document.getElementById('presets-container');
  try {
    const res = await fetch('/api/sample-products');
    const data = await res.json();
    sampleProducts = data.samples || [];

    if (container && sampleProducts.length > 0) {
      container.innerHTML = '';
      sampleProducts.slice(0, 10).forEach(sample => {
        const catConfig = CATEGORY_COLORS[sample.category] || { tab: 'bg-slate-700 text-white', icon: 'bookmark' };
        const novaConfig = THEME[sample.expected_nova];

        const card = document.createElement('div');
        card.className = 'folder-card card-clean card-clean-hover p-4 pt-5 cursor-pointer bg-white relative';
        card.onclick = () => loadSample(sample.id);

        card.innerHTML = `
          <div class="folder-tab ${catConfig.tab}">
            ${sample.category.split(' ')[0]}
          </div>
          <div class="space-y-1.5">
            <h4 class="text-xs font-bold text-slate-800 line-clamp-1 leading-snug">
              ${sample.product_name}
            </h4>
            <div class="flex items-center justify-between pt-1">
              <span class="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded ${novaConfig.bgLight} ${novaConfig.textMain} border ${novaConfig.borderLight}">
                NOVA ${sample.expected_nova}
              </span>
              <span class="text-[10px] text-slate-400 font-medium">Click to test</span>
            </div>
          </div>
        `;
        container.appendChild(card);
      });
      lucide.createIcons();
    }
  } catch (err) {
    console.error('Failed to load sample products:', err);
  }
}

function loadSample(sampleId) {
  const s = sampleProducts.find(item => item.id === sampleId);
  if (!s) return;
  document.getElementById('product-name-input').value = s.product_name;
  document.getElementById('ingredients-input').value = s.ingredients_text;
  document.getElementById('char-count').textContent = `${s.ingredients_text.length} chars`;
  runAnalysis();
}

function clearForm() {
  document.getElementById('product-name-input').value = '';
  document.getElementById('ingredients-input').value = '';
  document.getElementById('char-count').textContent = '0 chars';
  document.getElementById('results-card').classList.add('hidden');
  document.getElementById('results-empty').classList.remove('hidden');
}

// Run Analysis
async function runAnalysis() {
  const productName = document.getElementById('product-name-input').value.trim();
  const ingredientsText = document.getElementById('ingredients-input').value.trim();
  const analyzeBtn = document.getElementById('analyze-btn');

  if (!ingredientsText) {
    alert('Please enter an ingredients list to audit.');
    return;
  }

  analyzeBtn.disabled = true;
  analyzeBtn.innerHTML = `
    <span class="animate-spin mr-2"><i data-lucide="loader-2" class="w-4 h-4"></i></span>
    <span>Auditing Ingredients...</span>
  `;
  lucide.createIcons();

  try {
    const res = await fetch('/api/predict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        product_name: productName || 'Commercial Food Product',
        ingredients_text: ingredientsText,
        model_type: currentModelMode
      })
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Prediction failed');
    }

    const data = await res.json();
    renderAnalysisResult(data);

  } catch (err) {
    console.error('Analysis error:', err);
    alert(`Audit Error: ${err.message}`);
  } finally {
    analyzeBtn.disabled = false;
    analyzeBtn.innerHTML = `
      <i data-lucide="search" class="w-4 h-4"></i>
      <span>Audit Label & Detect Health-Washing</span>
    `;
    lucide.createIcons();
  }
}

// Render Results on Clean UI
function renderAnalysisResult(data) {
  document.getElementById('results-empty').classList.add('hidden');
  document.getElementById('results-card').classList.remove('hidden');

  const nova = data.prediction.nova_group;
  const cfg = THEME[nova];
  const audit = data.health_claim_audit;

  // 1. Health-Washing Alert Banner (Inspired by Image 2 Red Highlight)
  const banner = document.getElementById('health-wash-banner');
  if (audit.is_health_washed) {
    banner.classList.remove('hidden');
    banner.className = 'rounded-2xl p-4 border border-rose-300 bg-rose-50 text-rose-900 space-y-1.5 shadow-sm';
    banner.innerHTML = `
      <div class="flex items-center space-x-2 font-black text-rose-800 text-xs uppercase tracking-wider">
        <i data-lucide="alert-triangle" class="w-4 h-4 text-rose-600"></i>
        <span>Health-Washing Warning: Marketing Discrepancy (${audit.severity} Risk)</span>
      </div>
      <p class="text-xs leading-relaxed text-rose-900">
        <strong>The Truth About This Product:</strong> Packaging displays health claims (<strong class="underline">${audit.detected_claims.join(', ')}</strong>), 
        yet its actual formulation is classified as <strong class="underline">NOVA 4 (Ultra-Processed)</strong> with <strong>${data.prediction.confidence}%</strong> statistical confidence.
      </p>
    `;
  } else {
    banner.classList.add('hidden');
  }

  // 2. Traffic Light Badges (Inspired by Image 1)
  const boxNova = document.getElementById('traffic-box-nova');
  boxNova.className = `p-4 rounded-2xl text-center text-white space-y-1 shadow-sm transition-all ${cfg.pillClass}`;
  document.getElementById('traffic-val-nova').textContent = cfg.short;
  document.getElementById('traffic-sub-nova').textContent = nova === 1 ? 'Unprocessed' : (nova === 2 ? 'Culinary' : (nova === 3 ? 'Processed' : 'Ultra-Processed'));

  // Confidence Box
  document.getElementById('traffic-val-conf').textContent = `${data.prediction.confidence}%`;
  
  // Health-Washing Risk Box
  const boxRisk = document.getElementById('traffic-box-risk');
  const valRisk = document.getElementById('traffic-val-risk');
  const subRisk = document.getElementById('traffic-sub-risk');
  if (audit.is_health_washed) {
    boxRisk.className = 'p-4 rounded-2xl text-center text-white space-y-1 shadow-sm transition-all traffic-pill-high';
    valRisk.textContent = audit.severity.toUpperCase();
    subRisk.textContent = 'Deceptive Claim';
  } else if (audit.has_health_claim) {
    boxRisk.className = 'p-4 rounded-2xl text-center text-white space-y-1 shadow-sm transition-all traffic-pill-low';
    valRisk.textContent = 'LOW';
    subRisk.textContent = 'Claim Aligned';
  } else {
    boxRisk.className = 'p-4 rounded-2xl text-center bg-white border border-slate-200 text-slate-800 space-y-1 shadow-sm';
    valRisk.textContent = 'NONE';
    valRisk.className = 'text-2xl font-black text-slate-900 block font-mono';
    subRisk.textContent = 'No Claims';
    subRisk.className = 'text-[11px] text-slate-400 font-medium block';
  }

  // Claims Count Box
  document.getElementById('traffic-val-claims').textContent = audit.detected_claims.length;
  document.getElementById('traffic-sub-claims').textContent = audit.detected_claims.length > 0 ? audit.detected_claims.slice(0, 2).join(', ') : 'None Found';

  // 3. LabelTruth Facts Box (Inspired by Image 2 Nutrition Facts)
  document.getElementById('label-product-name').textContent = data.product_name;
  const labelTier = document.getElementById('label-nova-tier');
  labelTier.textContent = data.prediction.title;
  labelTier.className = `font-extrabold ${cfg.textMain}`;
  document.getElementById('label-nova-desc').textContent = data.prediction.description;
  document.getElementById('label-guidance-text').textContent = data.prediction.dietary_guidance;

  // Highlight Box for Claims in Facts Panel
  const claimsBox = document.getElementById('label-claims-box');
  const claimsText = document.getElementById('label-claims-text');
  const claimsStatus = document.getElementById('label-claims-status');
  if (audit.has_health_claim) {
    claimsBox.classList.remove('hidden');
    claimsText.textContent = audit.explanation;
    if (audit.is_health_washed) {
      claimsBox.className = 'highlight-red-box text-xs space-y-1';
      claimsStatus.textContent = 'Health-Washed';
      claimsStatus.className = 'uppercase text-[10px] px-1.5 py-0.5 bg-rose-200 text-rose-900 rounded font-bold';
    } else {
      claimsBox.className = 'p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs space-y-1';
      claimsStatus.textContent = 'Aligned';
      claimsStatus.className = 'uppercase text-[10px] px-1.5 py-0.5 bg-emerald-200 text-emerald-900 rounded font-bold';
    }
  } else {
    claimsBox.classList.add('hidden');
  }

  // Probability distribution percentages
  const probs = data.probabilities;
  for (let i = 1; i <= 4; i++) {
    const p = document.getElementById(`prob-${i}`);
    if (p) p.textContent = `${probs[`NOVA_${i}`] || 0}%`;
  }

  // 4. Render Explainable AI (XAI) Attribution
  renderXAI(data.explainable_ai, nova);

  lucide.createIcons();
}

// Render Explainable AI
function renderXAI(xai, nova) {
  const container = document.getElementById('xai-pills-container');
  const tbody = document.getElementById('xai-table-body');
  container.innerHTML = '';
  tbody.innerHTML = '';

  const contributors = xai.top_contributors || [];

  if (contributors.length === 0) {
    container.innerHTML = '<span class="text-xs text-slate-400">No strong vocabulary tokens found.</span>';
    tbody.innerHTML = '<tr><td colspan="4" class="py-3 px-4 text-center text-slate-400">No token contributions calculated.</td></tr>';
    return;
  }

  contributors.forEach(item => {
    const isPositive = item.contribution > 0;
    
    // Pill tag
    const pill = document.createElement('span');
    const pillClass = isPositive
      ? (nova === 4 ? 'bg-rose-100 text-rose-800 border-rose-300' : 'bg-emerald-100 text-emerald-800 border-emerald-300')
      : 'bg-slate-100 text-slate-600 border-slate-200';

    pill.className = `text-xs px-2.5 py-1 rounded-lg border font-mono font-medium flex items-center space-x-1.5 ${pillClass}`;
    pill.innerHTML = `
      <span>${item.token}</span>
      <span class="text-[10px] font-bold ${isPositive ? 'opacity-100' : 'opacity-60'}">
        ${isPositive ? '+' : ''}${item.contribution}
      </span>
    `;
    container.appendChild(pill);

    // Table row
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-slate-50 transition-colors';
    tr.innerHTML = `
      <td class="py-2.5 px-3 font-semibold text-slate-800">${item.token}</td>
      <td class="py-2.5 px-3 text-slate-500">${item.weight > 0 ? '+' : ''}${item.weight}</td>
      <td class="py-2.5 px-3 text-slate-500">${item.tfidf}</td>
      <td class="py-2.5 px-3 text-right font-bold ${isPositive ? (nova === 4 ? 'text-rose-600' : 'text-emerald-600') : 'text-slate-500'}">
        ${isPositive ? '+' : ''}${item.contribution}
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// ==========================================
// RESEARCH & CHARTS (TAB 3)
// ==========================================
async function initCharts() {
  if (chartsInitialized) return;

  try {
    const res = await fetch('/api/model-insights');
    const data = await res.json();
    chartsInitialized = true;

    // 1. NOVA Distribution (Doughnut)
    const ctxDist = document.getElementById('chart-nova-dist');
    if (ctxDist) {
      new Chart(ctxDist, {
        type: 'doughnut',
        data: {
          labels: ['NOVA 1 (Minimal)', 'NOVA 2 (Culinary)', 'NOVA 3 (Processed)', 'NOVA 4 (Ultra-Processed)'],
          datasets: [{
            data: [11.91, 0.75, 20.25, 67.09],
            backgroundColor: ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'],
            borderWidth: 2,
            borderColor: '#ffffff'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11, family: 'Plus Jakarta Sans' } } }
          }
        }
      });
    }

    // 2. Health Claims vs NOVA Bar
    const ctxClaims = document.getElementById('chart-claims-nova');
    if (ctxClaims) {
      new Chart(ctxClaims, {
        type: 'bar',
        data: {
          labels: ['NOVA 1', 'NOVA 2', 'NOVA 3', 'NOVA 4 (UPF)'],
          datasets: [{
            label: '% Share of Health-Claim Products',
            data: [19.86, 1.65, 24.81, 53.67],
            backgroundColor: ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'],
            borderRadius: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          indexAxis: 'y',
          plugins: { legend: { display: false } },
          scales: {
            x: { title: { display: true, text: 'Percentage (%)', font: { size: 11 } } }
          }
        }
      });
    }

    // 3. Top Predictors NOVA 1
    const ctx1 = document.getElementById('chart-xai-nova1');
    const top1 = data.top_predictors.nova_1 || [];
    if (ctx1 && top1.length > 0) {
      new Chart(ctx1, {
        type: 'bar',
        data: {
          labels: top1.map(t => t.token),
          datasets: [{
            data: top1.map(t => t.weight),
            backgroundColor: '#10b981',
            borderRadius: 4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          indexAxis: 'y',
          plugins: { legend: { display: false } },
          scales: {
            y: { ticks: { font: { size: 10 } } }
          }
        }
      });
    }

    // 4. Top Predictors NOVA 4
    const ctx4 = document.getElementById('chart-xai-nova4');
    const top4 = data.top_predictors.nova_4 || [];
    if (ctx4 && top4.length > 0) {
      new Chart(ctx4, {
        type: 'bar',
        data: {
          labels: top4.map(t => t.token),
          datasets: [{
            data: top4.map(t => t.weight),
            backgroundColor: '#ef4444',
            borderRadius: 4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          indexAxis: 'y',
          plugins: { legend: { display: false } },
          scales: {
            y: { ticks: { font: { size: 10 } } }
          }
        }
      });
    }

  } catch (err) {
    console.error('Failed to init charts:', err);
  }
}

// ==========================================
// BATCH SCANNER & CSV AUDITOR (TAB 4)
// ==========================================
function handleDragOver(e) {
  e.preventDefault();
  document.getElementById('dropzone').classList.add('border-brand-600', 'bg-brand-50');
}

function handleDragLeave(e) {
  e.preventDefault();
  document.getElementById('dropzone').classList.remove('border-brand-600', 'bg-brand-50');
}

function handleFileDrop(e) {
  e.preventDefault();
  document.getElementById('dropzone').classList.remove('border-brand-600', 'bg-brand-50');
  const files = e.dataTransfer.files;
  if (files.length > 0) uploadCSVFile(files[0]);
}

function handleFileSelect(e) {
  const files = e.target.files;
  if (files.length > 0) uploadCSVFile(files[0]);
}

async function uploadCSVFile(file) {
  if (!file.name.endsWith('.csv')) {
    alert('Please upload a .csv file.');
    return;
  }

  const status = document.getElementById('file-status');
  const nameTag = document.getElementById('file-name-tag');
  status.classList.remove('hidden');
  nameTag.textContent = `Auditing: ${file.name}...`;

  const formData = new FormData();
  formData.append('file', file);
  formData.append('model_type', currentModelMode);

  try {
    const res = await fetch('/api/upload-csv', {
      method: 'POST',
      body: formData
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Upload failed');
    }

    const data = await res.json();
    batchItems = data.items || [];
    renderBatchResults(data.summary, batchItems);
    nameTag.textContent = `Audit Complete for ${file.name} (${batchItems.length} products)`;

  } catch (err) {
    console.error('CSV error:', err);
    alert(`CSV Audit Error: ${err.message}`);
    status.classList.add('hidden');
  }
}

function renderBatchResults(summary, items) {
  document.getElementById('batch-results-container').classList.remove('hidden');

  document.getElementById('batch-stat-total').textContent = summary.total_processed;
  document.getElementById('batch-stat-upf').textContent = `${summary.nova_breakdown.NOVA_4.percentage}%`;
  document.getElementById('batch-stat-claims').textContent = summary.health_claims_detected;
  document.getElementById('batch-stat-rate').textContent = `${summary.health_washing_rate_among_claims}%`;

  const tbody = document.getElementById('batch-table-body');
  tbody.innerHTML = '';

  items.forEach(item => {
    const nova = item.prediction.nova_group;
    const cfg = THEME[nova];
    const audit = item.health_claim_audit;

    const tr = document.createElement('tr');
    tr.className = 'hover:bg-slate-50 transition-colors';
    tr.innerHTML = `
      <td class="py-3 px-4 font-semibold text-slate-800">${item.product_name}</td>
      <td class="py-3 px-4">
        <span class="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${cfg.bgLight} ${cfg.textMain} border ${cfg.borderLight}">
          NOVA ${nova}
        </span>
      </td>
      <td class="py-3 px-4 font-mono text-slate-600">${item.prediction.confidence}%</td>
      <td class="py-3 px-4">
        ${audit.has_health_claim
          ? `<span class="text-amber-700 font-bold">${audit.detected_claims.join(', ')}</span>`
          : '<span class="text-slate-400">None</span>'
        }
      </td>
      <td class="py-3 px-4">
        ${audit.is_health_washed
          ? `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">Health-Washed</span>`
          : (audit.has_health_claim ? '<span class="text-emerald-700 font-semibold text-xs">Claim Aligned</span>' : '<span class="text-slate-400 text-xs">—</span>')
        }
      </td>
    `;
    tbody.appendChild(tr);
  });

  lucide.createIcons();
}

function downloadSampleCSV() {
  const content = "data:text/csv;charset=utf-8," +
    "product_name,ingredients_text\n" +
    "\"Fresh Organic Red Apples\",\"organic fresh red apples\"\n" +
    "\"First Cold-Pressed Extra Virgin Olive Oil\",\"first cold pressed extra virgin olive oil\"\n" +
    "\"Artisan Smoked Salami\",\"pork, sea salt, ground black pepper, wine, garlic, sodium nitrite\"\n" +
    "\"Healthy Choice Zero-Sugar Citrus Energy Blast\",\"carbonated water, citric acid, aspartame, potassium benzoate, yellow 5, artificial flavor\"\n" +
    "\"Gluten-Free High-Protein Energy Bar\",\"isolated soy protein, maltitol syrup, palm kernel oil, polydextrose, soy lecithin, sucralose\"\n" +
    "\"Traditional Aged Cheddar Cheese\",\"cultured pasteurized milk, salt, microbial enzymes\"\n";

  const link = document.createElement("a");
  link.setAttribute("href", encodeURI(content));
  link.setAttribute("download", "sample_products.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
