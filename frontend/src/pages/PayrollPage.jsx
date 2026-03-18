// src/pages/PayrollPage.jsx
import { useState, useEffect, useMemo } from 'react';
import { authFetchJSON, authFetch } from '../services/api.js';
import { formatCurrency, formatDate } from '../utils/formatters.js';

export default function PayrollPage() {
  const BRAND = useMemo(() => ({
    primary: '#1A7B7B',
    primaryHover: '#4DB8A8',
    primaryLight: '#E8F5F5',
    text: '#1A1A2E',
    sub: '#6B7280',
    muted: '#9CA3AF',
    border: '#E5E7EB',
    bg: '#F5F5F5',
    white: '#FFFFFF',
    success: '#16A34A',
    danger: '#DC2626',
  }), []);

  const [periodType, setPeriodType] = useState('monthly');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [payrollData, setPayrollData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [payrollRuns, setPayrollRuns] = useState([]);
  const [selectedRun, setSelectedRun] = useState(null);
  const [generatingPayslips, setGeneratingPayslips] = useState(new Set());
  const [emailingAll, setEmailingAll] = useState(false);
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [toast, setToast] = useState(null); // { type, msg }

  const num = (v, fallback = 0) => (v != null && !Number.isNaN(Number(v)) ? Number(v) : fallback);

  // Load payroll runs on mount
  useEffect(() => {
    loadPayrollRuns();
  }, []);

  const loadPayrollRuns = async () => {
    try {
      const response = await authFetchJSON('/api/employees/payroll/runs');
      setPayrollRuns(response.data);
    } catch (error) {
      console.error('Failed to load payroll runs:', error);
    }
  };

  const generatePayslip = async (employeeId) => {
    if (!selectedRun) return;

    setGeneratingPayslips(prev => new Set(prev).add(employeeId));

    try {
      // First generate the payslip
      await authFetchJSON(`/api/employees/payroll/runs/${selectedRun.id}/payslips/${employeeId}/generate`, {
        method: 'POST'
      });

      // Then download it
      const downloadResponse = await authFetch(`/api/employees/payroll/runs/${selectedRun.id}/payslips/${employeeId}/download`);
      if (downloadResponse.ok) {
        const blob = await downloadResponse.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `payslip_${employeeId}.pdf`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Failed to generate payslip:', error);
      setToast({ type: 'error', msg: error?.message || 'Failed to generate payslip' });
      window.setTimeout(() => setToast(null), 3500);
    } finally {
      setGeneratingPayslips(prev => {
        const newSet = new Set(prev);
        newSet.delete(employeeId);
        return newSet;
      });
    }
  };

  const generateAllPayslips = async () => {
    if (!selectedRun) return;
    setDownloadingAll(true);

    try {
      // Generate all payslips
      await authFetchJSON(`/api/employees/payroll/runs/${selectedRun.id}/payslips/generate-all`, {
        method: 'POST'
      });

      // Download the ZIP
      const downloadResponse = await authFetch(`/api/employees/payroll/runs/${selectedRun.id}/payslips/download-all`);
      if (downloadResponse.ok) {
        const blob = await downloadResponse.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `payslips_${selectedRun.id}.zip`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Failed to generate payslips:', error);
      setToast({ type: 'error', msg: error?.message || 'Failed to generate payslips' });
      window.setTimeout(() => setToast(null), 3500);
    } finally {
      setDownloadingAll(false);
    }
  };

  const emailAllPayslips = async () => {
    if (!selectedRun) return;
    setEmailingAll(true);
    try {
      const res = await authFetchJSON(`/api/employees/payroll/runs/${selectedRun.id}/payslips/email-all`, {
        method: 'POST',
      });
      setToast({ type: 'success', msg: `Payslips emailed. Sent: ${res?.data?.sent ?? 0}, Skipped: ${res?.data?.skipped ?? 0}, Failed: ${res?.data?.failed ?? 0}` });
      window.setTimeout(() => setToast(null), 3500);
    } catch (error) {
      console.error('Failed to email payslips:', error);
      setToast({ type: 'error', msg: error?.message || 'Failed to email payslips' });
      window.setTimeout(() => setToast(null), 3500);
    } finally {
      setEmailingAll(false);
    }
  };

  const loadPayrollRunDetails = async (runId) => {
    try {
      const response = await authFetchJSON(`/api/employees/payroll/runs/${runId}`);
      setSelectedRun(response.data);
    } catch (error) {
      console.error('Failed to load payroll run details:', error);
    }
  };
  useEffect(() => {
    const now = new Date();
    let start, end;

    if (periodType === 'weekly') {
      // Current week (Monday to Sunday)
      const monday = new Date(now);
      monday.setDate(now.getDate() - now.getDay() + 1);
      start = monday.toISOString().split('T')[0];

      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      end = sunday.toISOString().split('T')[0];
    } else if (periodType === 'fortnightly') {
      // Current fortnight
      const dayOfMonth = now.getDate();
      const fortnightStart = dayOfMonth <= 15 ? 1 : 16;
      start = new Date(now.getFullYear(), now.getMonth(), fortnightStart).toISOString().split('T')[0];

      const fortnightEnd = dayOfMonth <= 15 ? 15 : new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      end = new Date(now.getFullYear(), now.getMonth(), fortnightEnd).toISOString().split('T')[0];
    } else {
      // Current month
      start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    }

    setPeriodStart(start);
    setPeriodEnd(end);
  }, [periodType]);

  const calculatePayroll = async () => {
    if (!periodStart || !periodEnd) return;

    setLoading(true);
    try {
      const response = await authFetchJSON('/api/employees/payroll/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          periodStart,
          periodEnd,
          periodType
        })
      });

      setPayrollData(response.data);
    } catch (error) {
      console.error('Failed to calculate payroll:', error);
      setToast({ type: 'error', msg: error?.message || 'Failed to calculate payroll' });
      window.setTimeout(() => setToast(null), 3500);
    } finally {
      setLoading(false);
    }
  };

  const savePayrollRun = async () => {
    if (!payrollData) return;

    try {
      await authFetchJSON('/api/employees/payroll/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payrollData
        })
      });

      setToast({ type: 'success', msg: 'Payroll run saved successfully.' });
      window.setTimeout(() => setToast(null), 3500);
      // Reset form
      setPayrollData(null);
      loadPayrollRuns();
    } catch (error) {
      console.error('Failed to save payroll run:', error);
      setToast({ type: 'error', msg: error?.message || 'Failed to save payroll run' });
      window.setTimeout(() => setToast(null), 3500);
    }
  };

  const toggleRowExpansion = (employeeId) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(employeeId)) {
      newExpanded.delete(employeeId);
    } else {
      newExpanded.add(employeeId);
    }
    setExpandedRows(newExpanded);
  };

  return (
    <div style={{ padding: '20px 24px', background: BRAND.bg, minHeight: 'calc(100vh - 60px)' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{
          background: BRAND.white, border: `1px solid ${BRAND.border}`, borderRadius: 16,
          padding: '16px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
          boxShadow: '0 2px 8px rgba(26,123,123,0.05)',
        }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 900, color: BRAND.text }}>Payroll</div>
            <div style={{ fontSize: 13, color: BRAND.sub, marginTop: 2 }}>Calculate runs, generate payslips, and email employees</div>
          </div>
        </div>

        {toast && (
          <div style={{
            background: toast.type === 'success' ? '#DCFCE7' : '#FEE2E2',
            border: `1px solid ${toast.type === 'success' ? '#86EFAC' : '#FCA5A5'}`,
            color: toast.type === 'success' ? '#166534' : '#991B1B',
            borderRadius: 12, padding: '10px 14px', fontWeight: 700, fontSize: 13,
          }}>
            {toast.msg}
          </div>
        )}

      {/* Existing Payroll Runs */}
      <div style={{
        background: BRAND.white,
        padding: '18px',
        borderRadius: 16,
        border: `1px solid ${BRAND.border}`,
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
      }}>
        <h2 style={{ marginBottom: 8, color: BRAND.text, fontSize: 16 }}>Existing Payroll Runs</h2>
        <p style={{ margin: 0, marginBottom: 12, fontSize: 13, color: BRAND.sub }}>
          These are payrolls you&apos;ve already calculated and saved. To create a new run, choose a period below and click <strong>Calculate Payroll</strong>, then <strong>Save Payroll Run</strong>.
        </p>

        {payrollRuns.length === 0 ? (
          <div style={{ fontSize: 13, color: '#9CA3AF' }}>
            No payroll runs yet.
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <select
              value={selectedRun?.id || ''}
              onChange={(e) => {
                const runId = e.target.value;
                if (runId) {
                  loadPayrollRunDetails(runId);
                } else {
                  setSelectedRun(null);
                }
              }}
              style={{
                padding: '8px 12px',
                border: `1px solid ${BRAND.border}`,
                borderRadius: 10,
                fontSize: '14px',
                minWidth: '220px'
              }}
            >
              <option value="">Select a payroll run…</option>
              {payrollRuns.map(run => (
                <option key={run.id} value={run.id}>
                  {run.period_type} — {run.period_start} to {run.period_end} ({run.status})
                </option>
              ))}
            </select>

            {selectedRun && (
              <button
                onClick={generateAllPayslips}
                disabled={downloadingAll}
                style={{
                  padding: '8px 16px',
                  background: downloadingAll ? '#9CA3AF' : BRAND.success,
                  color: 'white',
                  border: 'none',
                  borderRadius: 10,
                  cursor: downloadingAll ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: 700
                }}
              >
              {downloadingAll ? 'Preparing…' : 'Generate Payslips (ZIP)'}
              </button>
            )}

            {selectedRun && (
              <button
                onClick={emailAllPayslips}
                disabled={emailingAll}
                style={{
                  padding: '8px 16px',
                  background: emailingAll ? '#9CA3AF' : BRAND.primary,
                  color: 'white',
                  border: 'none',
                  borderRadius: 10,
                  cursor: emailingAll ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: 800
                }}
              >
                {emailingAll ? 'Emailing…' : 'Email Payslips (All)'}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Period Selector */}
      <div style={{
        background: '#f9fafb',
        padding: '20px',
        borderRadius: '8px',
        marginBottom: '20px',
        border: '1px solid #e5e7eb'
      }}>
        <h2 style={{ marginBottom: '15px', color: '#374151' }}>Payroll Period</h2>

        <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
              Period Type
            </label>
            <select
              value={periodType}
              onChange={(e) => setPeriodType(e.target.value)}
              style={{
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px'
              }}
            >
              <option value="weekly">Weekly</option>
              <option value="fortnightly">Fortnightly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
              Start Date
            </label>
            <input
              type="date"
              value={periodStart}
              onChange={(e) => setPeriodStart(e.target.value)}
              style={{
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
              End Date
            </label>
            <input
              type="date"
              value={periodEnd}
              onChange={(e) => setPeriodEnd(e.target.value)}
              style={{
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px'
              }}
            />
          </div>

          <div style={{ alignSelf: 'flex-end' }}>
            <button
              onClick={calculatePayroll}
              disabled={loading}
              style={{
                padding: '8px 16px',
                background: '#146b6b',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              {loading ? 'Calculating...' : 'Calculate Payroll'}
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      {(payrollData || selectedRun) && (
        <>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '15px',
            marginBottom: '20px'
          }}>
            <div style={{
              background: '#f0f9ff',
              padding: '20px',
              borderRadius: '8px',
              border: '1px solid #0ea5e9',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#0ea5e9' }}>
                {formatCurrency((payrollData || selectedRun).total_payroll_amount || (payrollData || selectedRun).totalPayrollAmount)}
              </div>
              <div style={{ color: '#374151', marginTop: '5px' }}>Total Payroll</div>
            </div>

            <div style={{
              background: '#fef3c7',
              padding: '20px',
              borderRadius: '8px',
              border: '1px solid #f59e0b',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f59e0b' }}>
                {(payrollData || selectedRun).total_employees || (payrollData || selectedRun).totalEmployees}
              </div>
              <div style={{ color: '#374151', marginTop: '5px' }}>Employees</div>
            </div>

            <div style={{
              background: '#ecfdf5',
              padding: '20px',
              borderRadius: '8px',
              border: '1px solid #10b981',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#10b981' }}>
                {num((payrollData || selectedRun).total_hours ?? (payrollData || selectedRun).totalHours).toFixed(1)}h
              </div>
              <div style={{ color: '#374151', marginTop: '5px' }}>Total Hours</div>
            </div>

            <div style={{
              background: '#fef2f2',
              padding: '20px',
              borderRadius: '8px',
              border: '1px solid #ef4444',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ef4444' }}>
                {num((payrollData || selectedRun).overtime_hours ?? (payrollData || selectedRun).overtimeHours).toFixed(1)}h
              </div>
              <div style={{ color: '#374151', marginTop: '5px' }}>Overtime Hours</div>
            </div>
          </div>

          {/* Employee Table */}
          {((payrollData && payrollData.details) || (selectedRun && selectedRun.details)) && (
            <div style={{
              background: 'white',
              borderRadius: '8px',
              border: '1px solid #e5e7eb',
              overflow: 'hidden'
            }}>
              <div style={{
                padding: '20px',
                borderBottom: '1px solid #e5e7eb',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <h2 style={{ margin: 0, color: '#374151' }}>
                  {selectedRun ? 'Payroll Run Details' : 'Employee Payroll Details'}
                </h2>
                {payrollData && !selectedRun && (
                  <button
                    onClick={savePayrollRun}
                    disabled={loading}
                    style={{
                      padding: '8px 16px',
                      background: loading ? '#9CA3AF' : BRAND.primary,
                      color: 'white',
                      border: 'none',
                      borderRadius: 10,
                      cursor: loading ? 'not-allowed' : 'pointer',
                      fontSize: '14px',
                      fontWeight: 800
                    }}
                  >
                    {loading ? 'Saving…' : 'Save Payroll Run'}
                  </button>
                )}
              </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f9fafb' }}>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb', fontWeight: '600' }}>Employee</th>
                    <th style={{ padding: '12px', textAlign: 'right', borderBottom: '1px solid #e5e7eb', fontWeight: '600' }}>Hours</th>
                    <th style={{ padding: '12px', textAlign: 'right', borderBottom: '1px solid #e5e7eb', fontWeight: '600' }}>Overtime</th>
                    <th style={{ padding: '12px', textAlign: 'right', borderBottom: '1px solid #e5e7eb', fontWeight: '600' }}>Rate</th>
                    <th style={{ padding: '12px', textAlign: 'right', borderBottom: '1px solid #e5e7eb', fontWeight: '600' }}>Gross Pay</th>
                    <th style={{ padding: '12px', textAlign: 'right', borderBottom: '1px solid #e5e7eb', fontWeight: '600' }}>Deductions</th>
                    <th style={{ padding: '12px', textAlign: 'right', borderBottom: '1px solid #e5e7eb', fontWeight: '600' }}>Net Pay</th>
                    <th style={{ padding: '12px', textAlign: 'center', borderBottom: '1px solid #e5e7eb', fontWeight: '600' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(selectedRun ? selectedRun.details : payrollData?.details || []).map((employee) => (
                    <>
                      <tr key={employee.employee_id || employee.employeeId} style={{ borderBottom: '1px solid #f3f4f6' }}>
                        <td style={{ padding: '12px', fontWeight: '500' }}>
                          {employee.employee_name || employee.employeeName || `${employee.first_name} ${employee.last_name}`}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'right' }}>{num(employee.regular_hours ?? employee.regularHours).toFixed(1)}h</td>
                        <td style={{ padding: '12px', textAlign: 'right' }}>{num(employee.overtime_hours ?? employee.overtimeHours).toFixed(1)}h</td>
                        <td style={{ padding: '12px', textAlign: 'right' }}>{formatCurrency(employee.hourly_rate || employee.hourlyRate)}</td>
                        <td style={{ padding: '12px', textAlign: 'right' }}>{formatCurrency(employee.gross_pay || employee.grossPay)}</td>
                        <td style={{ padding: '12px', textAlign: 'right' }}>{formatCurrency(employee.deductions)}</td>
                        <td style={{ padding: '12px', textAlign: 'right', fontWeight: '600' }}>{formatCurrency(employee.net_pay || employee.netPay)}</td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '5px', justifyContent: 'center' }}>
                            <button
                              onClick={() => toggleRowExpansion(employee.employee_id || employee.employeeId)}
                              style={{
                                padding: '4px 8px',
                                background: '#f3f4f6',
                                border: '1px solid #d1d5db',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '12px'
                              }}
                            >
                              {expandedRows.has(employee.employee_id || employee.employeeId) ? 'Collapse' : 'Expand'}
                            </button>
                            {selectedRun && (
                              <button
                                onClick={() => generatePayslip(employee.employee_id || employee.employeeId)}
                                disabled={generatingPayslips.has(employee.employee_id || employee.employeeId)}
                                style={{
                                  padding: '4px 8px',
                                  background: '#3b82f6',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '4px',
                                  cursor: generatingPayslips.has(employee.employee_id || employee.employeeId) ? 'not-allowed' : 'pointer',
                                  fontSize: '12px'
                                }}
                              >
                                {generatingPayslips.has(employee.employee_id || employee.employeeId) ? 'Generating...' : 'Payslip'}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                      {expandedRows.has(employee.employee_id || employee.employeeId) && (
                        <tr>
                          <td colSpan="8" style={{ padding: '0', background: '#f9fafb' }}>
                            <div style={{ padding: '15px', borderTop: '1px solid #e5e7eb' }}>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px' }}>
                                <div><strong>Regular Hours:</strong> {num(employee.regular_hours ?? employee.regularHours).toFixed(1)}h</div>
                                <div><strong>Overtime Hours:</strong> {num(employee.overtime_hours ?? employee.overtimeHours).toFixed(1)}h</div>
                                <div><strong>Hourly Rate:</strong> {formatCurrency(employee.hourly_rate || employee.hourlyRate)}</div>
                                <div><strong>Overtime Rate:</strong> {formatCurrency(employee.overtime_rate || employee.overtimeRate)}</div>
                                <div><strong>Gross Pay:</strong> {formatCurrency(employee.gross_pay || employee.grossPay)}</div>
                                <div><strong>Tax Deductions:</strong> {formatCurrency(employee.tax_deductions || employee.taxDeductions)}</div>
                                <div><strong>Other Deductions:</strong> {formatCurrency(employee.other_deductions || employee.otherDeductions)}</div>
                                <div><strong>Net Pay:</strong> {formatCurrency(employee.net_pay || employee.netPay)}</div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          )}
        </>
      )}
      </div>
    </div>
  );
}