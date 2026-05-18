
import PageShell from '@/components/PageShell';
import { ensureSchema } from '@/lib/schema';
import { getDb } from '@/lib/db';
import { revalidatePath } from 'next/cache';

async function updatePolicy(formData: FormData) {
  'use server';
  await ensureSchema();
  const db = getDb();
  const theatreId = String(formData.get('theatreId') || 'KSFDC_SREE_TVM');
  const localPublicUrl = String(formData.get('localPublicUrl') || '');
  const working = String(formData.get('outageModeWorkingHours') || 'LOCAL_PRIORITY');
  const off = String(formData.get('outageModeOffHours') || 'ONLINE_PRIORITY');
  const lead = Number(formData.get('leadTimeCutoffMin') || 120);

  await db.query(
    `UPDATE theatres
     SET local_public_url=?, outage_mode_working_hours=?, outage_mode_off_hours=?, lead_time_cutoff_min=?, updated_at=CURRENT_TIMESTAMP
     WHERE theatre_id=?`,
    [localPublicUrl, working, off, lead, theatreId]
  );
  revalidatePath('/policies');
  revalidatePath('/');
  revalidatePath('/book');
}

export default async function PoliciesPage() {
  await ensureSchema();
  const db = getDb();
  const [rows] = await db.query<any[]>('SELECT * FROM theatres ORDER BY theatre_id LIMIT 1');
  const theatre = rows[0];

  return (
    <PageShell title="Theatre Policies" subtitle="Configure outage behavior and the local tunnel URL used by the central booking server.">
      <div className="card p-6 max-w-3xl">
        <form action={updatePolicy} className="grid gap-4">
          <input type="hidden" name="theatreId" value={theatre?.theatre_id || 'KSFDC_SREE_TVM'} />
          <label className="grid gap-2">
            <span className="text-sm text-slate-300">Local public URL</span>
            <input className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3" name="localPublicUrl" defaultValue={theatre?.local_public_url || ''} />
          </label>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-sm text-slate-300">Working-hours outage mode</span>
              <select className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3" name="outageModeWorkingHours" defaultValue={theatre?.outage_mode_working_hours || 'LOCAL_PRIORITY'}>
                <option value="LOCAL_PRIORITY">LOCAL_PRIORITY</option>
                <option value="ONLINE_PRIORITY">ONLINE_PRIORITY</option>
                <option value="BLOCK_ALL">BLOCK_ALL</option>
              </select>
            </label>
            <label className="grid gap-2">
              <span className="text-sm text-slate-300">Off-hours outage mode</span>
              <select className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3" name="outageModeOffHours" defaultValue={theatre?.outage_mode_off_hours || 'ONLINE_PRIORITY'}>
                <option value="LOCAL_PRIORITY">LOCAL_PRIORITY</option>
                <option value="ONLINE_PRIORITY">ONLINE_PRIORITY</option>
                <option value="BLOCK_ALL">BLOCK_ALL</option>
              </select>
            </label>
          </div>
          <label className="grid gap-2">
            <span className="text-sm text-slate-300">Lead time cutoff (minutes)</span>
            <input className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3" type="number" name="leadTimeCutoffMin" defaultValue={theatre?.lead_time_cutoff_min || 120} />
          </label>
          <div><button className="btn btn-primary" type="submit">Save policies</button></div>
        </form>
      </div>
    </PageShell>
  );
}
