export type DatePeriod = '7d' | '30d' | '90d' | '1y' | 'all';

export function getDateFilter(period: DatePeriod | string = '30d'): Date {
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000; // milliseconds in a day

  switch (period) {
    case '7d':
      return new Date(now - 7 * day);
    case '30d':
      return new Date(now - 30 * day);
    case '90d':
      return new Date(now - 90 * day);
    case '1y':
      return new Date(now - 365 * day);
    case 'all':
      return new Date(0); // beginning of time
    default:
      return new Date(now - 30 * day);
  }
}

export function formatDateRange(period: DatePeriod | string = '30d'): string {
  const endDate = new Date();
  const startDate = getDateFilter(period);

  return `${formatDate(startDate)} - ${formatDate(endDate)}`;
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function getDateRangeDescription(period: DatePeriod | string = '30d'): string {
  switch (period) {
    case '7d':
      return 'Last 7 Days';
    case '30d':
      return 'Last 30 Days';
    case '90d':
      return 'Last 90 Days';
    case '1y':
      return 'Last Year';
    case 'all':
      return 'All Time';
    default:
      return 'Last 30 Days';
  }
}

export function generateDatePoints(
  startDate: Date,
  endDate: Date = new Date()
): string[] {
  const dates: string[] = [];
  const currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    dates.push(
      currentDate.toISOString().split('T')[0] // YYYY-MM-DD format
    );
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return dates;
}

export function fillMissingDates<T>(
  data: T[],
  dateField: keyof T,
  startDate: Date,
  endDate: Date = new Date(),
  defaultValue: Partial<T>
): T[] {
  const datePoints = generateDatePoints(startDate, endDate);
  const dataByDate = new Map(
    data.map(item => [
      (item[dateField] as unknown as string).split('T')[0],
      item
    ])
  );

  return datePoints.map(date => ({
    ...defaultValue,
    [dateField]: date,
    ...dataByDate.get(date),
  })) as T[];
}

export function aggregateByTimeUnit(
  data: any[],
  dateField: string,
  timeUnit: 'day' | 'week' | 'month',
  valueFields: string[]
): any[] {
  const aggregated = new Map();

  data.forEach(item => {
    const date = new Date(item[dateField]);
    let key: string;

    switch (timeUnit) {
      case 'week':
        // Get Monday of the week
        const day = date.getUTCDay();
        const diff = date.getUTCDate() - day + (day === 0 ? -6 : 1);
        key = new Date(date.setUTCDate(diff)).toISOString().split('T')[0];
        break;
      case 'month':
        key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-01`;
        break;
      default: // day
        key = date.toISOString().split('T')[0];
    }

    if (!aggregated.has(key)) {
      aggregated.set(key, {
        [dateField]: key,
        ...Object.fromEntries(valueFields.map(field => [field, 0]))
      });
    }

    const current = aggregated.get(key);
    valueFields.forEach(field => {
      current[field] += item[field] || 0;
    });
  });

  return Array.from(aggregated.values()).sort((a, b) => 
    a[dateField].localeCompare(b[dateField])
  );
}
