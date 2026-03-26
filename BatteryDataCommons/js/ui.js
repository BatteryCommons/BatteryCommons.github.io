/* ============================================
   Battery Data Commons — UI Components
   Updated for new schema
   ============================================ */

// Initialize theme
function initTheme() {
  const savedTheme = localStorage.getItem('bdc-theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
  updateThemeIcon(savedTheme);
}

// Toggle theme
function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';

  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('bdc-theme', next);
  updateThemeIcon(next);
}

// Update theme toggle icon
function updateThemeIcon(theme) {
  const toggle = document.querySelector('.theme-toggle');
  if (!toggle) return;

  toggle.innerHTML = theme === 'dark'
    ? '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>'
    : '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>';
}

// Toggle mobile navigation
function toggleMobileNav() {
  const navLinks = document.querySelector('.nav-links');
  if (navLinks) {
    navLinks.classList.toggle('open');
  }
}

// Get first category from dataset
function getCategory(dataset) {
  if (dataset.categories && dataset.categories.length > 0) {
    return dataset.categories[0];
  }
  return 'other';
}

function hasMeaningfulValue(value) {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return false;
    const lowered = trimmed.toLowerCase();
    return !['n/a', 'na', 'unknown', 'none', 'null'].includes(lowered);
  }
  return true;
}

function formatPublicationLabel(pub) {
  if (!pub) return 'Associated Publication';
  if (hasMeaningfulValue(pub.bib_citation)) return pub.bib_citation;
  try {
    const url = new URL(pub.url);
    if (url.hostname === 'doi.org') {
      return decodeURIComponent(url.pathname.replace(/^\/+/, ''));
    }
  } catch (e) {
    // Ignore malformed URLs and fall through to a generic label.
  }
  return 'Associated Publication';
}

function renderDetailItem(label, value) {
  if (!hasMeaningfulValue(value)) return '';
  return `
        <div class="detail-item">
          <div class="detail-item-label">${label}</div>
          <div class="detail-item-value">${value}</div>
        </div>`;
}

function renderDetailGrid(items, emptyMessage = 'Not available') {
  const content = items.filter(Boolean).join('');
  if (content) {
    return `<div class="dataset-detail-grid">${content}
      </div>`;
  }
  return `<p class="text-muted">${emptyMessage}</p>`;
}

function getSoftwareDescription(dataset) {
  const software = dataset.software || {};
  const name = software.name;
  if (!hasMeaningfulValue(name)) {
    return null;
  }

  const features = [];
  const featureMap = [
    ['physics_modelling', 'physics-based battery modelling'],
    ['experiment_modelling', 'experiment modelling'],
    ['cycler_data_processing', 'cycler-data processing'],
    ['battery_metrics', 'battery analytics'],
    ['prediction', 'battery prediction'],
    ['simulation', 'battery simulation']
  ];

  featureMap.forEach(([key, label]) => {
    if (software.features?.[key]) {
      features.push(label);
    }
  });

  const parts = ['Software tool'];
  if (features.length > 0) {
    if (features.length === 1) {
      parts.push(`for ${features[0]}`);
    } else if (features.length === 2) {
      parts.push(`for ${features[0]} and ${features[1]}`);
    } else {
      parts.push(`for ${features.slice(0, 2).join(', ')}, and ${features[2]}`);
    }
  }

  if (hasMeaningfulValue(software.gui_or_language)) {
    parts.push(`in ${software.gui_or_language}`);
  }

  let sentence = parts.join(' ') + '.';

  if (hasMeaningfulValue(software.public_commercial)) {
    sentence += ` Availability: ${software.public_commercial}.`;
  }

  return sentence;
}

// Get display title from dataset
function getTitle(dataset) {
  if (hasMeaningfulValue(dataset.title)) {
    return dataset.title;
  }

  if (hasMeaningfulValue(dataset.software?.name)) {
    return dataset.software.name;
  }

  // Prefer a concise manufacturer + model combination when available.
  if (hasMeaningfulValue(dataset.overview?.battery_model)) {
    const model = dataset.overview.battery_model;
    const mfr = dataset.overview?.manufacturer;
    if (hasMeaningfulValue(mfr)) {
      return `${mfr} ${model}`;
    }
    return model;
  }

  if (hasMeaningfulValue(dataset.comment) && dataset.comment !== '#REF!') {
    return dataset.comment;
  }

  if (hasMeaningfulValue(dataset.overview?.feature) && dataset.overview.feature.split(/\s+/).length <= 6) {
    return dataset.overview.feature;
  }

  const cellType = dataset.overview?.cell_module_pack;
  const electrode = dataset.electrodes?.positive;
  if (hasMeaningfulValue(cellType)) {
    if (hasMeaningfulValue(electrode)) {
      return `${electrode} ${cellType}`;
    }
    return cellType;
  }

  if (hasMeaningfulValue(electrode)) {
    const caseType = dataset.overview?.case;
    if (hasMeaningfulValue(caseType)) {
      return `${electrode} / ${caseType}`;
    }
    return electrode;
  }

  if (hasMeaningfulValue(dataset.source_metadata?.owner)) {
    return dataset.source_metadata.owner;
  }

  const category = dataset.categories?.[0] || 'Battery';
  return `${BDC.formatCategory(category)} Registry Entry`;
}

// Get description from dataset
function getDescription(dataset) {
  if (hasMeaningfulValue(dataset.source_metadata?.purpose)) {
    return dataset.source_metadata.purpose;
  }

  const softwareDescription = getSoftwareDescription(dataset);
  if (softwareDescription) {
    return softwareDescription;
  }

  const parts = [];

  if (hasMeaningfulValue(dataset.source_metadata?.owner)) {
    parts.push(`From ${dataset.source_metadata.owner}`);
  }

  if (hasMeaningfulValue(dataset.reported_values?.number_of_specimens)) {
    parts.push(`${Math.round(dataset.reported_values.number_of_specimens)} specimens`);
  }

  if (hasMeaningfulValue(dataset.reported_values?.rated_capacity_Ah)) {
    parts.push(`${dataset.reported_values.rated_capacity_Ah} Ah capacity`);
  }

  const measurements = BDC.formatMeasurements ? BDC.formatMeasurements(dataset.available_measurements) : [];
  if (measurements.length > 0) {
    parts.push(`Measurements: ${measurements.join(', ')}`);
  }

  return parts.length > 0 ? parts.join('. ') + '.' : 'Battery registry entry with detailed characterization data.';
}

// Get source URL
function getSourceUrl(dataset) {
  if (dataset.source_urls && dataset.source_urls.length > 0) {
    return dataset.source_urls[0];
  }
  return '#';
}

function buildCorrectionIssueUrl(payload) {
  const params = new URLSearchParams({
    template: 'registry_entry_correction.yml',
    title: `[Correction] ${payload.entryId}`,
    entry_id: payload.entryId,
    correction: payload.correction
  });

  if (payload.evidence) {
    params.set('evidence', payload.evidence);
  }

  return `https://github.com/shiyunliu-battery/BatteryDataCommons/issues/new?${params.toString()}`;
}

function openCorrectionModal(entryId) {
  const modal = document.getElementById('correction-modal');
  if (!modal) return;

  const dataset = BDC.getDatasetById(entryId);
  if (!dataset) return;

  const entryTitle = getTitle(dataset);

  const entryIdInput = document.getElementById('correction-entry-id');
  const summary = document.getElementById('correction-entry-summary');
  const messageField = document.getElementById('correction-message');

  if (entryIdInput) entryIdInput.value = entryId;
  if (summary) summary.textContent = `${entryId} — ${entryTitle}`;

  modal.hidden = false;
  modal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('modal-open');

  if (messageField) {
    messageField.focus();
  }
}

function closeCorrectionModal(resetForm = false) {
  const modal = document.getElementById('correction-modal');
  if (!modal) return;

  if (resetForm) {
    const form = document.getElementById('correction-form');
    if (form) {
      form.reset();
    }
  }

  modal.hidden = true;
  modal.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('modal-open');
}

function handleCorrectionOverlayClick(event) {
  if (event.target && event.target.id === 'correction-modal') {
    closeCorrectionModal();
  }
}

function submitCorrection(event) {
  event.preventDefault();

  const entryId = document.getElementById('correction-entry-id')?.value?.trim();
  const correction = document.getElementById('correction-message')?.value?.trim();
  const evidence = document.getElementById('correction-evidence')?.value?.trim();

  if (!entryId || !correction) {
    return;
  }

  const issueUrl = buildCorrectionIssueUrl({
    entryId,
    correction,
    evidence
  });

  const popup = window.open(issueUrl, '_blank', 'noopener');
  if (!popup) {
    window.location.href = issueUrl;
    return;
  }

  closeCorrectionModal(true);
}

// Render dataset card
function renderDatasetCard(dataset) {
  const category = getCategory(dataset);
  const categoryBadgeClass = `badge-${category}`;
  const title = getTitle(dataset);
  const description = getDescription(dataset);
  const sourceUrl = getSourceUrl(dataset);

  // Get electrode info
  const positiveElectrode = dataset.electrodes?.positive || 'N/A';
  const cellFormat = dataset.overview?.case || 'Unknown';
  const year = dataset.publication_date || '';
  const metaBadges = [
    hasMeaningfulValue(positiveElectrode) ? `<span class="badge">${positiveElectrode}</span>` : '',
    hasMeaningfulValue(cellFormat) ? `<span class="badge">${cellFormat}</span>` : '',
    year ? `<span class="badge">${year}</span>` : ''
  ].filter(Boolean).join('');

  return `
    <article class="card dataset-card" onclick="window.location.href='dataset.html?id=${dataset.id}'">
      <div class="card-header">
        <div>
          <h3 class="card-title">${truncate(title, 80)}</h3>
          <span class="dataset-doi text-sm text-muted">${dataset.id}</span>
        </div>
        <span class="badge ${categoryBadgeClass}">${BDC.formatCategory(category)}</span>
      </div>
      <div class="card-body">
        <p>${truncate(description, 150)}</p>
        <div class="dataset-meta">
          ${metaBadges}
        </div>
      </div>
      <div class="card-footer flex justify-between items-center">
        <span class="text-sm text-muted">${dataset.source_metadata?.owner || 'Unknown'}</span>
        <a href="${sourceUrl}" class="btn btn-sm btn-outline" onclick="event.stopPropagation()" target="_blank" rel="noopener">
          View Data →
        </a>
      </div>
    </article>
  `;
}

// Render stats cards
function renderStatsCards(stats) {
  return `
    <div class="card stat-card">
      <div class="stat-value">${stats.total}</div>
      <div class="stat-label">Curated Datasets</div>
    </div>
    <div class="card stat-card">
      <div class="stat-value">${stats.toolCount || 0}</div>
      <div class="stat-label">Software Tools</div>
    </div>
    <div class="card stat-card">
      <div class="stat-value">${Object.keys(stats.categories || {}).length}</div>
      <div class="stat-label">Categories</div>
    </div>
    <div class="card stat-card">
      <div class="stat-value">${Object.keys(stats.years || {}).length}</div>
      <div class="stat-label">Publication Years</div>
    </div>
  `;
}

// Render filter sidebar
function renderFilters(stats) {
  if (!stats) return '<p>Loading filters...</p>';

  let html = '';

  // Category filter
  if (stats.categories && Object.keys(stats.categories).length > 0) {
    html += `
        <div class="filter-group">
          <h4 class="filter-title">Category</h4>
          ${renderFilterOptions('category', stats.categories)}
        </div>`;
  }

  // Cell/Module/Pack filter
  if (stats.cellModulePack && Object.keys(stats.cellModulePack).length > 0) {
    html += `
        <div class="filter-group">
          <h4 class="filter-title">Cell Type</h4>
          ${renderFilterOptions('cell_module_pack', stats.cellModulePack)}
        </div>`;
  }

  // Year filter
  if (stats.years && Object.keys(stats.years).length > 0) {
    html += `
        <div class="filter-group">
          <h4 class="filter-title">Year</h4>
          ${renderFilterOptions('year', stats.years)}
        </div>`;
  }

  return html || '<p>No filters available</p>';
}

// Render filter options
function renderFilterOptions(filterType, counts) {
  if (!counts) return '';

  const formatters = {
    'category': BDC.formatCategory,
    'data_group': BDC.formatDataGroup || (x => x),
    'cell_module_pack': x => x,
    'year': x => x
  };

  const formatter = formatters[filterType] || (x => x);
  const activeFilters = BDC.activeFilters || {};

  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([value, count]) => `
      <label class="filter-option">
        <input type="checkbox" 
               onchange="handleFilterChange('${filterType}', '${value}')"
               ${(activeFilters[filterType] || []).includes(value) ? 'checked' : ''}>
        <span>${formatter(value)}</span>
        <span class="count">${count}</span>
      </label>
    `).join('');
}

// Handle filter change
function handleFilterChange(filterType, value) {
  BDC.toggleFilter(filterType, value);
  renderResults();
}

// Handle search input
function handleSearch(event) {
  BDC.setSearch(event.target.value);
  renderResults();
}

// Render results
function renderResults() {
  const resultsContainer = document.getElementById('results');
  const resultsCount = document.getElementById('results-count');

  if (!resultsContainer) return;

  const datasets = BDC.filteredDatasets || [];

  if (resultsCount) {
    resultsCount.innerHTML = `Showing <span>${datasets.length}</span> datasets`;
  }

  if (datasets.length === 0) {
    resultsContainer.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3>No datasets found</h3>
        <p>Try adjusting your filters or search query.</p>
        <button class="btn btn-secondary mt-4" onclick="handleClearFilters()">Clear Filters</button>
      </div>
    `;
    return;
  }

  resultsContainer.innerHTML = datasets.map(renderDatasetCard).join('');
}

// Handle clear filters
function handleClearFilters() {
  BDC.clearFilters();

  // Reset checkboxes
  document.querySelectorAll('.filter-option input[type="checkbox"]').forEach(cb => {
    cb.checked = false;
  });

  // Reset search
  const searchInput = document.querySelector('.search-box input');
  if (searchInput) {
    searchInput.value = '';
  }

  renderResults();
}

// Truncate text
function truncate(text, length) {
  if (!text) return '';
  if (text.length <= length) return text;
  return text.substring(0, length).trim() + '...';
}

// Render dataset detail page
function renderDatasetDetail(dataset) {
  if (!dataset) {
    return '<div class="empty-state"><h3>Registry entry not found</h3></div>';
  }

  const title = getTitle(dataset);
  const category = getCategory(dataset);
  const sourceUrl = getSourceUrl(dataset);
  const measurements = BDC.formatMeasurements ? BDC.formatMeasurements(dataset.available_measurements) : [];
  const headerBadges = [
    `<span class="badge badge-${category}">${BDC.formatCategory(category)}</span>`,
    hasMeaningfulValue(dataset.electrodes?.positive) ? `<span class="badge">${dataset.electrodes.positive}</span>` : '',
    hasMeaningfulValue(dataset.overview?.case) ? `<span class="badge">${dataset.overview.case}</span>` : '',
    dataset.publication_date ? `<span class="version-badge">${dataset.publication_date}</span>` : ''
  ].filter(Boolean).join('');

  // Publications
  const publications = dataset.publications && dataset.publications.length > 0
    ? dataset.publications.map(pub => `
        <li>
          <a href="${pub.url || '#'}" target="_blank" rel="noopener">${formatPublicationLabel(pub)}</a>
        </li>
      `).join('')
    : '<li class="text-muted">No associated publications</li>';

  // Code section — handle multiple URLs
  let codeSection = '';
  if (dataset.code && dataset.code.available) {
    // Collect code URLs: prefer urls array, fall back to url string (split on ; for legacy)
    let codeUrls = [];
    if (dataset.code.urls && Array.isArray(dataset.code.urls)) {
      codeUrls = dataset.code.urls;
    } else if (dataset.code.url) {
      codeUrls = dataset.code.url.split(';').map(u => u.trim()).filter(u => u.startsWith('http'));
    }

    const githubIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
               <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/></svg>`;

    if (codeUrls.length > 0) {
      const buttons = codeUrls.map((url, i) => {
        const label = codeUrls.length > 1 ? `View Code ${i + 1} →` : 'View Code →';
        return `<a href="${url}" class="btn btn-outline btn-lg" target="_blank" rel="noopener">
               ${githubIcon}
               ${label}
             </a>`;
      }).join('\n        ');

      codeSection = `
      <div class="dataset-detail-section">
        <h2>Processing Code</h2>
        <div style="display:flex;gap:.75rem;flex-wrap:wrap;">
          ${buttons}
        </div>
      </div>`;
    } else {
      codeSection = `
      <div class="dataset-detail-section">
        <h2>Processing Code</h2>
        <span class="badge badge-field">Code Available</span>
      </div>`;
    }
  }

  // Modeling section (for modeling category)
  const modelingSection = dataset.modeling ? `
    <div class="dataset-detail-section">
      <h2>Modeling Information</h2>
      ${renderDetailGrid([
        renderDetailItem('Model Type', dataset.modeling.model_type),
        dataset.modeling.different_temperature !== null && dataset.modeling.different_temperature !== undefined
          ? renderDetailItem('Different Temperatures', dataset.modeling.different_temperature ? 'Yes' : 'No')
          : '',
        dataset.modeling.different_current !== null && dataset.modeling.different_current !== undefined
          ? renderDetailItem('Different Currents', dataset.modeling.different_current ? 'Yes' : 'No')
          : '',
        dataset.modeling.different_aging_state !== null && dataset.modeling.different_aging_state !== undefined
          ? renderDetailItem('Different Aging States', dataset.modeling.different_aging_state ? 'Yes' : 'No')
          : '',
        renderDetailItem('Validation Profile', dataset.modeling.validation_profile)
      ])}
    </div>
  ` : '';

  // Field data section (for field category)
  const fieldSection = dataset.field_data ? `
    <div class="dataset-detail-section">
      <h2>Field Data Information</h2>
      ${renderDetailGrid([
        renderDetailItem('Usage/Application', dataset.field_data.usage_application),
        renderDetailItem('Timeframe', dataset.field_data.timeframe),
        renderDetailItem('Sampling Rate', dataset.field_data.sampling),
        renderDetailItem('Data Size', dataset.field_data.size),
        renderDetailItem('File Format', dataset.field_data.file_format)
      ])}
    </div>
  ` : '';

  // Durability section (for ageing category)
  const durabilitySection = dataset.durability ? `
    <div class="dataset-detail-section">
      <h2>Durability Information</h2>
      ${renderDetailGrid([
        renderDetailItem('Timeframe (Cycles)', dataset.durability.timeframe_cycles),
        renderDetailItem('Timeframe (Months)', dataset.durability.timeframe_months),
        renderDetailItem('Usage Cycles', dataset.durability.usage_cycles),
        renderDetailItem('Measures', dataset.durability.measures),
        renderDetailItem('Sampling', dataset.durability.sampling)
      ])}
    </div>
  ` : '';

  // Safety section
  const safetySection = (dataset.source_metadata?.purpose || dataset.source_metadata?.content) ? `
    <div class="dataset-detail-section">
      <h2>Safety Information</h2>
      ${renderDetailGrid([
        renderDetailItem('Purpose', dataset.source_metadata.purpose),
        renderDetailItem('Content', dataset.source_metadata.content)
      ])}
    </div>
  ` : '';

  // Download URLs section
  const downloadSection = dataset.download_urls && dataset.download_urls.length > 0
    ? `
      <div class="dataset-detail-section">
        <h2>Download Data</h2>
        <a href="${dataset.download_urls[0]}" class="btn btn-outline-gradient btn-lg" target="_blank" rel="noopener">
          Download Data →
        </a>
      </div>`
    : '';

  const correctionSection = `
    <div class="dataset-detail-section card correction-callout">
      <div class="correction-callout-inner">
        <div>
          <h2>Suggest a correction</h2>
          <p>Notice a metadata issue, missing link, or better source for this registry entry? Open a quick GitHub issue with the entry context prefilled.</p>
        </div>
        <button type="button" class="btn btn-outline btn-sm" onclick="BDCUI.openCorrectionModal('${dataset.id}')">
          Suggest a correction
        </button>
      </div>
    </div>
  `;

  const correctionModal = `
    <div class="correction-modal" id="correction-modal" hidden aria-hidden="true" onclick="BDCUI.handleCorrectionOverlayClick(event)">
      <div class="correction-dialog">
        <div class="correction-dialog-header">
          <div>
            <h3 id="correction-modal-title">Suggest a correction</h3>
            <p class="correction-summary" id="correction-entry-summary"></p>
          </div>
          <button type="button" class="correction-close" aria-label="Close correction dialog" onclick="BDCUI.closeCorrectionModal()">
            ×
          </button>
        </div>

        <form id="correction-form" class="correction-form" onsubmit="BDCUI.submitCorrection(event)">
          <input type="hidden" id="correction-entry-id">

          <label class="correction-field">
            <span class="correction-label">What should be corrected or improved?</span>
            <textarea id="correction-message" class="input correction-textarea" required placeholder="Describe the correction or suggestion for this registry entry."></textarea>
          </label>

          <label class="correction-field">
            <span class="correction-label">Evidence or source link (optional)</span>
            <input id="correction-evidence" class="input" type="url" placeholder="https://doi.org/...">
          </label>

          <p class="correction-note">Submitting will open a GitHub issue in a new tab with this registry entry already filled in.</p>

          <div class="correction-actions">
            <button type="button" class="btn btn-secondary btn-sm" onclick="BDCUI.closeCorrectionModal()">
              Cancel
            </button>
            <button type="submit" class="btn btn-outline-gradient btn-sm">
              Open GitHub Issue →
            </button>
          </div>
        </form>
      </div>
    </div>
  `;

  return `
    <div class="breadcrumb">
      <a href="index.html">Home</a>
      <span class="breadcrumb-separator">›</span>
      <a href="find-data.html">Find Data</a>
      <span class="breadcrumb-separator">›</span>
      <span>${dataset.id}</span>
    </div>
    
    <div class="dataset-detail-header">
      <h1>${title}</h1>
      <div class="dataset-detail-meta">
        ${headerBadges}
      </div>
      <p class="font-mono text-muted">ID: ${dataset.id}</p>
    </div>
    
    <div class="dataset-detail-section">
      <h2>Overview</h2>
      <p>${getDescription(dataset)}</p>
    </div>
    
    <div class="dataset-detail-section">
      <h2>Access Source</h2>
      <a href="${sourceUrl}" class="btn btn-outline-gradient btn-lg" target="_blank" rel="noopener">
        Open Source Record →
      </a>
    </div>

    ${downloadSection}
    ${codeSection}
    
    <div class="dataset-detail-section">
      <h2>Battery Information</h2>
      ${renderDetailGrid([
        renderDetailItem('Manufacturer', dataset.overview?.manufacturer),
        renderDetailItem('Battery Model', dataset.overview?.battery_model),
        renderDetailItem('IEC Battery Code', dataset.overview?.iec_battery_code),
        renderDetailItem('Cell/Module/Pack', dataset.overview?.cell_module_pack),
        renderDetailItem('Cell Format', dataset.overview?.case),
        renderDetailItem('Rated Capacity', hasMeaningfulValue(dataset.reported_values?.rated_capacity_Ah) ? `${dataset.reported_values.rated_capacity_Ah} Ah` : null)
      ])}
    </div>
    
    <div class="dataset-detail-section">
      <h2>Electrochemistry</h2>
      ${renderDetailGrid([
        renderDetailItem('Positive Electrode', dataset.electrodes?.positive),
        renderDetailItem('Negative Electrode', dataset.electrodes?.negative),
        renderDetailItem('Number of Specimens', dataset.reported_values?.number_of_specimens),
        renderDetailItem('Measurements Available', measurements.length > 0 ? measurements.join(', ') : null)
      ])}
    </div>

    ${modelingSection}
    ${fieldSection}
    ${durabilitySection}
    ${safetySection}
    
    <div class="dataset-detail-section">
      <h2>Source Information</h2>
      ${renderDetailGrid([
        renderDetailItem('Category', BDC.formatCategory(category)),
        renderDetailItem('Data Group', dataset.data_group),
        renderDetailItem('Owner', dataset.source_metadata?.owner),
        renderDetailItem('Data Modality', dataset.source_metadata?.data_modality),
        renderDetailItem(
          'License',
          dataset.license
            ? (dataset.license.url
              ? `<a href="${dataset.license.url}" target="_blank" rel="noopener">${dataset.license.name}</a>`
              : dataset.license.name)
            : (dataset.license_url && dataset.license_url !== 'No license'
              ? `<a href="${dataset.license_url}" target="_blank" rel="noopener">Custom License</a>`
              : null)
        ),
        renderDetailItem('Publication Year', dataset.publication_date),
        renderDetailItem(
          'Battery Cycler',
          [dataset.source_metadata?.battery_cycler_manufacturer, dataset.source_metadata?.battery_cycler_model].filter(hasMeaningfulValue).join(' ') || null
        ),
        renderDetailItem('Anomaly Mentioned', dataset.source_metadata?.anomaly_mentioned ? 'Yes' : null),
        renderDetailItem('Data Citation', dataset.bib_citation_data)
      ])}
    </div>
    
    <div class="dataset-detail-section">
      <h2>Associated Publications</h2>
      <ul>${publications}</ul>
    </div>

    ${correctionSection}
    ${correctionModal}
  `;
}

// Get URL parameter
function getUrlParam(param) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(param);
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', function () {
  // Theme initialized in head script, but we need to update the icon
  const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
  updateThemeIcon(currentTheme);
});

document.addEventListener('keydown', function (event) {
  if (event.key !== 'Escape') return;

  const modal = document.getElementById('correction-modal');
  if (modal && !modal.hidden) {
    closeCorrectionModal();
  }
});

// Export UI functions
window.BDCUI = {
  initTheme,
  toggleTheme,
  toggleMobileNav,
  openCorrectionModal,
  closeCorrectionModal,
  handleCorrectionOverlayClick,
  submitCorrection,
  renderDatasetCard,
  renderStatsCards,
  renderFilters,
  renderResults,
  renderDatasetDetail,
  handleFilterChange,
  handleSearch,
  handleClearFilters,
  getUrlParam
};
