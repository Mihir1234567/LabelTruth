/**
 * LabelTruth Frontend Client Application Logic
 * Integrates real-time FastAPI endpoints, XAI visualization, and Chart.js dashboards.
 */

// Global State
let currentTab = 'inspector';
let currentModelMode = 'default'; // 'default' or 'balanced'
let sampleProducts = [];
let batchItems = [];
let chartsInitialized = false;

// Color maps for NOVA tiers
const NOVA_COLORS = {
  1: { text: 'text-emerald-400', bg: 'bg-emerald-500/20', border: 'border-emerald-500/40', badge: 'bg-emerald-500', glow: 'glow-nova1', name: 'NOVA 1 (Unprocessed)' },
  2: { text: 'text-blue-400', bg: 'bg-blue-500/20', border: 'border-blue-500/40', badge: 'bg-blue-500', glow: 'glow-nova2', name: 'NOVA 2 (Culinary)' },
  3: { text: 'text-amber-400', bg: 'bg-amber-500/20', border: 'border-amber-500/40', badge: 'bg-amber-500', glow: 'glow-nova3', name: 'NOVA 3 (Processed)' },
  4: { text: 'text-rose-400', bg: 'bg-rose-500/20', border: 'border-rose-500/40', badge: 'bg-rose-500', glow: 'glow-nova4', name: 'NOVA 4 (Ultra-Processed UPF)' }
};

// Initialization on DOM Load
document.addEventListener('DOMContentLoaded', () => {
  fetchSampleProducts();
  setupCharCounter();
  // Auto-run initial prediction with the preset
  runAnalysis();
});

// Character Counter
function setupCharCounter() {
  const ingInput = document.getElementById('ingredients-input');
  const charCount = document.getElementById('char-count');
  if (ingInput && charCount) {
    ingInput.addEventListener('input', () => {
      charCount.textContent = `${ingInput.value.length} characters`;
    });
  }
}

// Tab Switching
function switchTab(tabId) {
  currentTab = tabId;
  const tabs = ['inspector', 'insights', 'batch', 'methodology'];
  
  tabs.forEach(t => {
    const section = document.getElementById(`tab-${t}`);
    const btn = document.getElementById(`tab-${t}-btn`);
    if (t === tabId) {
      section.classList.remove('hidden');
      btn.className = 'px-3 py-1.5 rounded-lg text-sm font-semibold transition-all flex items-center space-x-1.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30';
    } else {
      section.classList.add('hidden');
      btn.className = 'px-3 py-1.5 rounded-lg text-sm font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-all flex items-center space-x-1.5';
    }
  });

  if (tabId === 'insights' && !chartsInitialized) {
    setTimeout(initInsightCharts, 100);
  }

  lucide.createIcons();
}

// Model Mode Switcher
function setModelMode(mode) {
  currentModelMode = mode;
  const defBtn = document.getElementById('mode-default-btn');
  const balBtn = document.getElementById('mode-balanced-btn');

  if (mode === 'default') {
    defBtn.className = 'px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 transition-all';
    balBtn.className = 'px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-white transition-all';
  } else {
    balBtn.className = 'px-3 py-1.5 rounded-lg text-xs font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 transition-all';
    defBtn.className = 'px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-white transition-all';
  }

  // Rerun active analysis under new model
  runAnalysis();
}

// Fetch Sample Benchmark Products
async function fetchSampleProducts() {
  const container = document.getElementById('sample-buttons-container');
  try {
    const res = await fetch('/api/sample-products');
    const data = await res.json();
    sampleProducts = data.samples || [];

    if (container && sampleProducts.length > 0) {
      container.innerHTML = '';
      sampleProducts.forEach((s) => {
        const btn = document.createElement('button');
        const color = NOVA_COLORS[s.expected_nova];
        btn.className = `text-xs px-2.5 py-1 rounded-lg border bg-slate-900 hover:bg-slate-800 text-slate-300 transition-all flex items-center space-x-1.5 border-slate-700 hover:${color.border}`;
        btn.innerHTML = `
          <span class="w-2 h-2 rounded-full ${color.badge}"></span>
          <span class="font-medium">${s.product_name.split(' ')[0]} ${s.product_name.split(' ')[1] || ''}</span>
          <span class="text-[10px] font-mono text-slate-400">N${s.expected_nova}</span>
        `;
        btn.onclick = () => loadSample(s.id);
        container.appendChild(btn);
      });
    }
  } catch (err) {
    console.error('Failed to load sample products:', err);
    if (container) {
      container.innerHTML = '<span class="text-xs text-rose-400">Failed to fetch samples from server.</span>';
    }
  }
}

// Load a specific sample into the form
function loadSample(sampleId) {
  const sample = sampleProducts.find(s => s.id === sampleId);
  if (!sample) return;

  document.getElementById('product-name-input').value = sample.product_name;
  document.getElementById('ingredients-input').value = sample.ingredients_text;
  document.getElementById('char-count').textContent = `${sample.ingredients_text.length} characters`;

  runAnalysis();
}

// Clear Form
function clearForm() {
  document.getElementById('product-name-input').value = '';
  document.getElementById('ingredients-input').value = '';
  document.getElementById('char-count').textContent = '0 characters';
  document.getElementById('results-card').classList.add('hidden');
  document.getElementById('results-empty').classList.remove('hidden');
}

// Run Food Processing & Claims Analysis
async function runAnalysis() {
  const productName = document.getElementById('product-name-input').value.trim();
  const ingredientsText = document.getElementById('ingredients-input').value.trim();
  const analyzeBtn = document.getElementById('analyze-btn');

  if (!ingredientsText) {
    alert('Please enter an ingredients list to analyze.');
    return;
  }

  // Loading state
  analyzeBtn.disabled = true;
  analyzeBtn.innerHTML = `
    <span class="animate-spin mr-2"><i data-lucide="loader-2" class="w-4 h-4"></i></span>
    <span>Analyzing Sparse N-Grams...</span>
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
      const errData = await res.json();
      throw new Error(errData.detail || 'Inference failed');
    }

    const data = await res.json();
    renderPredictionResults(data);

  } catch (err) {
    console.error('Prediction error:', err);
    alert(`Analysis error: ${err.message}`);
  } finally {
    analyzeBtn.disabled = false;
    analyzeBtn.innerHTML = `
      <i data-lucide="zap" class="w-4 h-4"></i>
      <span>Analyze Food Processing & Claims</span>
    `;
    lucide.createIcons();
  }
}

// Render Results on UI
function renderPredictionResults(data) {
  document.getElementById('results-empty').classList.add('hidden');
  document.getElementById('results-card').classList.remove('hidden');

  const nova = data.prediction.nova_group;
  const color = NOVA_COLORS[nova];
  const heroCard = document.getElementById('nova-hero-card');
  const badgeCircle = document.getElementById('res-badge-circle');
  const badgePill = document.getElementById('res-badge-pill');
  const modelTag = document.getElementById('res-model-tag');

  // Reset glow classes
  heroCard.className = `glass-card p-6 rounded-2xl border transition-all ${color.border} ${color.glow}`;
  badgeCircle.className = `w-20 h-20 rounded-2xl flex flex-col items-center justify-center shrink-0 border ${color.border} ${color.bg} ${color.text}`;
  badgePill.className = `text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${color.bg} ${color.text} border ${color.border}`;

  document.getElementById('res-nova-num').textContent = nova;
  document.getElementById('res-nova-title').textContent = data.prediction.title;
  document.getElementById('res-nova-desc').textContent = data.prediction.description;
  document.getElementById('res-guidance-text').textContent = data.prediction.dietary_guidance;
  document.getElementById('res-confidence-tag').textContent = `${data.prediction.confidence}% Confidence`;
  modelTag.textContent = data.model_used;

  // Claims text
  const audit = data.health_claim_audit;
  const claimsText = document.getElementById('res-claims-text');
  if (audit.has_health_claim) {
    claimsText.innerHTML = `<span class="text-amber-300 font-semibold">${audit.detected_claims.join(', ')}</span> — ${audit.explanation}`;
  } else {
    claimsText.textContent = 'No front-of-package marketing claims detected.';
  }

  // Health-Washing Alert Box
  const alertBox = document.getElementById('health-wash-alert');
  if (audit.is_health_washed) {
    alertBox.classList.remove('hidden');
    alertBox.className = 'p-5 rounded-2xl border bg-gradient-to-r from-rose-950/80 via-slate-900 to-rose-950/80 border-rose-500/50 glow-alert space-y-2';
    alertBox.innerHTML = `
      <div class="flex items-center space-x-2 text-rose-400 font-extrabold text-sm tracking-wide uppercase">
        <i data-lucide="shield-alert" class="w-5 h-5 text-rose-500 animate-pulse"></i>
        <span>Health-Washing Discrepancy Detected (${audit.severity} Severity)</span>
      </div>
      <p class="text-xs text-rose-200/90 leading-relaxed">
        <strong>Marketing vs. Reality Mismatch:</strong> This product prominently advertises health claims (<em>${audit.detected_claims.join(', ')}</em>), 
        yet its ingredient formulation is classified as <strong>NOVA 4 (Ultra-Processed)</strong> with <strong>${data.prediction.confidence}%</strong> statistical confidence.
      </p>
      <div class="text-[11px] text-slate-400 font-mono pt-1 border-t border-rose-800/40">
        Empirical finding: 53.67% of products bearing health claims in Open Food Facts are ultra-processed.
      </div>
    `;
  } else {
    alertBox.classList.add('hidden');
  }

  // Probabilities distribution bars
  const probs = data.probabilities;
  for (let i = 1; i <= 4; i++) {
    const val = probs[`NOVA_${i}`] || 0;
    const bar = document.getElementById(`prob-bar-${i}`);
    const label = document.getElementById(`prob-val-${i}`);
    if (bar && label) {
      bar.style.width = `${val}%`;
      label.textContent = `${val}%`;
    }
  }

  // Render Explainable AI (XAI) Tokens & Table
  renderXAI(data.explainable_ai, nova);

  lucide.createIcons();
}

// Render Explainable AI Attribution
function renderXAI(xai, predNova) {
  const container = document.getElementById('xai-tokens-container');
  const tbody = document.getElementById('xai-table-body');
  container.innerHTML = '';
  tbody.innerHTML = '';

  const contributors = xai.top_contributors || [];

  if (contributors.length === 0) {
    container.innerHTML = '<span class="text-xs text-slate-500">No strong token attributions found in vocabulary.</span>';
    tbody.innerHTML = '<tr><td colspan="4" class="py-3 px-4 text-center text-slate-500">No token weights available.</td></tr>';
    return;
  }

  contributors.forEach((item) => {
    // Pill tag
    const pill = document.createElement('div');
    const isPositive = item.contribution > 0;
    const badgeBg = isPositive 
      ? (predNova === 4 ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40')
      : 'bg-slate-800 text-slate-400 border-slate-700';

    pill.className = `text-xs px-2.5 py-1 rounded-lg border font-mono flex items-center space-x-1.5 ${badgeBg}`;
    pill.innerHTML = `
      <span>${item.token}</span>
      <span class="text-[10px] font-bold ${isPositive ? 'opacity-100' : 'opacity-60'}">
        ${isPositive ? '+' : ''}${item.contribution}
      </span>
    `;
    container.appendChild(pill);

    // Table row
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-slate-800/40';
    tr.innerHTML = `
      <td class="py-2 px-3 font-semibold text-slate-200">${item.token}</td>
      <td class="py-2 px-3 text-slate-400">${item.weight > 0 ? '+' : ''}${item.weight}</td>
      <td class="py-2 px-3 text-slate-400">${item.tfidf}</td>
      <td class="py-2 px-3 text-right font-bold ${isPositive ? (predNova === 4 ? 'text-rose-400' : 'text-emerald-400') : 'text-slate-400'}">
        ${isPositive ? '+' : ''}${item.contribution}
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// ==========================================
// RESEARCH & BENCHMARKS CHARTS (TAB 2)
// ==========================================
async function initInsightCharts() {
  if (chartsInitialized) return;

  try {
    const res = await fetch('/api/model-insights');
    const data = await res.json();
    chartsInitialized = true;

    // 1. NOVA Distribution Chart (Doughnut)
    const ctxDist = document.getElementById('nova-dist-chart');
    if (ctxDist) {
      new Chart(ctxDist, {
        type: 'doughnut',
        data: {
          labels: ['NOVA 1 (Minimally Processed)', 'NOVA 2 (Culinary Ingredients)', 'NOVA 3 (Processed)', 'NOVA 4 (Ultra-Processed UPFs)'],
          datasets: [{
            data: [11.91, 0.75, 20.25, 67.09],
            backgroundColor: ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'],
            borderColor: '#0f172a',
            borderWidth: 2
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom', labels: { color: '#94a3b8', boxWidth: 12, font: { size: 11 } } },
            tooltip: { callbacks: { label: (ctx) => ` ${ctx.label}: ${ctx.raw}%` } }
          }
        }
      });
    }

    // 2. Health Claims vs NOVA Bar Chart
    const ctxClaims = document.getElementById('claims-nova-chart');
    if (ctxClaims) {
      new Chart(ctxClaims, {
        type: 'bar',
        data: {
          labels: ['NOVA 1 (Unprocessed)', 'NOVA 2 (Culinary)', 'NOVA 3 (Processed)', 'NOVA 4 (Ultra-Processed)'],
          datasets: [{
            label: '% Share of All Health Claims (N=3,756)',
            data: [19.86, 1.65, 24.81, 53.67],
            backgroundColor: ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'],
            borderRadius: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          indexAxis: 'y',
          plugins: {
            legend: { display: false },
            tooltip: { callbacks: { label: (ctx) => ` Health-claimed share: ${ctx.raw}%` } }
          },
          scales: {
            x: { grid: { color: '#1e293b' }, ticks: { color: '#94a3b8' }, title: { display: true, text: 'Percentage (%) of Health-Claim Products', color: '#64748b' } },
            y: { grid: { display: false }, ticks: { color: '#cbd5e1' } }
          }
        }
      });
    }

    // 3. Top Predictors for NOVA 1 (Whole Foods)
    const ctxNova1 = document.getElementById('xai-nova1-chart');
    const top1 = data.top_predictors.nova_1 || [];
    if (ctxNova1 && top1.length > 0) {
      new Chart(ctxNova1, {
        type: 'bar',
        data: {
          labels: top1.map(t => t.token),
          datasets: [{
            label: 'Logistic Regression Weight (+)',
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
            x: { grid: { color: '#1e293b' }, ticks: { color: '#94a3b8' } },
            y: { grid: { display: false }, ticks: { color: '#cbd5e1', font: { size: 10 } } }
          }
        }
      });
    }

    // 4. Top Predictors for NOVA 4 (UPFs)
    const ctxNova4 = document.getElementById('xai-nova4-chart');
    const top4 = data.top_predictors.nova_4 || [];
    if (ctxNova4 && top4.length > 0) {
      new Chart(ctxNova4, {
        type: 'bar',
        data: {
          labels: top4.map(t => t.token),
          datasets: [{
            label: 'Logistic Regression Weight (+)',
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
            x: { grid: { color: '#1e293b' }, ticks: { color: '#94a3b8' } },
            y: { grid: { display: false }, ticks: { color: '#cbd5e1', font: { size: 10 } } }
          }
        }
      });
    }

  } catch (err) {
    console.error('Failed to initialize insight charts:', err);
  }
}

// ==========================================
// BATCH SCANNER & CSV AUDITOR (TAB 3)
// ==========================================
function handleDragOver(e) {
  e.preventDefault();
  document.getElementById('dropzone').classList.add('border-emerald-500', 'bg-emerald-950/20');
}

function handleDragLeave(e) {
  e.preventDefault();
  document.getElementById('dropzone').classList.remove('border-emerald-500', 'bg-emerald-950/20');
}

function handleFileDrop(e) {
  e.preventDefault();
  document.getElementById('dropzone').classList.remove('border-emerald-500', 'bg-emerald-950/20');
  const files = e.dataTransfer.files;
  if (files.length > 0) {
    uploadCSVFile(files[0]);
  }
}

function handleFileSelect(e) {
  const files = e.target.files;
  if (files.length > 0) {
    uploadCSVFile(files[0]);
  }
}

async function uploadCSVFile(file) {
  if (!file.name.endsWith('.csv')) {
    alert('Please upload a valid .csv file.');
    return;
  }

  const status = document.getElementById('file-status');
  const nameTag = document.getElementById('file-name-tag');
  status.classList.remove('hidden');
  nameTag.textContent = `Uploading and classifying: ${file.name}...`;

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
      throw new Error(err.detail || 'CSV upload failed');
    }

    const data = await res.json();
    batchItems = data.items || [];
    renderBatchResults(data.summary, batchItems);
    nameTag.textContent = `Audit Complete for ${file.name} (${batchItems.length} products)`;

  } catch (err) {
    console.error('CSV audit error:', err);
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

  filterBatchResults();
}

function filterBatchResults() {
  const search = document.getElementById('batch-search-input').value.toLowerCase();
  const filterNova = document.getElementById('batch-filter-nova').value;
  const tbody = document.getElementById('batch-table-body');
  tbody.innerHTML = '';

  const filtered = batchItems.filter(item => {
    const nameMatch = item.product_name.toLowerCase().includes(search) || item.ingredients_text.toLowerCase().includes(search);
    const novaMatch = filterNova === 'all' || item.prediction.nova_group.toString() === filterNova;
    return nameMatch && novaMatch;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="py-4 text-center text-slate-500">No matching products found.</td></tr>';
    return;
  }

  filtered.forEach(item => {
    const nova = item.prediction.nova_group;
    const color = NOVA_COLORS[nova];
    const audit = item.health_claim_audit;

    const tr = document.createElement('tr');
    tr.className = 'hover:bg-slate-800/40 border-b border-slate-800/50';
    tr.innerHTML = `
      <td class="py-3 px-4">
        <span class="font-semibold text-white block">${item.product_name}</span>
        <span class="text-[11px] text-slate-500 font-mono block truncate max-w-xs">${item.ingredients_text}</span>
      </td>
      <td class="py-3 px-4">
        <span class="px-2 py-0.5 rounded text-[11px] font-bold uppercase ${color.bg} ${color.text} border ${color.border}">
          NOVA ${nova}
        </span>
      </td>
      <td class="py-3 px-4 font-mono text-slate-300">${item.prediction.confidence}%</td>
      <td class="py-3 px-4">
        ${audit.has_health_claim 
          ? `<span class="text-amber-400 font-semibold">${audit.detected_claims.join(', ')}</span>`
          : '<span class="text-slate-500">None</span>'
        }
      </td>
      <td class="py-3 px-4">
        ${audit.is_health_washed 
          ? `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1 w-fit">
              <i data-lucide="alert-triangle" class="w-3 h-3 text-rose-400"></i> Health-Washing
            </span>`
          : (audit.has_health_claim ? '<span class="text-emerald-400 text-xs">Claim Aligned</span>' : '<span class="text-slate-500 text-xs">—</span>')
        }
      </td>
    `;
    tbody.appendChild(tr);
  });

  lucide.createIcons();
}

// Download Sample CSV
function downloadSampleCSV() {
  const csvContent = "data:text/csv;charset=utf-8," +
    "product_name,ingredients_text\n" +
    "\"Fresh Organic Red Apples\",\"organic fresh red apples\"\n" +
    "\"First Cold-Pressed Extra Virgin Olive Oil\",\"first cold pressed extra virgin olive oil\"\n" +
    "\"Artisan Smoked Salami\",\"pork, sea salt, ground black pepper, wine, garlic, sodium nitrite\"\n" +
    "\"Healthy Choice Zero-Sugar Citrus Energy Blast\",\"carbonated water, citric acid, aspartame, potassium benzoate, yellow 5, artificial flavor\"\n" +
    "\"Gluten-Free High-Protein Energy Bar\",\"isolated soy protein, maltitol syrup, palm kernel oil, polydextrose, soy lecithin, sucralose\"\n" +
    "\"Traditional Aged Cheddar Cheese\",\"cultured pasteurized milk, salt, microbial enzymes\"\n" +
    "\"All-Natural Pure Honey\",\"100% raw unpasteurized wildflower honey\"\n";

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", "labeltruth_sample_food_products.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Export Audited Batch Results to CSV
function exportBatchCSV() {
  if (batchItems.length === 0) {
    alert('No batch items to export. Upload and audit a CSV first.');
    return;
  }

  let csv = "Product Name,Ingredients,Predicted NOVA,Confidence,Detected Claims,Health Washed,Severity\n";
  batchItems.forEach(item => {
    const name = `"${item.product_name.replace(/"/g, '""')}"`;
    const ing = `"${item.ingredients_text.replace(/"/g, '""')}"`;
    const claims = `"${item.health_claim_audit.detected_claims.join('; ')}"`;
    csv += `${name},${ing},${item.prediction.nova_group},${item.prediction.confidence}%,${claims},${item.health_claim_audit.is_health_washed},${item.health_claim_audit.severity}\n`;
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", "labeltruth_audited_results.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

