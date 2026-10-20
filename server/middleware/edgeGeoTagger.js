// server/middleware/edgeGeoTagger.js - Zero-Overhead Edge CDN Geolocation Tagging
/**
 * Ingests low-latency edge geolocation metadata from Vercel / Cloudflare edge proxies.
 * Completely eliminates slow and expensive third-party external geocoding API calls.
 */
export function edgeGeoTaggerMiddleware(req, res, next) {
  const vercelCountry = req.headers['x-vercel-ip-country'];
  const vercelCity = req.headers['x-vercel-ip-city'];
  const vercelLat = req.headers['x-vercel-ip-latitude'];
  const vercelLon = req.headers['x-vercel-ip-longitude'];
  const vercelRegion = req.headers['x-vercel-ip-country-region'];

  const cfCountry = req.headers['cf-ipcountry'];
  const cfLat = req.headers['cf-iplatitude'];
  const cfLon = req.headers['cf-iplongitude'];

  let geo = null;

  if (vercelCity || vercelCountry) {
    geo = {
      provider: 'Vercel Edge Network',
      country: vercelCountry ? decodeURIComponent(vercelCountry) : 'ID',
      city: vercelCity ? decodeURIComponent(vercelCity) : 'Jakarta',
      region: vercelRegion || 'DKI',
      latitude: vercelLat ? parseFloat(vercelLat) : -6.2088,
      longitude: vercelLon ? parseFloat(vercelLon) : 106.8456,
      isEdgeTagged: true
    };
  } else if (cfCountry || cfLat) {
    geo = {
      provider: 'Cloudflare Edge CDN',
      country: cfCountry || 'ID',
      city: 'Unknown (Edge)',
      region: '',
      latitude: cfLat ? parseFloat(cfLat) : -6.2088,
      longitude: cfLon ? parseFloat(cfLon) : 106.8456,
      isEdgeTagged: true
    };
  } else {
    // Default fallback (e.g., local test runner or direct connection)
    geo = {
      provider: 'Direct / Local Gateway',
      country: 'ID',
      city: 'Pusat Operasional BPJS Ketenagakerjaan',
      region: 'Jakarta',
      latitude: -6.2297,
      longitude: 106.8295,
      isEdgeTagged: false
    };
  }

  req.edgeGeo = geo;
  res.setHeader('X-Edge-Geo-Tagged', `${geo.city}, ${geo.country} (${geo.provider})`);

  next();
}

export default edgeGeoTaggerMiddleware;
