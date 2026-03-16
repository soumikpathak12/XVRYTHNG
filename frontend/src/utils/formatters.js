// src/utils/formatters.js

export function formatCurrency(amount) {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD'
  }).format(amount);
}

export function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString('en-AU');
}

export function formatDateTime(dateString) {
  return new Date(dateString).toLocaleString('en-AU');
}