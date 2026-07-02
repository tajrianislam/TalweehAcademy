// Centralized media base path. Assets are self-hosted under public/wp-content/uploads
// (downloaded off the legacy WordPress CDN via server/scripts/download-media.js),
// so this resolves to a relative path served by Vite / the app — not the live site.
export const ASSET = '/wp-content/uploads'
export const THUMBS = `${ASSET}/elementor/thumbs`
