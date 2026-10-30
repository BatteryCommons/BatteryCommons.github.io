/* One catalogue version and download target for every page. */

/* Release ids are vDD.MM.YYYY, with .2, .3 ... for further releases on the same day. */
const RELEASE_VERSION_PATTERN = /^v\d{2}\.\d{2}\.\d{4}(?:\.\d+)?$/;

document.addEventListener('DOMContentLoaded', async () => {
  try {
    const response = await fetch('./releases/release_manifest.json', { cache: 'no-store' });
    if (!response.ok) throw new Error('Release metadata unavailable');
    const release = await response.json();
    if (!RELEASE_VERSION_PATTERN.test(release.version)
        || release.excel_filename !== `BatteryDataCommons_${release.version}.xlsx`) {
      throw new Error('Invalid release version or Excel filename');
    }
    document.querySelectorAll('[data-release-version]').forEach(element => {
      element.textContent = release.version;
      element.hidden = false;
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
