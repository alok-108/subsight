export function formatCurrency(amount: number, options?: { showDecimals?: boolean }): string {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return '₹0';
  }
  const showDecimals = options?.showDecimals ?? false;
  
  // Custom Indian formatting with ₹ symbol
  const formatted = new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: showDecimals ? 2 : 0,
    minimumFractionDigits: showDecimals ? 2 : 0,
  }).format(amount);

  return `₹${formatted}`;
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  } catch {
    return dateStr;
  }
}

export function formatMonthYear(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-GB', {
      month: 'short',
      year: 'numeric'
    });
  } catch {
    return dateStr;
  }
}

export function formatFrequency(freq: string): string {
  switch (freq?.toLowerCase()) {
    case 'weekly':
      return 'Weekly';
    case 'monthly':
      return 'Monthly';
    case 'quarterly':
      return 'Quarterly';
    case 'yearly':
      return 'Yearly';
    default:
      return freq ? freq.charAt(0).toUpperCase() + freq.slice(1) : 'Monthly';
  }
}
