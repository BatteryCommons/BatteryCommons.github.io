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

// Use data_group as the primary display category; categories[] remains multi-label for filtering.
function getCategory(dataset) {
  const dataGroupCategory = {
    PerformanceData: 'performance',
    DurabilityData: 'durability',
    FieldData: 'field',
    ModelingData: 'modelling',
    SyntheticData: 'modelling',
    SafetyData: 'safety',
    SoftwareData: 'software'
  }[dataset?.data_group || dataset?.source_metadata?.kind_of_data];

  if (dataGroupCategory) {
    return dataGroupCategory;
  }
  if (dataset.categories && dataset.categories.length > 0) {
    return dataset.categories[0];
  }
  return 'other';
}

function getPrimaryDataGroup(dataset) {
  return dataset?.data_group || dataset?.source_metadata?.kind_of_data || null;
}

function hasMeaningfulValue(value) {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return false;
    const lowered = trimmed.toLowerCase();
    return !['n/a', 'na', 'unknown', 'none', 'null', 'not applicable', 'to be checked'].includes(lowered);
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

// Fixed category templates keep their original field structure. When the
// source does not report a field, show N/A rather than removing the field.
function renderTemplateDetailItem(label, value) {
  const displayValue = hasMeaningfulValue(value) ? value : 'N/A';
  return `
        <div class="detail-item">
          <div class="detail-item-label">${label}</div>
          <div class="detail-item-value">${displayValue}</div>
        </div>`;
}

function renderTemplateBooleanDetailItem(label, value) {
  if (value === null || value === undefined || !hasMeaningfulValue(value)) {
    return renderTemplateDetailItem(label, null);
  }
  return renderTemplateDetailItem(label, value ? 'Yes' : 'No');
}


// Dense technical-spec primitives used by the dataset detail view. Category
// templates keep all of their defined fields; missing values are rendered as
// N/A with lower visual emphasis rather than removed from the page.
function renderSpecRow(label, value, required = false) {
  const available = hasMeaningfulValue(value);
  if (!available && !required) return '';
  const displayValue = available ? value : 'N/A';
  return `
        <div class="detail-spec-row${available ? '' : ' is-missing'}">
          <dt>${label}</dt>
          <dd>${displayValue}</dd>
        </div>`;
}

function renderBooleanSpecRow(label, value, required = true) {
  if (value === null || value === undefined || !hasMeaningfulValue(value)) {
    return renderSpecRow(label, null, required);
  }
  return renderSpecRow(label, value ? 'Yes' : 'No', required);
}

function renderSpecGroup(title, rows, className = '') {
  const content = rows.filter(Boolean).join('');
  if (!content) return '';
  return `
      <div class="detail-spec-group ${className}">
        <h3>${title}</h3>
        <dl>${content}
        </dl>
      </div>`;
}

function renderSpecSection(title, groups, className = '') {
  const content = groups.filter(Boolean).join('');
  if (!content) return '';
  return `
    <section class="dataset-detail-section detail-modern-section ${className}">
      <div class="detail-section-heading">
        <h2>${title}</h2>
      </div>
      <div class="detail-spec-groups">${content}
      </div>
    </section>`;
}

function renderInlineChips(values) {
  if (!Array.isArray(values) || values.length === 0) return null;
  return `<span class="detail-inline-chips">${values
    .map(value => `<span class="detail-inline-chip">${escapeHtml(value)}</span>`)
    .join('')}</span>`;
}

function getCodeUrls(dataset) {
  if (!dataset?.code?.available) return [];
  if (Array.isArray(dataset.code.urls)) {
    return dataset.code.urls.filter(url => typeof url === 'string' && url.startsWith('http'));
  }
  if (dataset.code.url) {
    return dataset.code.url.split(';').map(url => url.trim()).filter(url => url.startsWith('http'));
  }
  return [];
}

function renderDatasetProfileSection(dataset, measurements) {
  const variants = getCellVariants(dataset);
  const hasVariants = variants.length >= 2;
  const hasIdentityVariants = hasVariants && hasVariantIdentityDetails(dataset);
  const hasVariantChemistry = hasVariants && hasVariantElectrochemistryDetails(dataset);
  const chemistries = getDistinctVariantValues(dataset, 'chemistry');
  const positiveElectrodes = getDistinctVariantValues(dataset, 'positive_electrode');
  const negativeElectrodes = getDistinctVariantValues(dataset, 'negative_electrode');

  const batteryRows = hasVariants
    ? [
        renderSpecRow('Cell / module / pack', dataset.overview?.cell_module_pack),
        renderSpecRow(hasIdentityVariants ? 'Cell variants' : 'Structured variants', variants.length),
        renderSpecRow('Rated capacity', hasMeaningfulValue(dataset.reported_values?.rated_capacity_Ah) ? `${dataset.reported_values.rated_capacity_Ah} Ah` : null)
      ]
    : [
        renderSpecRow('Manufacturer', dataset.overview?.manufacturer),
        renderSpecRow('Battery model', dataset.overview?.battery_model),
        renderSpecRow('IEC battery code', dataset.overview?.iec_battery_code),
        renderSpecRow('Cell / module / pack', dataset.overview?.cell_module_pack),
        renderSpecRow('Cell format', dataset.overview?.case),
        renderSpecRow('Rated capacity', hasMeaningfulValue(dataset.reported_values?.rated_capacity_Ah) ? `${dataset.reported_values.rated_capacity_Ah} Ah` : null)
      ];

  const chemistryRows = hasVariants
    ? (hasIdentityVariants && hasVariantChemistry
      ? []
      : [
          renderSpecRow('Chemistries', renderInlineChips(chemistries)),
          renderSpecRow('Positive electrode', renderInlineChips(positiveElectrodes)),
          renderSpecRow('Negative electrode', renderInlineChips(negativeElectrodes))
        ])
    : [
        renderSpecRow('Positive electrode', dataset.electrodes?.positive),
        renderSpecRow('Negative electrode', dataset.electrodes?.negative)
      ];

  const datasetRows = [
    renderSpecRow('Specimens', dataset.reported_values?.number_of_specimens),
    renderSpecRow('Measurements', measurements.length > 0 ? measurements.join(', ') : null)
  ];

  return renderSpecSection('Dataset profile', [
    renderSpecGroup('Battery', batteryRows),
    renderSpecGroup('Chemistry', chemistryRows),
    renderSpecGroup('Dataset', datasetRows)
  ], 'detail-profile-section');
}

function renderDetailGrid(items, emptyMessage = 'Not available') {
  const content = items.filter(Boolean).join('');
  if (content) {
    return `<div class="dataset-detail-grid">${content}
      </div>`;
  }
  return `<p class="text-muted">${emptyMessage}</p>`;
}

function getCellVariants(dataset) {
  if (!Array.isArray(dataset?.cell_variants)) return [];
  return dataset.cell_variants.filter(variant => variant && typeof variant === 'object');
}

function hasStructuredCellVariants(dataset) {
  return getCellVariants(dataset).length >= 2;
}

function hasVariantIdentityDetails(dataset) {
  const identityKeys = ['manufacturer', 'battery_model', 'form_factor'];
  return getCellVariants(dataset).some(variant =>
    identityKeys.some(key => hasMeaningfulValue(variant?.[key]) && !isAggregatePlaceholder(variant?.[key]))
  );
}

function hasVariantElectrochemistryDetails(dataset) {
  const electrochemistryKeys = ['chemistry', 'positive_electrode', 'negative_electrode'];
  return getCellVariants(dataset).some(variant =>
    electrochemistryKeys.some(key => hasMeaningfulValue(variant?.[key]) && !isAggregatePlaceholder(variant?.[key]))
  );
}

function isAggregatePlaceholder(value) {
  if (!hasMeaningfulValue(value)) return true;
  if (typeof value !== 'string') return false;
  const lowered = value.trim().toLowerCase();
  return [
    'multiple',
    'varied',
    'mixed',
    'multiple formats',
    'multiple manufacturers',
    'multiple chemistry',
    'multiple chemistries'
  ].includes(lowered);
}

function getDistinctVariantValues(dataset, key) {
  return [...new Set(
    getCellVariants(dataset)
      .map(variant => variant?.[key])
      .filter(value => hasMeaningfulValue(value) && !isAggregatePlaceholder(value))
      .map(value => String(value).trim())
  )];
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Normalize long chemistry names only for concise display titles. Canonical
// metadata remains untouched so search, provenance, and source fidelity are preserved.
function abbreviateChemistryForTitle(value) {
  if (!hasMeaningfulValue(value) || isAggregatePlaceholder(value)) return null;

  const raw = String(value).trim();
  const key = raw.toLowerCase().replace(/[^a-z0-9]/g, '');
  const aliases = [
    [['lithiumironphosphate', 'lifepo4'], 'LFP'],
    [['lithiumcobaltoxide', 'licoo2'], 'LCO'],
    [['lithiummanganeseoxide', 'limn2o4'], 'LMO'],
    [['lithiumnickelmanganesecobaltoxide'], 'NMC'],
    [['lithiumnickelcobaltaluminiumoxide', 'lithiumnickelcobaltaluminumoxide'], 'NCA'],
    [['lithiumtitanate', 'li4ti5o12'], 'LTO'],
    [['sodiumion'], 'Na-ion'],
    [['lithiumion'], 'Li-ion']
  ];

  for (const [needles, alias] of aliases) {
    if (needles.some(needle => key === needle || (needle.length > 8 && key.includes(needle)))) {
      return alias;
    }
  }

  if (/^nmc\d*$/.test(key)) return raw.toUpperCase();
  if (['lfp', 'lco', 'lmo', 'nca', 'lto'].includes(key)) return key.toUpperCase();
  if (raw.length <= 16) return raw;
  return null;
}

function formatFormFactorForTitle(value) {
  if (!hasMeaningfulValue(value) || isAggregatePlaceholder(value)) return null;
  const raw = String(value).trim();
  const cylindrical = raw.match(/^R(\d{5})$/i);
  return cylindrical ? cylindrical[1] : raw;
}

function formatBatteryEntityForTitle(value) {
  const entities = {
    BatteryCell: 'Cell',
    BatteryModule: 'Module',
    BatteryPack: 'Pack'
  };
  return entities[value] || 'Battery';
}

function formatManufacturerModelForTitle(manufacturer, model) {
  if (!hasMeaningfulValue(model) || isAggregatePlaceholder(model)) return null;
  const cleanModel = String(model).trim();
  if (!hasMeaningfulValue(manufacturer) || isAggregatePlaceholder(manufacturer)) return cleanModel;
  const cleanManufacturer = String(manufacturer).trim();
  if (cleanModel.toLowerCase().startsWith(cleanManufacturer.toLowerCase())) return cleanModel;
  return `${cleanManufacturer} ${cleanModel}`;
}

function getNormalizedDatasetTitle(dataset) {
  if (hasMeaningfulValue(dataset.software?.name)) return dataset.software.name;

  const overview = dataset.overview || {};
  const variants = getCellVariants(dataset);
  const hasStructuredVariants = variants.length >= 2;
  const variantModels = getDistinctVariantValues(dataset, 'battery_model');

  // A legacy dataset-level model may be only a summary/example for a true
  // multi-variant dataset. Never let that scalar represent the whole record.
  if (!hasStructuredVariants) {
    const directModel = formatManufacturerModelForTitle(overview.manufacturer, overview.battery_model);
    if (directModel) return directModel;
  }

  if (variantModels.length === 1) {
    const matchingVariant = variants.find(variant => String(variant?.battery_model || '').trim() === variantModels[0]);
    return formatManufacturerModelForTitle(matchingVariant?.manufacturer, variantModels[0]) || variantModels[0];
  }

  const chemistryCandidates = [
    ...getDistinctVariantValues(dataset, 'chemistry'),
    ...getDistinctVariantValues(dataset, 'positive_electrode')
  ];
  if (chemistryCandidates.length === 0 && hasMeaningfulValue(dataset.electrodes?.positive)) {
    chemistryCandidates.push(dataset.electrodes.positive);
  }

  const chemistries = [...new Set(
    chemistryCandidates
      .map(abbreviateChemistryForTitle)
      .filter(Boolean)
  )];
  const formFactor = formatFormFactorForTitle(overview.case);
  const entity = formatBatteryEntityForTitle(overview.cell_module_pack);

  if (chemistries.length > 0 && chemistries.length <= 3) {
    const chemistryLabel = chemistries.join(' / ');
    const formLabel = formFactor ? ` ${formFactor}` : '';
    const entityLabel = chemistries.length > 1 && entity === 'Cell' ? 'Cells' : entity;
    return `${chemistryLabel}${formLabel} ${entityLabel}`.trim();
  }

  if (chemistries.length > 3) {
    return `Multi-chemistry ${entity}`;
  }

  if (variantModels.length > 1) {
    return `${variantModels.length} Battery Models`;
  }

  if (formFactor) {
    return `${formFactor} ${entity}`;
  }

  const category = getCategory(dataset);
  return `${BDC.formatCategory(category)} Battery Dataset`;
}

function getDetailTitle(dataset) {
  return getNormalizedDatasetTitle(dataset);
}

function renderCellVariantsSection(dataset) {
  const variants = getCellVariants(dataset);
  if (variants.length < 2 || !hasVariantIdentityDetails(dataset)) return '';

  const fields = [
    ['manufacturer', 'Manufacturer'],
    ['battery_model', 'Battery Model'],
    ['form_factor', 'Cell Format'],
    ['chemistry', 'Chemistry'],
    ['positive_electrode', 'Positive Electrode'],
    ['negative_electrode', 'Negative Electrode']
  ];

  const visibleFields = fields.filter(([key]) =>
    variants.some(variant => hasMeaningfulValue(variant?.[key]) && !isAggregatePlaceholder(variant?.[key]))
  );

  if (visibleFields.length === 0) return '';

  const header = visibleFields
    .map(([, label]) => `<th scope="col">${label}</th>`)
    .join('');

  const rows = variants.map(variant => {
    const cells = visibleFields.map(([key]) => {
      const value = variant?.[key];
      const displayValue = hasMeaningfulValue(value) && !isAggregatePlaceholder(value)
        ? escapeHtml(value)
        : '<span class="text-muted">—</span>';
      return `<td>${displayValue}</td>`;
    }).join('');
    return `<tr>${cells}</tr>`;
  }).join('');

  return `
    <div class="dataset-detail-section">
      <h2>Cell Variants</h2>
      <p class="cell-variants-summary">Structured metadata for ${variants.length} cell variants represented in this dataset.</p>
      <div class="cell-variants-table-wrap">
        <table class="cell-variants-table">
          <thead><tr>${header}</tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>
  `;
}

function renderMultiVariantBatteryInformation(dataset, measurements) {
  const variants = getCellVariants(dataset);
  const chemistries = getDistinctVariantValues(dataset, 'chemistry');
  const hasIdentityDetails = hasVariantIdentityDetails(dataset);
  const variantSummary = hasIdentityDetails
    ? renderDetailItem('Cell Variants', `${variants.length}`)
    : (chemistries.length >= 2
      ? renderDetailItem('Chemistries', `${chemistries.length}`)
      : renderDetailItem('Cell Variants', `${variants.length}`));

  return `
    <div class="dataset-detail-section">
      <h2>Battery Information</h2>
      ${renderDetailGrid([
        renderDetailItem('Cell/Module/Pack', dataset.overview?.cell_module_pack),
        variantSummary,
        renderDetailItem('Number of Specimens', dataset.reported_values?.number_of_specimens),
        renderDetailItem('Rated Capacity', hasMeaningfulValue(dataset.reported_values?.rated_capacity_Ah) ? `${dataset.reported_values.rated_capacity_Ah} Ah` : null),
        renderDetailItem('Measurements Available', measurements.length > 0 ? measurements.join(', ') : null)
      ])}
    </div>
  `;
}

function renderVariantValueGroup(label, values) {
  if (!Array.isArray(values) || values.length === 0) return '';
  const chips = values
    .map(value => `<span class="variant-value-chip">${escapeHtml(value)}</span>`)
    .join('');
  return `
    <div class="variant-value-group">
      <div class="detail-item-label">${label}</div>
      <div class="variant-value-chips">${chips}</div>
    </div>
  `;
}

function renderMultiVariantElectrochemistry(dataset) {
  const chemistries = getDistinctVariantValues(dataset, 'chemistry');
  const positiveElectrodes = getDistinctVariantValues(dataset, 'positive_electrode');
  const negativeElectrodes = getDistinctVariantValues(dataset, 'negative_electrode');

  if (chemistries.length === 0 && positiveElectrodes.length === 0 && negativeElectrodes.length === 0) {
    const datasetPositive = dataset.electrodes?.positive;
    const datasetNegative = dataset.electrodes?.negative;
    if (hasMeaningfulValue(datasetPositive) && !isAggregatePlaceholder(datasetPositive)) {
      positiveElectrodes.push(String(datasetPositive));
    }
    if (hasMeaningfulValue(datasetNegative) && !isAggregatePlaceholder(datasetNegative)) {
      negativeElectrodes.push(String(datasetNegative));
    }
  }

  const groups = [
    renderVariantValueGroup('Chemistries', chemistries),
    renderVariantValueGroup('Positive Electrode', positiveElectrodes),
    renderVariantValueGroup('Negative Electrode', negativeElectrodes)
  ].filter(Boolean).join('');

  if (!groups) return '';

  return `
    <div class="dataset-detail-section">
      <h2>Electrochemistry</h2>
      <div class="variant-values-card">${groups}</div>
    </div>
  `;
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
  return getNormalizedDatasetTitle(dataset);
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

  return `https://github.com/BatteryCommons/BatteryDataCommons/issues/new?${params.toString()}`;
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

  // Keep card chemistry compact and consistent with the discovery filter.
  const positiveElectrodeTypes = BDC.getPositiveElectrodeTypes
    ? BDC.getPositiveElectrodeTypes(dataset)
    : [];
  const positiveElectrode = positiveElectrodeTypes.length > 0
    ? positiveElectrodeTypes.join(' / ')
    : (dataset.electrodes?.positive || 'N/A');
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
      <div class="stat-label">Datasets</div>
    </div>
    <div class="card stat-card">
      <div class="stat-value">${stats.toolCount || 0}</div>
      <div class="stat-label">Tools</div>
    </div>
    <div class="card stat-card">
      <div class="stat-value">${Object.keys(stats.categories || {}).length}</div>
      <div class="stat-label">Categories</div>
    </div>
    <div class="card stat-card">
      <div class="stat-value">${Object.keys(stats.chemistryFamilies || {}).length}</div>
      <div class="stat-label">Chemistry families</div>
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

  // Positive electrode family filter — compact chips keep the sidebar low-chrome.
  if (stats.positiveElectrodes && Object.keys(stats.positiveElectrodes).length > 0) {
    html += `
        <div class="filter-group filter-group-compact">
          <h4 class="filter-title">Positive electrode</h4>
          <div class="filter-chip-list">
            ${renderCompactFilterChips('positive_electrode', stats.positiveElectrodes)}
          </div>
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

function renderCompactFilterChips(filterType, counts) {
  if (!counts) return '';

  const preferredOrder = ['LFP', 'NMC', 'NCA', 'LCO', 'LMO', 'LNO', 'PBA', 'NFM'];
  const activeFilters = BDC.activeFilters || {};
  const activeValues = activeFilters[filterType] || [];

  return Object.entries(counts)
    .sort((a, b) => {
      const ai = preferredOrder.indexOf(a[0]);
      const bi = preferredOrder.indexOf(b[0]);
      if (ai !== -1 || bi !== -1) {
        if (ai === -1) return 1;
        if (bi === -1) return -1;
        return ai - bi;
      }
      return b[1] - a[1] || a[0].localeCompare(b[0]);
    })
    .map(([value, count]) => {
      const active = activeValues.includes(value);
      return `
        <button type="button"
                class="filter-chip${active ? ' is-active' : ''}"
                aria-pressed="${active ? 'true' : 'false'}"
                onclick="BDCUI.handleFilterChange('${filterType}', '${value}')">
          <span>${value}</span><span class="filter-chip-count">${count}</span>
        </button>`;
    }).join('');
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

function refreshFiltersUI() {
  const filtersContent = document.getElementById('filters-content');
  if (!filtersContent || !BDC.getStats) return;
  filtersContent.innerHTML = renderFilters(BDC.getStats());
}

// Handle filter change
function handleFilterChange(filterType, value) {
  BDC.toggleFilter(filterType, value);
  refreshFiltersUI();
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

  // Reset search and rebuild filters so compact chips and checkboxes both
  // reflect the cleared state from the same source of truth.
  const searchInput = document.querySelector('.search-box input');
  if (searchInput) {
    searchInput.value = '';
  }

  refreshFiltersUI();
  renderResults();
}

// Truncate text
function truncate(text, length) {
  if (!text) return '';
  if (text.length <= length) return text;
  return text.substring(0, length).trim() + '...';
}

function renderBooleanDetailItem(label, value) {
  if (value === null || value === undefined) return '';
  return renderDetailItem(label, value ? 'Yes' : 'No');
}

function renderPrimaryCategorySection(dataset) {
  const group = getPrimaryDataGroup(dataset);
  const meta = dataset.source_metadata || {};

  if (group === 'PerformanceData') {
    const d = dataset.performance_details || {};
    return renderSpecSection('Performance', [
      renderSpecGroup('Capacity characterisation', [
        renderSpecRow('Test temperature', d.capacity_test_temperature, true),
        renderSpecRow('Charge conditions', d.capacity_test_charge_conditions, true),
        renderSpecRow('Discharge conditions', d.capacity_test_discharge_conditions, true)
      ]),
      renderSpecGroup('DC resistance', [
        renderSpecRow('Pulse C-rate / current', d.resistance_test_c_rate, true),
        renderSpecRow('Pulse duration', d.resistance_test_duration, true),
        renderSpecRow('Rest between pulses', d.resistance_test_rest, true),
        renderSpecRow('Measurement SoC', d.resistance_test_soc, true),
        renderSpecRow('Test temperature', d.resistance_test_temperature, true)
      ]),
      renderSpecGroup('EIS', [
        renderSpecRow('Temperature', d.eis_temperature, true),
        renderSpecRow('Frequency range', d.eis_frequency_range, true),
        renderSpecRow('Excitation', d.eis_excitation, true),
        renderSpecRow('SoC', d.eis_soc, true)
      ]),
      renderSpecGroup('Low-current characterisation', [
        renderSpecRow('Charge C-rate', d.low_current_charge_c_rate, true),
        renderSpecRow('Discharge C-rate', d.low_current_discharge_c_rate, true),
        renderSpecRow('Test temperature', d.low_current_temperature, true)
      ]),
      renderSpecGroup('Data', [
        renderSpecRow('Test duration', meta.test_duration, true),
        renderSpecRow('Sampling', meta.sampling, true),
        renderSpecRow('File format', meta.file_format, true),
        renderSpecRow('Data size', meta.size, true)
      ])
    ], 'detail-category-section');
  }

  if (group === 'DurabilityData') {
    const d = dataset.durability || {};
    return renderSpecSection('Durability', [
      renderSpecGroup('Lifetime', [
        renderSpecRow('Timeframe (cycles)', d.timeframe_cycles, true),
        renderSpecRow('Timeframe (months)', d.timeframe_months, true),
        renderSpecRow('Initial / final SoH range', d.soh_range, true)
      ]),
      renderSpecGroup('Ageing conditions', [
        renderSpecRow('Ageing temperature', d.aging_temperature, true),
        renderSpecRow('SoC window', d.soc_window, true)
      ]),
      renderSpecGroup('Cycling protocol', [
        renderSpecRow('Charge C-rate / current', d.charge_c_rate, true),
        renderSpecRow('Discharge C-rate / current', d.discharge_c_rate, true),
        renderSpecRow('Charge profile', d.charge_profile, true),
        renderSpecRow('Discharge profile', d.discharge_profile, true),
        renderSpecRow('Usage cycles / application', d.usage_cycles, true),
        renderSpecRow('Measured variables', d.measures, true)
      ]),
      renderSpecGroup('Data', [
        renderSpecRow('Sampling', meta.sampling, true),
        renderSpecRow('File format', meta.file_format, true),
        renderSpecRow('Data size', meta.size, true)
      ])
    ], 'detail-category-section');
  }

  if (group === 'FieldData') {
    const d = dataset.field_data || {};
    return renderSpecSection('Field data', [
      renderSpecGroup('Operation', [
        renderSpecRow('Usage / application', d.usage_application, true),
        renderSpecRow('Timeframe', d.timeframe, true)
      ]),
      renderSpecGroup('Data acquisition', [
        renderSpecRow('Sampling', d.sampling || meta.sampling, true),
        renderSpecRow('File format', d.file_format || meta.file_format, true),
        renderSpecRow('Data size', d.size || meta.size, true)
      ])
    ], 'detail-category-section');
  }

  if (group === 'ModelingData' || group === 'SyntheticData') {
    const d = dataset.modeling || {};
    return renderSpecSection('Modeling', [
      renderSpecGroup('Model definition', [
        renderSpecRow('Model type', d.model_type, true),
        renderBooleanSpecRow('Different temperatures', d.different_temperature, true),
        renderBooleanSpecRow('Different currents', d.different_current, true),
        renderBooleanSpecRow('Different ageing states', d.different_aging_state, true)
      ]),
      renderSpecGroup('Validation', [
        renderSpecRow('Validation profile / usage', d.validation_profile, true)
      ]),
      renderSpecGroup('Data', [
        renderSpecRow('Test duration', meta.test_duration, true),
        renderSpecRow('Sampling', meta.sampling, true),
        renderSpecRow('File format', meta.file_format, true),
        renderSpecRow('Data size', meta.size, true)
      ])
    ], 'detail-category-section');
  }

  if (group === 'SafetyData') {
    return renderSpecSection('Safety', [
      renderSpecGroup('Test summary', [
        renderSpecRow('Feature of interest', dataset.overview?.feature, true),
        renderSpecRow('Purpose', meta.purpose, true),
        renderSpecRow('Content', meta.content, true)
      ]),
      renderSpecGroup('Data', [
        renderSpecRow('Test duration', meta.test_duration, true),
        renderSpecRow('Sampling', meta.sampling, true),
        renderSpecRow('File format', meta.file_format, true),
        renderSpecRow('Data size', meta.size, true)
      ])
    ], 'detail-category-section');
  }

  return '';
}

// Render dataset detail page
function renderDatasetDetail(dataset) {
  if (!dataset) {
    return '<div class="empty-state"><h3>Registry entry not found</h3></div>';
  }

  const title = getDetailTitle(dataset);
  const category = getCategory(dataset);
  const sourceUrl = getSourceUrl(dataset);
  const description = getDescription(dataset);
  const measurements = BDC.formatMeasurements ? BDC.formatMeasurements(dataset.available_measurements) : [];
  const cellVariants = getCellVariants(dataset);
  const hasCellVariants = cellVariants.length >= 2;
  const hasIdentityVariants = hasCellVariants && hasVariantIdentityDetails(dataset);
  const variantChemistries = getDistinctVariantValues(dataset, 'chemistry');
  const specimenCount = dataset.reported_values?.number_of_specimens;
  const codeUrls = getCodeUrls(dataset);

  const metaItems = [
    hasCellVariants
      ? (hasIdentityVariants
        ? `${cellVariants.length} cell variants`
        : (variantChemistries.length >= 2 ? `${variantChemistries.length} chemistries` : `${cellVariants.length} variants`))
      : (hasMeaningfulValue(dataset.electrodes?.positive) ? dataset.electrodes.positive : null),
    !hasCellVariants && hasMeaningfulValue(dataset.overview?.case) ? dataset.overview.case : null,
    hasMeaningfulValue(specimenCount)
      ? `${Number.isInteger(Number(specimenCount)) ? Number(specimenCount) : specimenCount} specimens`
      : null,
    dataset.publication_date || null
  ].filter(Boolean).map(value => `<span class="detail-meta-item">${value}</span>`).join('');

  const actions = [];
  if (sourceUrl && sourceUrl !== '#') {
    actions.push(`<a href="${sourceUrl}" class="detail-action detail-action-primary" target="_blank" rel="noopener">Open source <span aria-hidden="true">↗</span></a>`);
  }
  if (Array.isArray(dataset.download_urls) && dataset.download_urls.length > 0) {
    actions.push(`<a href="${dataset.download_urls[0]}" class="detail-action" target="_blank" rel="noopener">Download</a>`);
  }
  codeUrls.forEach((url, index) => {
    const label = codeUrls.length > 1 ? `Code ${index + 1}` : 'Code';
    actions.push(`<a href="${url}" class="detail-action" target="_blank" rel="noopener">${label}</a>`);
  });
  if (dataset.code?.available && codeUrls.length === 0) {
    actions.push('<span class="detail-action is-disabled">Code available</span>');
  }
  const actionRow = actions.length > 0 ? `<div class="detail-actions">${actions.join('')}</div>` : '';

  const profileSection = renderDatasetProfileSection(dataset, measurements);
  const cellVariantsSection = hasIdentityVariants ? renderCellVariantsSection(dataset) : '';
  const primaryCategorySection = renderPrimaryCategorySection(dataset);

  const licenseValue = dataset.license
    ? (dataset.license.url
      ? `<a href="${dataset.license.url}" target="_blank" rel="noopener">${dataset.license.name}</a>`
      : dataset.license.name)
    : (dataset.license_url && dataset.license_url !== 'No license'
      ? `<a href="${dataset.license_url}" target="_blank" rel="noopener">Custom license</a>`
      : null);
  const cycler = [dataset.source_metadata?.battery_cycler_manufacturer, dataset.source_metadata?.battery_cycler_model]
    .filter(hasMeaningfulValue).join(' ') || null;

  const provenanceSection = renderSpecSection('Source & provenance', [
    renderSpecGroup('Registry', [
      renderSpecRow('Category', BDC.formatCategory(category)),
      renderSpecRow('Data group', dataset.data_group),
      renderSpecRow('Owner', dataset.source_metadata?.owner),
      renderSpecRow('Data modality', dataset.source_metadata?.data_modality)
    ]),
    renderSpecGroup('Provenance', [
      renderSpecRow('License', licenseValue),
      renderSpecRow('Publication year', dataset.publication_date),
      renderSpecRow('Battery cycler', cycler),
      renderSpecRow('Anomaly mentioned', dataset.source_metadata?.anomaly_mentioned ? 'Yes' : null),
      renderSpecRow('Data citation', dataset.bib_citation_data)
    ])
  ], 'detail-provenance-section');

  const publications = dataset.publications && dataset.publications.length > 0
    ? dataset.publications.map(pub => `
        <a class="detail-publication" href="${pub.url || '#'}" target="_blank" rel="noopener">
          <span>${formatPublicationLabel(pub)}</span>
          <span aria-hidden="true">↗</span>
        </a>`).join('')
    : '<p class="detail-empty-note">No associated publications.</p>';

  const publicationsSection = `
    <section class="dataset-detail-section detail-modern-section detail-publications-section">
      <div class="detail-section-heading"><h2>Publications</h2></div>
      <div class="detail-publication-list">${publications}</div>
    </section>`;

  const correctionSection = `
    <div class="detail-correction">
      <div>
        <strong>Something missing or incorrect?</strong>
        <span>Suggest a metadata correction for this registry entry.</span>
      </div>
      <button type="button" class="detail-action" onclick="BDCUI.openCorrectionModal('${dataset.id}')">Suggest a correction</button>
    </div>`;

  const correctionModal = `
    <div class="correction-modal" id="correction-modal" hidden aria-hidden="true" onclick="BDCUI.handleCorrectionOverlayClick(event)">
      <div class="correction-dialog">
        <div class="correction-dialog-header">
          <div>
            <h3 id="correction-modal-title">Suggest a correction</h3>
            <p class="correction-summary" id="correction-entry-summary"></p>
          </div>
          <button type="button" class="correction-close" aria-label="Close correction dialog" onclick="BDCUI.closeCorrectionModal()">×</button>
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
            <button type="button" class="btn btn-secondary btn-sm" onclick="BDCUI.closeCorrectionModal()">Cancel</button>
            <button type="submit" class="btn btn-outline-gradient btn-sm">Open GitHub Issue →</button>
          </div>
        </form>
      </div>
    </div>`;

  return `
    <div class="dataset-detail-modern">
      <div class="breadcrumb detail-breadcrumb">
        <a href="index.html">Home</a>
        <span class="breadcrumb-separator">/</span>
        <a href="find-data.html">Find data</a>
        <span class="breadcrumb-separator">/</span>
        <span>${dataset.id}</span>
      </div>

      <header class="detail-hero">
        <div class="detail-kicker">
          <span class="badge badge-${category}">${BDC.formatCategory(category)}</span>
          <span class="font-mono">${dataset.id}</span>
        </div>
        <h1>${title}</h1>
        <p class="detail-summary">${description}</p>
        ${metaItems ? `<div class="detail-meta-line">${metaItems}</div>` : ''}
        ${actionRow}
      </header>

      ${profileSection}
      ${cellVariantsSection}
      ${primaryCategorySection}
      ${provenanceSection}
      ${publicationsSection}
      ${correctionSection}
      ${correctionModal}
    </div>`;
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
