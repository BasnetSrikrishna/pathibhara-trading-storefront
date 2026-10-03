# Pathibhara Trading storefront

Customer shop website for Pathibhara Trading, an Asian grocery in Chiryu, Aichi. The catalog contains 732 items with prices, SKUs, and stock from the October 3, 2026 Square export.

## GitHub Pages

The included workflow publishes the repository root to GitHub Pages when the main branch changes. Enable it in **Settings → Pages → Build and deployment → Source → GitHub Actions**. Product browsing, categories, language selection, search, and the shopping cart run on the static site.

## Square Checkout

GitHub Pages cannot run the Node server. To enable Square payments, deploy server.mjs on a Node-capable host and set SQUARE_ACCESS_TOKEN, SQUARE_LOCATION_ID, SQUARE_ENVIRONMENT, and SQUARE_ALLOWED_ORIGINS as private host variables. Set SQUARE_ALLOWED_ORIGINS to the exact GitHub Pages origin, then set window.PATHIBHARA_API_BASE in config.js to the deployed server origin. Never add Square credentials to this repository or config.js. Checkout remains disabled until the server reports that Square is ready.

## Photos and descriptions

Descriptions are short customer-facing summaries based on the product name and category; check the package for ingredients, preparation, and storage information. Product photos link to Ambika Japan’s public catalog. There are exact name/size photo matches for 74 items; the remaining catalog items use representative category photos. The stock values are an export snapshot, so please call the store to confirm availability.
