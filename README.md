# Pathibhara Trading storefront

The customer storefront and shopping cart run from `index.html`. It includes 732 products with prices and stock; SKU values remain in the catalog data for store reference and are not shown to shoppers. Square Checkout uses `server.mjs`; its access token is never sent to the browser.

## Square setup

1. Set up an active Square seller account for Japan and enable online checkout.
2. Copy `.env.example` to `.env` for local use, or set the same values as private environment variables on your host:
   - `SQUARE_ENVIRONMENT=sandbox` for payment testing; use `production` only after sandbox review.
   - `SQUARE_ACCESS_TOKEN` from the Square Developer Dashboard.
   - `SQUARE_LOCATION_ID` for the store.
3. Start the site with `npm start` and open `http://localhost:3000`.
4. Confirm card, Apple Pay, and Google Pay availability in the Square account before enabling live payments. Checkout is hosted by Square; payment methods are controlled by account eligibility and settings.

Never publish the access token or put it into `index.html`. Square sends buyers to its hosted checkout page. Product lines use the Square catalog tokens from the supplied export; Square applies the catalog's item settings at checkout. The storefront's displayed stock is the export snapshot and is not a live inventory feed.

## GitHub Pages

The included workflow publishes the repository root to GitHub Pages when `main` changes. In repository settings, set **Pages → Build and deployment → Source** to **GitHub Actions**. The catalog, photos, descriptions, language selector, category filters, and shopping cart are static website features.

## Square Checkout on GitHub Pages

GitHub Pages cannot run the Node server. To enable Square checkout, deploy `server.mjs` on a Node-capable host, set `SQUARE_ACCESS_TOKEN`, `SQUARE_LOCATION_ID`, and `SQUARE_ENVIRONMENT` as private host variables, and set `SQUARE_ALLOWED_ORIGINS` to the exact GitHub Pages site origin. Then put the deployed server origin into `config.js` as `window.PATHIBHARA_API_BASE`. Never place Square credentials in this repository or in `config.js`. Checkout stays disabled until the server reports that it is ready.

The displayed stock is the catalog export snapshot from October 3, 2026; call the store to confirm current availability. Verified exact name/size matches use the product photo from Ambika Japan and link to that product listing (74 items). Items without a verified photo use a category illustration instead of an unrelated product package image. Descriptions are brief summaries based on product names and categories; refer to the package for ingredients and preparation details.

## Live Square inventory

The server exposes `/api/inventory` and reads current `IN_STOCK` quantities from Square for the catalog variation IDs in the product list. It requires the Square access token to have `INVENTORY_READ` permission and the store's `SQUARE_LOCATION_ID`. The storefront refreshes Square quantities when a customer opens the page and every 60 seconds while it stays open. Products Square does not track continue to show the imported catalog snapshot. Only stock quantities are synchronized; this does not change catalog prices or product details.

The website is on GitHub Pages, which cannot run the Node server. Deploy `server.mjs` to a Node-capable host, add `SQUARE_ACCESS_TOKEN`, `SQUARE_LOCATION_ID`, `SQUARE_ENVIRONMENT`, and `SQUARE_ALLOWED_ORIGINS` as private host variables, and then set the server's public origin in `config.js`. Never put a Square token in `config.js`, `index.html`, or a public commit. Start with Square sandbox credentials and use a production token only in the host's private settings after confirming the inventory mapping.

## Delivery orders

Customers can enter their delivery address, house/building name, room number, and preferred payment at delivery. **Copy order & call the store** copies the full cart and contact details, then opens a phone call to 0566-95-2921 so the customer can confirm availability, delivery, and the total. The site does not store or automatically transmit customer details.
