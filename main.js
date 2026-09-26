/*
 * The legacy ports deliberately publish small browser contracts on window.
 * Keeping their imports in one entry module makes that dependency order explicit
 * after Vite bundles the app for deployment.
 */
import './flashday-data.js';
import './flashday-store.js';
import './learning-entry.js';
import './word-lookup.js';
import './starter-catalog.js';
import './bespoke-engine.js';
import './bespoke-card-index.js';
import './source-capture.js';
import './transcript-import.js';
import './fsrs-scheduler.mjs';
import './bespoke-adapter.js';
import './immersion-engine.js';
import './flashday-product.js';
import './flashday-cloud.js';
import './app-bespoke.js';
import './learning-hub.js';
import './product-bootstrap.js';
