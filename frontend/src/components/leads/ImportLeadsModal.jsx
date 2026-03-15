
import React, { useState, useMemo } from 'react';
import Papa from 'papaparse';
import { Upload, AlertCircle, CheckCircle, X } from 'lucide-react';
import { importLeads } from '../../services/api';
import './ImportLeadsModal.css';

const REQUIRED_FIELDS = [
    { key: 'customer_name', label: 'Customer Name', required: true },
    { key: 'email', label: 'Email', required: true },
    { key: 'phone', label: 'Phone', required: true },
];

const OPTIONAL_FIELDS = [
    { key: 'suburb', label: 'Suburb' },
    { key: 'system_size_kw', label: 'System Size (kW)', type: 'number' },
    { key: 'value_amount', label: 'Value Amount ($)', type: 'number' },
    { key: 'stage', label: 'Stage' },
    { key: 'source', label: 'Source' },
    { key: 'site_inspection_date', label: 'Inspection Date' },
];

const ALL_FIELDS = [...REQUIRED_FIELDS, ...OPTIONAL_FIELDS];

export default function ImportLeadsModal({ onClose, onSuccess, onError }) {
    const [step, setStep] = useState(1); // 1: Upload, 2: Map, 3: Preview, 4: Result
    const [file, setFile] = useState(null);
    const [csvData, setCsvData] = useState([]);
    const [headers, setHeaders] = useState([]);
    const [mapping, setMapping] = useState({});
    const [importing, setImporting] = useState(false);
    const [result, setResult] = useState(null);

    // Parse CSV on file selection
    const handleFileChange = (e) => {
        const selected = e.target.files[0];
        if (selected) {
            setFile(selected);
            Papa.parse(selected, {
                header: true,
                skipEmptyLines: true,
                complete: (results) => {
                    setHeaders(results.meta.fields || []);
                    setCsvData(results.data);

                    // Auto-map based on similar names
                    const initialMapping = {};
                    (results.meta.fields || []).forEach(h => {
                        const normalized = h.toLowerCase().replace(/[^a-z0-9]/g, '');
                        const match = ALL_FIELDS.find(f => {
                            const fNorm = f.label.toLowerCase().replace(/[^a-z0-9]/g, '');
                            return normalized.includes(fNorm) || fNorm.includes(normalized);
                        });
                        if (match) {
                            initialMapping[match.key] = h;
                        }
                    });
                    setMapping(initialMapping);
                    setStep(2);
                },
                error: (err) => {
                    if (onError) onError('Failed to parse CSV: ' + err.message);
                    else alert('Failed to parse CSV: ' + err.message);
                }
            });
        }
    };

    const handleMapChange = (fieldKey, header) => {
        setMapping(prev => ({ ...prev, [fieldKey]: header }));
    };

    // Validate data based on mapping
    const validationResult = useMemo(() => {
        if (step < 3) return { validCount: 0, invalidCount: 0, errors: [] };

        const errors = [];
        let validCount = 0;

        csvData.forEach((row, index) => {
            const rowErrors = [];
            const rowData = {};

            ALL_FIELDS.forEach(field => {
                const header = mapping[field.key];
                const value = header ? row[header] : undefined;

                if (field.required) {
                    if (!value || String(value).trim() === '') {
                        rowErrors.push(`${field.label} is missing`);
                    } else if (field.type === 'number') {
                        if (isNaN(Number(value)) || Number(value) < 0) {
                            rowErrors.push(`${field.label} must be a valid number`);
                        }
                    }
                } else if (field.type === 'number' && value && String(value).trim() !== '') {
                    // Validate optional numeric fields if provided
                    if (isNaN(Number(value)) || Number(value) < 0) {
                        rowErrors.push(`${field.label} must be a valid number`);
                    }
                }
                // Email validation (simple check)
                if (field.key === 'email' && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
                    rowErrors.push('Invalid email format');
                }
            });

            if (rowErrors.length > 0) {
                errors.push({ row: index + 1, errors: rowErrors });
            } else {
                validCount++;
            }
        });

        return { validCount, invalidCount: errors.length, errors };
    }, [csvData, mapping, step]);

    const handleImport = async () => {
        if (validationResult.validCount === 0) {
            if (onError) onError('No valid rows to import.');
            else alert("No valid rows to import.");
            return;
        }

        setImporting(true);

        // Prepare payload
        const leadsToImport = csvData.map(row => {
            const lead = {};
            ALL_FIELDS.forEach(field => {
                const header = mapping[field.key];
                if (header && row[header] !== undefined) {
                    let val = row[header];
                    if (field.type === 'number') val = Number(val);
                    lead[field.key] = val;
                }
            });
            // Default stage if missing
            if (!lead.stage) lead.stage = 'new';
            return lead;
        }).filter((lead, index) => {
            // Simple filter strictly based on our local validation logic for now, 
            // OR better: send all and let backend handle/report.
            // User asked for "Validation errors shown for invalid rows" BEFORE import (preview).
            // So we should filter out known bad ones locally OR ask user confirmation.
            // The Prompt implies we might filter. 
            // Let's filter out the ones we KNOW are bad to save backend processing, 
            // matching the "Preview of data before import" requirement.

            const rowErrors = validationResult.errors.find(e => e.row === index + 1);
            return !rowErrors;
        });

        try {
            const resp = await importLeads(leadsToImport);
            setResult(resp.data); // { imported, failed, errors }
            setStep(4);
            if (onSuccess) onSuccess(resp.data);
        } catch (err) {
            if (onError) onError(err?.message ?? 'Import failed');
            else alert(err?.message ?? 'Import failed');
        } finally {
            setImporting(false);
        }
    };

    const renderStep1 = () => (
        <div className="import-leads-upload-area">
            <Upload className="import-leads-upload-icon" />
            <p className="import-leads-upload-title">Upload CSV File</p>
            <p className="import-leads-upload-subtitle">Drag and drop or click to select</p>
            <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="import-leads-file-input"
            />
        </div>
    );

    const renderStep2 = () => (
        <div>
            <h3 className="import-leads-mapping-title">Map Columns</h3>
            <p className="import-leads-mapping-subtitle">Match your CSV columns to Lead fields.</p>

            <div className="import-leads-mapping-header">
                <div>Lead Field</div>
                <div>CSV Column</div>
            </div>

            <div className="import-leads-mapping-list">
                {ALL_FIELDS.map(field => (
                    <div key={field.key} className="import-leads-mapping-row">
                        <div className="import-leads-field-label">
                            <span>{field.label}</span>
                            {field.required && <span className="import-leads-field-required">*</span>}
                        </div>
                        <select
                            className="import-leads-select"
                            value={mapping[field.key] || ''}
                            onChange={(e) => handleMapChange(field.key, e.target.value)}
                        >
                            <option value="">-- Ignore --</option>
                            {headers.map(h => (
                                <option key={h} value={h}>{h}</option>
                            ))}
                        </select>
                    </div>
                ))}
            </div>

            <div className="import-leads-actions">
                <button onClick={() => setStep(1)} className="import-leads-btn import-leads-btn-secondary">Back</button>
                <button
                    onClick={() => setStep(3)}
                    className="import-leads-btn import-leads-btn-primary"
                    disabled={REQUIRED_FIELDS.some(f => !mapping[f.key])}
                >
                    Next: Preview
                </button>
            </div>
        </div>
    );

    const renderStep3 = () => (
        <div>
            <div className="import-leads-preview-header">
                <h3 className="import-leads-preview-title">Preview & Validate</h3>
                <div className="import-leads-preview-stats">
                    <span className="import-leads-stat-valid">{validationResult.validCount} Valid rows</span>
                    <span className="import-leads-stat-invalid">{validationResult.invalidCount} Invalid rows</span>
                </div>
            </div>

            <div className="import-leads-preview-table-container">
                <div className="import-leads-preview-table-wrapper">
                    <table className="import-leads-preview-table">
                        <thead>
                            <tr>
                                <th scope="col">Row</th>
                                {ALL_FIELDS.map(f => (
                                    mapping[f.key] && (
                                        <th key={f.key} scope="col">
                                            {f.label}
                                        </th>
                                    )
                                ))}
                                <th scope="col">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {csvData.slice(0, 10).map((row, idx) => {
                                const rowErr = validationResult.errors.find(e => e.row === idx + 1);
                                return (
                                    <tr key={idx} className={rowErr ? 'import-leads-row-invalid' : ''}>
                                        <td className="import-leads-row-number">{idx + 1}</td>
                                        {ALL_FIELDS.map(f => (
                                            mapping[f.key] && (
                                                <td key={f.key}>
                                                    {row[mapping[f.key]]}
                                                </td>
                                            )
                                        ))}
                                        <td>
                                            {rowErr ? (
                                                <div className="import-leads-status-cell import-leads-status-invalid">
                                                    <AlertCircle className="import-leads-status-icon" />
                                                    Invalid
                                                </div>
                                            ) : (
                                                <div className="import-leads-status-cell import-leads-status-valid">
                                                    <CheckCircle className="import-leads-status-icon" />
                                                    Valid
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    {csvData.length > 10 && (
                        <div className="import-leads-preview-more">
                            ...and {csvData.length - 10} more rows
                        </div>
                    )}
                </div>
            </div>

            {validationResult.errors.length > 0 && (
                <div className="import-leads-errors-container">
                    <h4 className="import-leads-errors-title">Validation Errors (First 10)</h4>
                    <ul className="import-leads-errors-list">
                        {validationResult.errors.slice(0, 10).map((e, i) => (
                            <li key={i}>Row {e.row}: {e.errors.join(', ')}</li>
                        ))}
                    </ul>
                </div>
            )}

            <div className="import-leads-actions">
                <button onClick={() => setStep(2)} className="import-leads-btn import-leads-btn-secondary">Back</button>
                <button
                    onClick={handleImport}
                    className="import-leads-btn import-leads-btn-primary"
                    disabled={importing || validationResult.validCount === 0}
                >
                    {importing ? 'Importing...' : `Import ${validationResult.validCount} leads`}
                </button>
            </div>
        </div>
    );

    const renderStep4 = () => (
        <div className="import-leads-result-container">
            {result.failed === 0 ? (
                <CheckCircle className="import-leads-result-icon success" />
            ) : (
                <AlertCircle className="import-leads-result-icon warning" />
            )}
            <h3 className="import-leads-result-title">Import Complete</h3>
            <p className="import-leads-result-message">
                Successfully imported <strong className="success">{result.imported}</strong> leads.
                <br />
                <strong className="error">{result.failed}</strong> records failed.
            </p>

            {result.errors && result.errors.length > 0 && (
                <div className="import-leads-result-errors">
                    <h4 className="import-leads-result-errors-title">Error Details:</h4>
                    <ul className="import-leads-result-errors-list">
                        {result.errors.map((e, idx) => (
                            <li key={idx}>Row {e.row}: {e.error}</li>
                        ))}
                    </ul>
                </div>
            )}

            <button
                onClick={onClose}
                className="import-leads-btn import-leads-btn-close"
            >
                Close
            </button>
        </div>
    );

    return (
        <div className="import-leads-modal-overlay">
            <div className="import-leads-modal-container">
                <div className="import-leads-modal-header">
                    <h2 className="import-leads-modal-title">Import Leads from CSV</h2>
                    <button onClick={onClose} className="import-leads-modal-close">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="import-leads-modal-body">
                    {step === 1 && renderStep1()}
                    {step === 2 && renderStep2()}
                    {step === 3 && renderStep3()}
                    {step === 4 && renderStep4()}
                </div>
            </div>
        </div>
    );
}
