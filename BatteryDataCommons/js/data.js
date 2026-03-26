/* ============================================
   Battery Data Commons — Data Layer
   Updated to load from releases/search_index.json
   ============================================ */

// Global state
let datasets = [];
let searchIndex = null;
let filteredDatasets = [];
let releaseMeta = {
  release_date: null,
  dataset_count: 0,
  tool_count: 0,
  active_record_count: 0,
  category_counts: {}
};
let activeFilters = {
  category: [],
  data_group: [],
  cell_module_pack: [],
  year: []
};
let searchQuery = '';

// Load data from releases
async function loadCatalogue() {
  try {
    // Load release metadata if available
    try {
      const metaResponse = await fetch('./releases/site_stats.json');
      if (metaResponse.ok) {
        releaseMeta = await metaResponse.json();
      }
    } catch (error) {
      console.warn('Failed to load release metadata:', error);
    }

    // Load search index (lighter, for filtering)
    const indexResponse = await fetch('./releases/search_index.json');
    searchIndex = await indexResponse.json();

    // Create a map of ID -> Keywords for fast lookup
    const keywordMap = new Map();
    if (searchIndex && searchIndex.datasets) {
      searchIndex.datasets.forEach(d => {
        if (d.id && d.keywords) {
          keywordMap.set(d.id, d.keywords);
        }
      });
    }

    // Load full dataset records
    const jsonlResponse = await fetch('./releases/datasets.jsonl');
    const jsonlText = await jsonlResponse.text();

    // Parse JSONL (one JSON object per line)
    datasets = jsonlText
      .split('\n')
      .filter(line => line.trim())
      .map(line => {
        try {
          const d = JSON.parse(line);
          // Merge keywords from search index
          if (keywordMap.has(d.id)) {
            d.keywords = keywordMap.get(d.id);
          }
          return d;
        } catch (e) {
          console.warn('Skipping invalid JSON line', e);
          return null;
        }
      })
      .filter(Boolean); // Remove nulls

    filteredDatasets = [...datasets];

    // Fallback if release metadata is missing
    if (!releaseMeta.dataset_count) {
      releaseMeta.dataset_count = datasets.length;
    }
    if (!releaseMeta.active_record_count) {
      releaseMeta.active_record_count = releaseMeta.dataset_count + (releaseMeta.tool_count || 0);
    }

    // Create backward-compatible catalogue object
    return {
      datasets: datasets,
      version: "2.0",
      release_date: releaseMeta.release_date
    };
  } catch (error) {
    console.error('Failed to load catalogue:', error);
    return null;
  }
}

// Get aggregated statistics
function getStats() {
  if (!datasets.length) return null;

  return {
    total: datasets.length,
    toolCount: releaseMeta.tool_count || 0,
    activeRecordCount: releaseMeta.active_record_count || datasets.length,
    categories: countByArray(datasets, 'categories'),
    dataGroups: countBy(datasets, 'data_group'),
    cellModulePack: countByNested(datasets, 'overview', 'cell_module_pack'),
    years: countBy(datasets, 'publication_date'),
    electrodesPositive: countByNested(datasets, 'electrodes', 'positive'),
    electrodesNegative: countByNested(datasets, 'electrodes', 'negative')
  };
}

// Count occurrences by field (skip null/undefined)
function countBy(arr, field) {
  return arr.reduce((acc, item) => {
    const key = item[field];
    // Skip null, undefined, empty string, or Unknown
    if (!key || key === 'Unknown') return acc;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

// Count occurrences by array field (e.g., categories)
function countByArray(arr, field) {
  return arr.reduce((acc, item) => {
    const values = item[field] || [];
    values.forEach(key => {
      acc[key] = (acc[key] || 0) + 1;
    });
    return acc;
  }, {});
}

// Count occurrences by nested field (skip null/undefined)
function countByNested(arr, parent, child) {
  return arr.reduce((acc, item) => {
    const key = item[parent] && item[parent][child];
    // Skip null, undefined, empty string, or Unknown
    if (!key || key === 'Unknown') return acc;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

// Apply filters and search
function applyFilters() {
  if (!datasets.length) return [];

  filteredDatasets = datasets.filter(dataset => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();

      // Use pre-computed keywords from RDF index AND fallback fields
      const searchContent = [
        dataset.keywords,
        dataset.comment,
        dataset.data_group,
        dataset.electrodes?.positive,
        dataset.electrodes?.negative,
        dataset.source_metadata?.owner,
        dataset.bib_citation_data,
        ...(dataset.categories || [])
      ].filter(Boolean).join(' ');

      if (!searchContent.toLowerCase().includes(query)) {
        return false;
      }
    }

    // Category filter (array field)
    if (activeFilters.category.length > 0) {
      const categories = dataset.categories || [];
      if (!activeFilters.category.some(c => categories.includes(c))) {
        return false;
      }
    }

    // Data group filter
    if (activeFilters.data_group.length > 0) {
      if (!activeFilters.data_group.includes(dataset.data_group)) {
        return false;
      }
    }

    // Cell/Module/Pack filter
    if (activeFilters.cell_module_pack.length > 0) {
      const cmp = dataset.overview?.cell_module_pack;
      if (!activeFilters.cell_module_pack.includes(cmp)) {
        return false;
      }
    }

    // Year filter
    if (activeFilters.year.length > 0) {
      if (!activeFilters.year.includes(dataset.publication_date)) {
        return false;
      }
    }

    return true;
  });

  return filteredDatasets;
}

// Set search query
function setSearch(query) {
  searchQuery = query;
  return applyFilters();
}

// Toggle filter
function toggleFilter(filterType, value) {
  if (!activeFilters[filterType]) {
    activeFilters[filterType] = [];
  }

  const index = activeFilters[filterType].indexOf(value);

  if (index === -1) {
    activeFilters[filterType].push(value);
  } else {
    activeFilters[filterType].splice(index, 1);
  }

  return applyFilters();
}

// Clear all filters
function clearFilters() {
  activeFilters = {
    category: [],
    data_group: [],
    cell_module_pack: [],
    year: []
  };
  searchQuery = '';
  return applyFilters();
}

// Get dataset by ID
function getDatasetById(id) {
  return datasets.find(d => d.id === id);
}

// Get version info
function getVersionInfo() {
  return {
    version: "2.0",
    releaseDate: releaseMeta.release_date,
    totalDatasets: releaseMeta.dataset_count || datasets.length,
    totalTools: releaseMeta.tool_count || 0,
    totalRecords: releaseMeta.active_record_count || datasets.length
  };
}

// Format category name for display
function formatCategory(category) {
  const labels = {
    'performance': 'Performance',
    'durability': 'Durability',
    'field': 'Field Data',
    'modelling': 'Modelling',
    'safety': 'Safety',
    'diagnostics': 'Diagnostics',
    'other': 'Other'
  };
  return labels[category] || category;
}

// Format data group for display
function formatDataGroup(group) {
  const labels = {
    'PerformanceData': 'Performance',
    'DurabilityData': 'Durability',
    'FieldData': 'Field',
    'ModelingData': 'Modeling',
    'SafetyData': 'Safety'
  };
  return labels[group] || group;
}

// Format measurements for display
function formatMeasurements(measurements) {
  if (!measurements) return [];

  const labels = {
    'discharge_capacity': 'Discharge Capacity',
    'internal_resistance': 'Internal Resistance',
    'eis': 'EIS',
    'pseudo_ocv': 'Pseudo OCV'
  };

  return Object.entries(measurements)
    .filter(([key, value]) => value === true)
    .map(([key]) => labels[key] || key);
}

// Get main source URL
function getMainSourceUrl(dataset) {
  if (dataset.source_urls && dataset.source_urls.length > 0) {
    return dataset.source_urls[0];
  }
  return null;
}

// Get article URL
function getArticleUrl(dataset) {
  if (dataset.publications && dataset.publications.length > 0) {
    return dataset.publications[0].url;
  }
  return null;
}

// Export functions for use in UI
window.BDC = {
  loadCatalogue,
  getStats,
  applyFilters,
  setSearch,
  toggleFilter,
  clearFilters,
  getDatasetById,
  getVersionInfo,
  formatCategory,
  formatDataGroup,
  formatMeasurements,
  getMainSourceUrl,
  getArticleUrl,
  get filteredDatasets() { return filteredDatasets; },
  get activeFilters() { return activeFilters; },
  get datasets() { return datasets; }
};
