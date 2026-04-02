/**
 * Server-side Pylon (Observer) API client.
 * @see https://app.getpylon.com/docs/api — token must stay on the server (Bearer auth).
 */
const PYLON_BASE = 'https://api.getpylon.com';

function jsonHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.api+json',
    'Content-Type': 'application/vnd.api+json',
  };
}

function parseMarketingPayload(raw) {
  if (raw == null || raw === '') return {};
  if (typeof raw === 'object' && !Array.isArray(raw)) return raw;
  try {
    return JSON.parse(String(raw));
  } catch {
    return {};
  }
}

/**
 * Resolve [longitude, latitude] for Pylon site_location.
 * Uses lead payload / marketing JSON, or Nominatim (AU) for suburb + country.
 */
export async function resolveSiteLocation(lead) {
  const extra = parseMarketingPayload(lead.marketing_payload_json);

  const lon =
    Number(extra.longitude ?? extra.lng ?? extra.site_lng ?? extra.site_longitude);
  const lat =
    Number(extra.latitude ?? extra.lat ?? extra.site_lat ?? extra.site_latitude);

  if (Number.isFinite(lon) && Number.isFinite(lat)) {
    return [lon, lat];
  }

  const suburb = String(lead.suburb || extra.suburb || '').trim();
  const country = String(
    process.env.PYLON_DEFAULT_COUNTRY || extra.country || 'Australia',
  ).trim();

  const query = suburb ? `${suburb}, ${country}` : country;
  if (!query || query === 'Australia') {
    const err = new Error(
      'Add a suburb on the lead (or lat/lng in marketing payload) so the site location can be resolved.',
    );
    err.statusCode = 400;
    throw err;
  }

  const q = encodeURIComponent(query);
  const url = `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1&countrycodes=au`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': process.env.NOMINATIM_USER_AGENT || 'XVRYTHNG/1.0 (Pylon lead sync)',
    },
  });
  if (!res.ok) {
    const err = new Error('Geocoding failed; try adding coordinates to the lead payload.');
    err.statusCode = 502;
    throw err;
  }
  const arr = await res.json();
  const hit = Array.isArray(arr) && arr[0];
  if (!hit || hit.lon == null || hit.lat == null) {
    const err = new Error(
      `Could not geocode "${query}". Set latitude/longitude on the lead or use a fuller address.`,
    );
    err.statusCode = 400;
    throw err;
  }
  return [Number(hit.lon), Number(hit.lat)];
}

export function buildSiteAddress(lead) {
  const extra = parseMarketingPayload(lead.marketing_payload_json);
  const suburb = String(lead.suburb || extra.suburb || '').trim();
  const line1 =
    String(extra.address_line1 || extra.line1 || extra.street || '').trim() ||
    (suburb ? `${suburb}` : 'Address to be confirmed');
  const city = String(extra.city || extra.suburb || lead.suburb || '').trim() || suburb || '—';
  const state = String(
    extra.state || process.env.PYLON_DEFAULT_STATE || 'Victoria',
  ).trim();
  const zip = String(extra.zip || extra.postcode || process.env.PYLON_DEFAULT_POSTCODE || '3000').trim();

  return {
    line1,
    line2: String(extra.address_line2 || extra.line2 || '').trim(),
    city,
    state,
    zip,
    country: String(extra.country || process.env.PYLON_DEFAULT_COUNTRY || 'Australia').trim(),
  };
}

export function buildCustomerDetails(lead) {
  return {
    name: String(lead.customer_name || 'Customer').trim(),
    phone: lead.phone ? String(lead.phone).trim() : '',
    email: lead.email ? String(lead.email).trim() : '',
  };
}

export async function createSolarProject(token, { referenceNumber, siteLocation, siteAddress, customerDetails }) {
  const body = {
    data: {
      type: 'solar_projects',
      attributes: {
        reference_number: referenceNumber,
        site_location: siteLocation,
        site_address: siteAddress,
        customer_details: customerDetails,
      },
    },
  };

  const res = await fetch(`${PYLON_BASE}/v1/solar_projects`, {
    method: 'POST',
    headers: jsonHeaders(token),
    body: JSON.stringify(body),
  });

  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    const err = new Error(`Pylon API error (${res.status}): ${text.slice(0, 200)}`);
    err.statusCode = res.status >= 400 && res.status < 600 ? res.status : 502;
    throw err;
  }

  if (!res.ok) {
    const title = json?.title || json?.errors?.[0]?.title || json?.message;
    const detail = json?.errors?.[0]?.detail || json?.detail;
    const msg = [title, detail].filter(Boolean).join(' — ') || `Pylon error (${res.status})`;
    const err = new Error(msg);
    err.statusCode = res.status;
    err.pylonBody = json;
    throw err;
  }

  return json?.data ?? null;
}

/**
 * List designs for a project; fields[solar_designs] is required by Pylon for this resource.
 */
export async function listSolarDesignsForProject(token, projectId) {
  const params = new URLSearchParams();
  params.set('filter[project]', projectId);
  params.set('fields[solar_designs]', 'summary,is_primary,title');

  const res = await fetch(`${PYLON_BASE}/v1/solar_designs?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.api+json',
    },
  });

  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    const err = new Error(`Pylon solar_designs error (${res.status})`);
    err.statusCode = 502;
    throw err;
  }

  if (!res.ok) {
    const err = new Error(json?.title || json?.errors?.[0]?.detail || `Pylon error (${res.status})`);
    err.statusCode = res.status;
    throw err;
  }

  return Array.isArray(json?.data) ? json.data : [];
}

export function libraryUrlForProject(projectId) {
  return `https://app.getpylon.com/library/${encodeURIComponent(projectId)}`;
}

/**
 * Pick web proposal URL from design resources (primary first).
 */
export function pickProposalUrlFromDesigns(designRows) {
  if (!designRows?.length) return null;
  const primary = designRows.find((d) => d?.attributes?.is_primary);
  const ordered = primary ? [primary, ...designRows.filter((d) => d !== primary)] : designRows;
  for (const row of ordered) {
    const url = row?.attributes?.summary?.web_proposal_url;
    if (url) return url;
  }
  return null;
}
