import React, { useMemo } from 'react';

/**
 * Tab content for "SolarQuotes Notes".
 * Displays specific fields from the marketing_payload_json if available.
 */
export default function LeadDetailSolarQuotes({ lead }) {
    // Safe parsing of marketing_payload_json
    const sqData = useMemo(() => {
        if (!lead?.marketing_payload_json) return null;
        try {
            return typeof lead.marketing_payload_json === 'string'
                ? JSON.parse(lead.marketing_payload_json)
                : lead.marketing_payload_json;
        } catch {
            return null;
        }
    }, [lead]);

    if (!sqData) {
        return (
            <div className="lead-detail-empty">
                <p>No SolarQuotes data found for this lead.</p>
            </div>
        );
    }

    // Fields to display
    // Mapped from parsed XML in backend service:
    // consolidatedNotes was constructed there, but we can also show raw fields if preferred.
    // The user asked for "Important Notes, Features, Original Roof Type".

    // Note: 'mappedRoofType' and 'consolidatedNotes' are top-level keys in our custom payload structure.
    // Other fields are direct children of the lead object (lowercase or camelCase depending on XML parser).

    // Helper to safely get value case-insensitive
    const getValue = (key) => {
        const k = key.toLowerCase();
        const match = Object.keys(sqData).find(pk => pk.toLowerCase() === k);
        return match ? sqData[match] : null;
    };

    const importantNotes = getValue('importantNotes') || getValue('important_notes') || getValue('leadNotes');
    const features = getValue('features');
    const roofTypeRaw = getValue('roofType') || getValue('roof_type') || getValue('roof'); // The RAW one
    const mappedRoof = sqData.mappedRoofType; // The one we computed
    const comments = getValue('comments');
    const stories = getValue('stories') || getValue('storeys');
    const battery = getValue('battery') || getValue('have_battery');
    const billAmount = getValue('billAmount') || getValue('electricity_bill');

    return (
        <div className="lead-detail-section">
            <h3 className="lead-detail-subtitle">SolarQuotes Details</h3>
            <div className="lead-detail-grid">

                <div className="lead-detail-field full-width">
                    <label style={{ fontWeight: 'bold' }}>Important Notes:</label>
                    <div className="lead-detail-value-box">
                        {importantNotes || '-'}
                    </div>
                </div>

                <div className="lead-detail-field full-width">
                    <label style={{ fontWeight: 'bold' }}>Comments:</label>
                    <div className="lead-detail-value-box">
                        {comments || '-'}
                    </div>
                </div>

                <div className="lead-detail-field">
                    <label style={{ fontWeight: 'bold' }}>Features:</label>
                    <div className="lead-detail-value">
                        {features || '-'}
                    </div>
                </div>

                <div className="lead-detail-field">
                    <label style={{ fontWeight: 'bold' }}>Battery Requested:</label>
                    <div className="lead-detail-value">
                        {battery || '-'}
                    </div>
                </div>

                <div className="lead-detail-field">
                    <label style={{ fontWeight: 'bold' }}>Original Roof Type:</label>
                    <div className="lead-detail-value">
                        {roofTypeRaw || '-'}
                    </div>
                </div>

                <div className="lead-detail-field">
                    <label style={{ fontWeight: 'bold' }}>Mapped Roof Type:</label>
                    <div className="lead-detail-value">
                        {mappedRoof || '-'}
                    </div>
                </div>

                <div className="lead-detail-field">
                    <label style={{ fontWeight: 'bold' }}>Storeys:</label>
                    <div className="lead-detail-value">
                        {stories || '-'}
                    </div>
                </div>

                <div className="lead-detail-field">
                    <label style={{ fontWeight: 'bold' }}>Bill Amount:</label>
                    <div className="lead-detail-value">
                        {billAmount || '-'}
                    </div>
                </div>

            </div>

            {/* Fallback to show full raw data if debugging/needed */}
            <details style={{ marginTop: '20px', borderTop: '1px solid #eee', paddingTop: '10px' }}>
                <summary style={{ cursor: 'pointer', color: '#6b7280', fontSize: '0.875rem' }}>View Full Raw Payload</summary>
                <pre style={{
                    background: '#f9fafb',
                    padding: '10px',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    overflow: 'auto',
                    marginTop: '10px'
                }}>
                    {JSON.stringify(sqData, null, 2)}
                </pre>
            </details>
        </div>
    );
}
