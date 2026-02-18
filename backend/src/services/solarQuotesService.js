// Node.js 18+ has built-in fetch, so no external import is needed.
import { XMLParser } from 'fast-xml-parser';
import crypto from 'crypto';
import db from '../config/db.js';
import * as leadService from './leadService.js';

function md5(string) {
    return crypto.createHash('md5').update(string).digest('hex');
}

// Fuzzy helper to find value by partial key match (case-insensitive, ignoring spacing/underscores)
function getValueFuzzy(obj, patterns) {
    if (!obj) return '';
    const keys = Object.keys(obj);
    for (const pattern of patterns) {
        const cleanPattern = pattern.toLowerCase().replace(/[^a-z0-9]/g, '');
        for (const key of keys) {
            const cleanKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
            if (cleanKey === cleanPattern || cleanKey.includes(cleanPattern)) {
                const val = obj[key];
                if (val && typeof val === 'string') return val.trim();
                if (val && typeof val === 'number') return String(val);
            }
        }
    }
    return '';
}

function mapRoofType(raw) {
    if (!raw) return null;
    const lower = raw.toLowerCase();
    if (lower.includes('tin') || lower.includes('colorbond') || lower.includes('colourbond')) {
        return lower.includes('klip') ? 'Tin (Kliplock)' : 'Tin (Colorbond)';
    }
    if (lower.includes('tile')) {
        return lower.includes('terracotta') ? 'Tile (Terracotta)' : 'Tile (Concrete)';
    }
    if (lower.includes('flat')) return 'Flat';
    return 'Other';
}

export async function syncSolarQuotesLeads(startDateParam, endDateParam) {
    const now = new Date();
    const start = new Date(now);
    start.setDate(now.getDate() - 7);

    const end = new Date(now);
    end.setDate(now.getDate() + 1);

    const startDate = startDateParam || start.toISOString().split('T')[0];
    const endDate = endDateParam || end.toISOString().split('T')[0];

    console.log(`[SolarQuotes] Fetching leads from ${startDate} to ${endDate}`);

    const login = "S730015";
    const passwordRaw = "Xtechs13245!";
    const passwordHash = md5(passwordRaw);

    const xmlPayload = `<?xml version='1.0'?>
<request>
 <login>${login}</login>
 <password>${passwordHash}</password>
 <startDate>${startDate}</startDate>
 <endDate>${endDate}</endDate>
</request>`;

    const response = await fetch('https://www.solarquotes.com.au/webservice/supplier/SupplierService.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'text/xml',
        },
        body: xmlPayload,
    });

    const responseText = await response.text();
    console.log(`[SolarQuotes] Response length: ${responseText.length}`);

    const parser = new XMLParser();
    const parsed = parser.parse(responseText);

    let leads = [];
    if (parsed?.response?.leads?.lead) {
        const rawLeads = parsed.response.leads.lead;
        leads = Array.isArray(rawLeads) ? rawLeads : [rawLeads];
    } else if (parsed?.leads?.lead) {
        leads = Array.isArray(parsed.leads.lead) ? parsed.leads.lead : [parsed.leads.lead];
    } else if (parsed?.result?.lead) {
        const rawLeads = parsed.result.lead;
        leads = Array.isArray(rawLeads) ? rawLeads : [rawLeads];
    } else if (parsed?.response?.result?.lead) {
        const rawLeads = parsed.response.result.lead;
        leads = Array.isArray(rawLeads) ? rawLeads : [rawLeads];
    }

    console.log(`[SolarQuotes] Found ${leads.length} leads to process`);
    const results = [];

    for (const lead of leads) {
        const leadId = getValueFuzzy(lead, ['id', 'leadid', 'lead_id']);
        if (!leadId) continue;

        try {
            // Check if already exists
            const [existing] = await db.execute('SELECT id FROM leads WHERE external_id = ? LIMIT 1', [leadId]);
            if (existing && existing.length > 0) {
                results.push({ leadId, status: 'skipped', message: 'Already imported' });
                continue;
            }

            const firstName = getValueFuzzy(lead, ['name', 'firstName', 'firstname']);
            const lastName = getValueFuzzy(lead, ['lastName', 'lastname']);
            const fullName = `${firstName} ${lastName}`.trim() || 'Unknown Customer';
            const email = getValueFuzzy(lead, ['email']);
            const phone = getValueFuzzy(lead, ['phone']);

            const addressParts = [];
            const addr = getValueFuzzy(lead, ['address']);
            const suburb = getValueFuzzy(lead, ['suburb']);
            const state = getValueFuzzy(lead, ['state']);
            const postcode = getValueFuzzy(lead, ['postcode']);

            if (addr) addressParts.push(addr);
            if (suburb) addressParts.push(suburb);
            if (state) addressParts.push(state);
            if (postcode) addressParts.push(postcode);
            const address = addressParts.join(', ');

            const comments = getValueFuzzy(lead, ['comments', 'comment']);
            const importantNotes = getValueFuzzy(lead, ['importantnotes', 'important_notes', 'anythingelse', 'anything_else', 'leadnotes', 'lead_notes', 'anything']);
            const systemSize = getValueFuzzy(lead, ['systemsize', 'system_size', 'size']);
            const rawRoofType = getValueFuzzy(lead, ['rooftype', 'roof_type', 'type_of_roof', 'typeofroof', 'roofmaterial', 'roof_material', 'roof']);
            const mappedRoofType = mapRoofType(rawRoofType);
            const stories = getValueFuzzy(lead, ['stories', 'storeys', 'house_storey', 'housestorey', 'storiescount', 'floors', 'how_many_storeys', 'howmanystoreys']);
            const battery = getValueFuzzy(lead, ['battery', 'have_battery', 'havebattery']);
            const features = getValueFuzzy(lead, ['features']);

            const consolidatedNotes = [
                comments ? `Comments: ${comments}` : '',
                importantNotes ? `Important Notes: ${importantNotes}` : '',
                features ? `Features: ${features}` : '',
                battery ? `Have Battery: ${battery}` : '',
                rawRoofType ? `Roof Type: ${rawRoofType}` : '',
                stories ? `Storeys: ${stories}` : '',
                address ? `Address: ${address}` : ''
            ].filter(Boolean).join('\n\n');

            const payload = {
                stage: 'new',
                customer_name: fullName,
                email: email,
                phone: phone,
                suburb: suburb,
                system_size_kw: parseFloat(systemSize) || null,
                value_amount: 0, // No value provided in SQ XML usually
                source: 'Solar Quotes',
                external_id: leadId,
                marketing_payload_json: {
                    ...lead,
                    consolidatedNotes,
                    mappedRoofType,
                    _imported_at: new Date().toISOString()
                }
            };

            const created = await leadService.createLead(payload);
            results.push({ leadId, status: 'imported', localId: created.id });

        } catch (e) {
            console.error(`[SolarQuotes] Failed to import lead ${leadId}`, e);
            results.push({ leadId, status: 'failed', error: e.message });
        }
    }

    return { count: leads.length, results };
}
