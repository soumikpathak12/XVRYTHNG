// components/leads/LeadsTable.jsx
import React, { useState, useMemo, useEffect } from 'react';

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];
const DEFAULT_PAGE_SIZE = 25;

const SORT_ASC = 'asc';
const SORT_DESC = 'desc';

function formatCurrency(value) {
  if (value == null) return '—';
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'AUD',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(dateString) {
  if (!dateString) return '—';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return dateString;
  const now = new Date();
  const diff = (now - d) / 1000;
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

/**
 * @param {{
 *   leads: Array<{ id: string|number, customerName: string, suburb: string, systemSize: string, value: number, source: string, lastActivity: string, stage: string }>,
 * }} props
 */
export default function LeadsTable({ leads = [], onSelectLead }) {
  const [sortKey, setSortKey] = useState('customerName');
  const [sortDir, setSortDir] = useState(SORT_ASC);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [currentPage, setCurrentPage] = useState(1);

  const sortedLeads = useMemo(() => {
    const arr = [...leads];
    arr.sort((a, b) => {
      let va = a[sortKey];
      let vb = b[sortKey];
      if (sortKey === 'value') {
        va = va != null ? Number(va) : -Infinity;
        vb = vb != null ? Number(vb) : -Infinity;
        return sortDir === SORT_ASC ? va - vb : vb - va;
      }
      if (sortKey === 'lastActivity') {
        va = va ? new Date(va).getTime() : 0;
        vb = vb ? new Date(vb).getTime() : 0;
        return sortDir === SORT_ASC ? va - vb : vb - va;
      }
      va = (va ?? '').toString().toLowerCase();
      vb = (vb ?? '').toString().toLowerCase();
      const cmp = va.localeCompare(vb);
      return sortDir === SORT_ASC ? cmp : -cmp;
    });
    return arr;
  }, [leads, sortKey, sortDir]);

  const total = sortedLeads.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = (currentPage - 1) * pageSize;
  const end = Math.min(start + pageSize, total);
  const paginatedLeads = useMemo(
    () => sortedLeads.slice(start, end),
    [sortedLeads, start, end]
  );

  useEffect(() => {
    setCurrentPage((p) => Math.min(p, totalPages));
  }, [totalPages, total, pageSize]);

  function handleSort(key) {
    if (sortKey === key) {
      setSortDir((d) => (d === SORT_ASC ? SORT_DESC : SORT_ASC));
    } else {
      setSortKey(key);
      setSortDir(SORT_ASC);
    }
  }

  function SortIcon({ columnKey }) {
    if (sortKey !== columnKey) return <span className="leads-table-sort-icon" aria-hidden>↕</span>;
    return (
      <span className="leads-table-sort-icon active" aria-hidden>
        {sortDir === SORT_ASC ? '↑' : '↓'}
      </span>
    );
  }

  const canPrev = currentPage > 1;
  const canNext = currentPage < totalPages;
  const pageNumbers = useMemo(() => {
    const maxVisible = 5;
    if (totalPages <= maxVisible) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const left = Math.max(1, currentPage - 1);
    const right = Math.min(totalPages, currentPage + 1);
    const pages = new Set([1, ...Array.from({ length: right - left + 1 }, (_, i) => left + i), totalPages]);
    return Array.from(pages).sort((a, b) => a - b);
  }, [totalPages, currentPage]);

  return (
    <div className="leads-table-wrap">
      <div className="leads-table-scroll">
        <table className="leads-table" role="grid" aria-label="Leads">
          <thead>
            <tr>
              <th className="leads-table-th leads-table-th-sortable" onClick={() => handleSort('customerName')}>
                <span>Name</span>
                <SortIcon columnKey="customerName" />
              </th>
              <th className="leads-table-th leads-table-th-sortable" onClick={() => handleSort('suburb')}>
                <span>Suburb</span>
                <SortIcon columnKey="suburb" />
              </th>
              <th className="leads-table-th leads-table-th-sortable leads-table-th-num" onClick={() => handleSort('value')}>
                <span>Value</span>
                <SortIcon columnKey="value" />
              </th>
              <th className="leads-table-th">System</th>
              <th className="leads-table-th leads-table-th-sortable" onClick={() => handleSort('source')}>
                <span>Source</span>
                <SortIcon columnKey="source" />
              </th>
              <th className="leads-table-th leads-table-th-sortable" onClick={() => handleSort('lastActivity')}>
                <span>Last activity</span>
                <SortIcon columnKey="lastActivity" />
              </th>
            </tr>
          </thead>
          <tbody>
            {paginatedLeads.length === 0 ? (
              <tr>
                <td colSpan={6} className="leads-table-empty">
                  No leads match your filters.
                </td>
              </tr>
            ) : (
              paginatedLeads.map((lead) => (
                <tr
                  key={lead.id}
                  className="leads-table-tr"
                  onClick={(e) => { if (!e.target.closest('select')) onSelectLead?.(lead.id); }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelectLead?.(lead.id); } }}
                >
                  <td className="leads-table-td leads-table-td-name">
                    <span className="leads-table-name">{lead.customerName || '—'}</span>
                  </td>
                  <td className="leads-table-td">{lead.suburb || '—'}</td>
                  <td className="leads-table-td leads-table-td-num">{formatCurrency(lead.value)}</td>
                  <td className="leads-table-td">{lead.systemSize || '—'}</td>
                  <td className="leads-table-td">
                    {lead.source ? <span className="leads-table-source">{lead.source}</span> : '—'}
                  </td>
                  <td className="leads-table-td leads-table-td-muted">{formatDate(lead.lastActivity)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {total > 0 && (
        <div className="leads-table-pagination">
          <div className="leads-table-pagination-info">
            Showing {start + 1}–{end} of {total}
          </div>
          <div className="leads-table-pagination-size">
            <label htmlFor="leads-table-page-size">Per page</label>
            <select
              id="leads-table-page-size"
              className="leads-table-page-size-select"
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              aria-label="Rows per page"
            >
              {PAGE_SIZE_OPTIONS.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
          <div className="leads-table-pagination-nav">
            <button
              type="button"
              className="leads-table-page-btn"
              disabled={!canPrev}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              aria-label="Previous page"
            >
              Previous
            </button>
            <div className="leads-table-page-numbers" role="navigation" aria-label="Page numbers">
              {pageNumbers.map((p, i) => (
                <React.Fragment key={p}>
                  {i > 0 && pageNumbers[i - 1] !== p - 1 && <span className="leads-table-page-ellipsis">…</span>}
                  <button
                    type="button"
                    className={`leads-table-page-num ${currentPage === p ? 'active' : ''}`}
                    onClick={() => setCurrentPage(p)}
                    aria-label={`Page ${p}`}
                    aria-current={currentPage === p ? 'page' : undefined}
                  >
                    {p}
                  </button>
                </React.Fragment>
              ))}
            </div>
            <button
              type="button"
              className="leads-table-page-btn"
              disabled={!canNext}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              aria-label="Next page"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
