
import PageShell from '@/components/PageShell';
import { ensureSchema } from '@/lib/schema';
import { getDb } from '@/lib/db';

async function updatePolicy(formData: FormData) {
  'use server';
  await ensureSchema();
  const db = getDb();
  const theatreId = String(formData.get('theatreId') || 'KSFDC_SREE_TVM');
  const wh = String(formData.get('outageModeWorkingHours') || 'LOCAL_PRIORITY');
  const oh = String(formData.get('outageModeOffHours') || 'ONLINE_PRIORITY');
  const url = String(formData.get('localPublicUrl') || '');
  const start = String(formData.get('workingHoursStart') || '09:00:00');
  const end = String(formData.get('workingHoursEnd') || '23:00:00');
  const cutoff = Number(formData.get('leadTimeCutoffMin') || 120);
  await db.query(`UPDATE theatres SET local_public_url=?, outage_mode_working_hours=?, outage_mode_off_hours=?, working_hours_start=?, working_hours_end=?, lead_time_cutoff_min=? WHERE theatre_id=?`, [url, wh, oh, start, end, cutoff, theatreId]);
}

export default async function PoliciesPage() {
  await ensureSchema();
  const db = getDb();
  const [rows]: any = await db.query('SELECT * FROM theatres ORDER BY theatre_id LIMIT 1');
  const t = rows?.[0] || {};
  return (
    <PageShell title="Theatre policy" subtitle="Control outage behaviour and local server URL.">
      <form action={updatePolicy} className="card p-6 space-y-4">
        <input type="hidden" name="theatreId" defaultValue={t.theatre_id || 'KSFDC_SREE_TVM'} />
        <div>
          <label className="block mb-2 text-sm text-slate-300">Local public URL</label>
          <input name="localPublicUrl" defaultValue={t.local_public_url || ''} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3" />
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block mb-2 text-sm text-slate-300">Working-hours outage mode</label>
            <select name="outageModeWorkingHours" defaultValue={t.outage_mode_working_hours || 'LOCAL_PRIORITY'} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3">
              <option value="LOCAL_PRIORITY">LOCAL_PRIORITY</option>
              <option value="ONLINE_PRIORITY">ONLINE_PRIORITY</option>
              <option value="BLOCK_ALL">BLOCK_ALL</option>
            </select>
          </div>
          <div>
            <label className="block mb-2 text-sm text-slate-300">Off-hours outage mode</label>
            <select name="outageModeOffHours" defaultValue={t.outage_mode_off_hours || 'ONLINE_PRIORITY'} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3">
              <option value="LOCAL_PRIORITY">LOCAL_PRIORITY</option>
              <option value="ONLINE_PRIORITY">ONLINE_PRIORITY</option>
              <option value="BLOCK_ALL">BLOCK_ALL</option>
            </select>
          </div>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <label className="block mb-2 text-sm text-slate-300">Start</label>
            <input name="workingHoursStart" defaultValue={String(t.working_hours_start || '09:00:00')} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3" />
          </div>
          <div>
            <label className="block mb-2 text-sm text-slate-300">End</label>
            <input name="workingHoursEnd" defaultValue={String(t.working_hours_end || '23:00:00')} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3" />
          </div>
          <div>
            <label className="block mb-2 text-sm text-slate-300">Lead-time cutoff (min)</label>
            <input name="leadTimeCutoffMin" type="number" defaultValue={Number(t.lead_time_cutoff_min || 120)} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3" />
          </div>
        </div>
        <button className="btn btn-primary" type="submit">Save policy</button>
      </form>
    </PageShell>
  );
}
