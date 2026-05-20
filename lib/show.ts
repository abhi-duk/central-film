export function describeShow(timeIso: string) {
  const d = new Date(timeIso);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfShow = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round((startOfShow.getTime() - startOfToday.getTime()) / 86400000);
  const dayLabel = diffDays === 0 ? 'Today' : diffDays === 1 ? 'Tomorrow' : d.toLocaleDateString('en-IN', { weekday: 'long' });
  const hour = d.getHours();
  const slot = hour < 12 ? 'Morning Show' : hour < 16 ? 'Afternoon Show' : hour < 19 ? 'Evening Show' : 'Night Show';
  return {
    dayLabel,
    slot,
    dateLabel: d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }),
    timeLabel: d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' }),
  };
}

export function computePricing(args: { seatClasses: string[]; premiumRate: number; executiveRate: number; economyRate: number; gstPct: number; entertainmentTaxPct: number; cessPct: number; }) {
  const net = args.seatClasses.reduce((sum, cls) => sum + (cls === 'PREMIUM' ? args.premiumRate : cls === 'EXECUTIVE' ? args.executiveRate : args.economyRate), 0);
  const gst = +(net * args.gstPct / 100).toFixed(2);
  const entertainmentTax = +(net * args.entertainmentTaxPct / 100).toFixed(2);
  const cess = +(net * args.cessPct / 100).toFixed(2);
  const total = +(net + gst + entertainmentTax + cess).toFixed(2);
  return { net, gst, entertainmentTax, cess, total, rates: { premium: args.premiumRate, executive: args.executiveRate, economy: args.economyRate }, taxes: { gstPct: args.gstPct, entertainmentTaxPct: args.entertainmentTaxPct, cessPct: args.cessPct } };
}
