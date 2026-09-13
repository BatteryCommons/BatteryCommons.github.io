# Battery Data Commons

This repository hosts the public web mirror for the Battery Data Commons registry.

Interface: [https://batterydatacommons.org/](https://batterydatacommons.org/)

Registry metadata: [datasets.jsonl](https://batterydatacommons.org/releases/datasets.jsonl)

This public repository provides the website and released registry files for access and review.
Internal curation workflows are maintained separately.

## Website updates

Copy the public website HTML files and the `css/`, `js/`, `data/`, and `releases/`
directories into `BatteryDataCommons/`. Keep the root `scripts/`, `tests/`, `.github/`, and
`CNAME` files when replacing the website content. Do not copy private curation files.

GitHub Actions builds and deploys the site automatically. The homepage is served
at `/`, with `/find-data/`, `/tools/`, `/about/`, `/contributors/`, `/submit/`,
`/dataset/`, and `/imprint/` for the other pages. Source HTML filenames can stay
unchanged, so these addresses remain stable when a newer website is copied in.
Old `/BatteryDataCommons/*.html` links redirect while preserving query parameters
and fragments. Existing registry download URLs remain available.

For a local preview, run `python scripts/build_site.py`, then
`python -m http.server --directory _site`. The output directory must not already exist.

## License

The released registry metadata and website content are distributed under [CC-BY 4.0](https://creativecommons.org/licenses/by/4.0/).

## Contact
- Marwan Hassini — marwan.hassini@univ-eiffel.fr
- Gonçalo dos Reis — G.dosReis@ed.ac.uk
