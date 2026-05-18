import PageShell from '@/components/PageShell';
import { ensureSchema } from '@/lib/schema';
import { getDb } from '@/lib/db';

async function updatePolicy(formData: FormData) {
  'use server';
  await ensureSchema();
  const db = getDb();
  await db.query(`UPDATE theatres SET local_public_url=?, working_hours_start=?, working_hours_end=?, outage_mode_working_hours=?, outage_mode_off_hours=?, lead_time_cutoff_min=? WHERE theatre_id=?`, [
    String(formData.get('local_public_url') || ''),
    String(formData.get('working_hours_start') || '09:00:00'),
    String(formData.get('working_hours_end') || '23:00:00'),
    String(formData.get('outage_mode_working_hours') || 'LOCAL_PRIORITY'),
    String(formData.get('outage_mode_off_hours') || 'ONLINE_PRIORITY'),
    Number(formData.get('lead_time_cutoff_min') || 120),
    String(formData.get('theatre_id') || 'KSFDC_SREE_TVM')
  ]);
}

export default async function PoliciesPage() {
  await ensureSchema();
  const db = getDb();
  const [rows] = await db.query<any[]>(`SELECT * FROM theatres WHERE theatre_id = ? LIMIT 1`, [process.env.THEATRE_ID || 'KSFDC_SREE_TVM']);
  const t = rows[0];
  return (
    <PageShell>
      <div className="mx-auto max-w-3xl rounded-3xl border border-white/10 bg-slate-900/70 p-6">
        <div className="text-sm uppercase tracking-[0.3em] text-cyan-300">Theatre policy</div>
        <h1 className="mt-3 text-3xl font-black">Control what happens when the theatre line goes down</h1>
        <form action={updatePolicy} className="mt-6 grid gap-4">
          <input type="hidden" name="theatre_id" defaultValue={t.theatre_id} />
          <label className="grid gap-2"><span className="text-sm text-slate-300">Local public URL</span><input name="local_public_url" defaultValue={t.local_public_url || ''} className="rounded-2xl border border-white/10 bg-slate-800/70 px-4 py-3" /></label>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2"><span className="text-sm text-slate-300">Working hours start</span><input name="working_hours_start" defaultValue={String(t.working_hours_start)} className="rounded-2xl border border-white/10 bg-slate-800/70 px-4 py-3" /></label>
            <label className="grid gap-2"><span className="text-sm text-slate-300">Working hours end</span><input name="working_hours_end" defaultValue={String(t.working_hours_end)} className="rounded-2xl border border-white/10 bg-slate-800/70 px-4 py-3" /></label>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2"><span className="text-sm text-slate-300">Working-hours outage mode</span><select name="outage_mode_working_hours" defaultValue={t.outage_mode_working_hours} className="rounded-2xl border border-white/10 bg-slate-800/70 px-4 py-3"><option>LOCAL_PRIORITY</option><option>ONLINE_PRIORITY</option><option>BLOCK_ALL</option></select></label>
            <label className="grid gap-2"><span className="text-sm text-slate-300">Off-hours outage mode</span><select name="outage_mode_off_hours" defaultValue={t.outage_mode_off_hours} className="rounded-2xl border border-white/10 bg-slate-800/70 px-4 py-3"><option>LOCAL_PRIORITY</option><option>ONLINE_PRIORITY</option><option>BLOCK_ALL</option></select></label>
          </div>
          <label className="grid gap-2"><span className="text-sm text-slate-300">Lead-time cutoff in minutes for central outage booking</span><input type="number" name="lead_time_cutoff_min" defaultValue={t.lead_time_cutoff_min} className="rounded-2xl border border-white/10 bg-slate-800/70 px-4 py-3" /></label>
          <button className="rounded-2xl bg-cyan-400 px-5 py-4 font-black text-slate-950">Save policy</button>
        </form>
      </div>
    </PageShell>
  );
}
