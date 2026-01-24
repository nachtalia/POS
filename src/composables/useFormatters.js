export function useFormatters() {
  const formatCurrency = (amount, compact = false) => {
    if (isNaN(amount)) return '₱0.00'
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: compact ? 0 : 2,
      maximumFractionDigits: 2,
      notation: compact ? 'compact' : 'standard',
    }).format(amount)
  }

  const formatDate = (dateInput) => {
    if (!dateInput) return ''
    const date =
      dateInput && typeof dateInput.toDate === 'function' ? dateInput.toDate() : new Date(dateInput)
    if (isNaN(date.getTime())) return ''
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date)
  }

  const formatTime = (dateInput) => {
    if (!dateInput) return ''
    const date =
      dateInput && typeof dateInput.toDate === 'function' ? dateInput.toDate() : new Date(dateInput)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return { formatCurrency, formatDate, formatTime }
}
