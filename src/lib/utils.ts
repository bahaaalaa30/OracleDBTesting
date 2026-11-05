export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function formatDuration(seconds?: number): string {
  if (seconds === undefined || seconds === null) return '--';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function formatNumber(n?: number): string {
  if (n === undefined || n === null) return '--';
  return n.toLocaleString('en-US');
}

export function formatDate(iso?: string): string {
  if (!iso) return '--';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '--';
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function displayValue(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

export function isNull(v: unknown): boolean {
  return v === null || v === undefined || v === '';
}

export function normalizeType(dataType: string, length?: number, precision?: number, scale?: number): string {
  const base = dataType.toUpperCase();
  if (base === 'VARCHAR2' || base === 'CHAR' || base === 'NVARCHAR2' || base === 'NCHAR') {
    return `${base}(${length ?? '?'})`;
  }
  if (base === 'NUMBER') {
    if (precision !== undefined && scale !== undefined) {
      if (scale === 0) return `NUMBER(${precision})`;
      return `NUMBER(${precision},${scale})`;
    }
    return 'NUMBER';
  }
  return base;
}

export function maskValue(v: unknown, propertyName: string): string {
  const sensitivePatterns = [
    /patient/i,
    /name/i,
    /ssn/i,
    /dob/i,
    /birth/i,
    /phone/i,
    /email/i,
    /address/i,
    /diagnos/i,
    /mrn/i,
    /nhs/i,
  ];
  if (v === null || v === undefined) return '';
  if (sensitivePatterns.some((p) => p.test(propertyName))) {
    const s = String(v);
    if (s.length <= 2) return '***';
    return s.slice(0, 1) + '*'.repeat(Math.max(3, s.length - 2)) + s.slice(-1);
  }
  return displayValue(v);
}
