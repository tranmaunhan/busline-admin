const currencyFormatter = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
});

const compactCurrencyFormatter = new Intl.NumberFormat('vi-VN', {
  notation: 'compact',
  compactDisplay: 'short',
  maximumFractionDigits: 1,
});

const oneDecimalFormatter = new Intl.NumberFormat('vi-VN', {
  maximumFractionDigits: 1,
  minimumFractionDigits: 0,
});

export function formatCurrency(value) {
  return currencyFormatter.format(Number(value || 0));
}

export function formatCompactCurrency(value) {
  return compactCurrencyFormatter.format(Number(value || 0));
}

export function formatPercent(value) {
  return `${oneDecimalFormatter.format(Number(value || 0))}%`;
}

export function formatTripFrequency(value) {
  return `${oneDecimalFormatter.format(Number(value || 0))} chuyến/ngày`;
}

export function formatDuration(minutes) {
  if (!minutes && minutes !== 0) {
    return 'Chưa có';
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours <= 0) {
    return `${remainingMinutes} phút`;
  }

  if (remainingMinutes <= 0) {
    return `${hours} giờ`;
  }

  return `${hours} giờ ${remainingMinutes} phút`;
}
