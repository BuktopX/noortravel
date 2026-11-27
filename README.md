# Noor Travel — Website Structure

Static site built from JSON data + reusable HTML templates (`scripts/build.js`), hosted on GitHub Pages with zero npm dependencies.

## Structure

- `data/site.json` — brand info, contacts, legal details, managers, homepage copy, and `"Скоро"` list
- `data/cities.json` — city lookup table (`name`, `lat`, `lon`, `code`) for the 3D globe and route stops
- `data/tours/<slug>.json` — one JSON file per tour (`published: true/false`, `order`, route, hotels, included/excluded, FAQ, globe config)
- `templates/` — `home.js`, `tour.js`, `partials.js`
- `scripts/build.js` — generates `index.html`, `tours/<slug>.html`, `assets/globe-scenes.js`, and `sitemap.xml`

## Add or edit a tour

1. Copy an existing file in `data/tours/` (for example `data/tours/japan.json` -> `data/tours/iceland.json`) or edit an existing JSON file.
2. Add any new destination cities to `data/cities.json`.
3. Run the build:
   ```powershell
   npm run build
   ```
4. Commit and push to `main`:
   ```powershell
   git add . && git commit -m "Update tours" && git push origin main
   ```

## Upgrading later

- **Git-based Admin UI (Pages CMS / Sveltia CMS):** add a single config file mapping `data/site.json` and `data/tours/*.json` fields to a browser form, plus a GitHub Action running `node scripts/build.js` on push.
- **WordPress:** convert `templates/home.js` and `templates/tour.js` into `front-page.php` and `single-tour.php` (or fetch WP REST API inside `scripts/build.js` for headless WordPress).
