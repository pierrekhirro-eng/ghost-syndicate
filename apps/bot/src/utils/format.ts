export function money(v: number) { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v); }
export function duration(sec: number) { const h = Math.floor(sec/3600), m = Math.floor((sec%3600)/60), s = sec%60; return `${h}h ${m}m ${s}s`; }
