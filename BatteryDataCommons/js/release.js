/* One catalogue version and download target for every page. */

/* Release ids are stored as vDDMM.YYYY; readers expect vDD.MM.YYYY. */
function formatReleaseVersion(version) {
  return typeof version === 'string'
    ? version.replace(/^v(\d{2})(\d{2})\.(\d{4})/, 'v$1.$2.$3')
    : version;
}

document.addEventListener('DOMContentLoaded', async () => {
  try {
    const response = await fetch('./releases/release_manifest.json', { cache: 'no-store' });
    if (!response.ok) throw new Error('Release metadata unavailable');
    const release = await response.json();
    if (!/^BatteryDataCommons_v\d{4}\.\d{4}(?:\.\d+)?\.xlsx$/.test(release.excel_filename)) {
      throw new Error('Invalid Excel filename');
    }
    const displayVersion = formatReleaseVersion(release.version);
    document.querySelectorAll('.version-badge:not(#tools-total-badge), [data-release-version]').forEach(element => {
      element.textContent = displayVersion;
    });
    document.querySelectorAll('[data-excel-download]').forEach(link => {
      const checksum = release.assets?.[release.excel_filename]?.sha256;
      link.href = `./releases/${release.excel_filename}${checksum ? '?sha256=' + encodeURIComponent(checksum) : ''}`;
      link.download = release.excel_filename;
      link.hidden = false;
    });
    document.querySelectorAll('[data-release-details]').forEach(element => { element.hidden = false; });
  } catch (error) {
    console.warn('Catalogue download could not be loaded:', error);
  }
});
