import PageShell from '../../components/PageShell';
import { ensureSchema } from '../../lib/schema';
import { getDb } from '../../lib/db';

export const dynamic = 'force-dynamic';

async function updatePolicy(formData: FormData) {
  'use server';
  await ensureSchema();
  const db = getDb();
  await db.query(`UPDATE theatres SET working_hours_start=?, working_hours_end=?, outage_mode_working_hours=?, outage_mode_off_hours=?, lead_time_cutoff_min=? WHERE theatre_id=?`, [
    String(formData.get('working_hours_start')||'09:00:00'),
    String(formData.get('working_hours_end')||'23:00:00'),
    String(formData.get('outage_mode_working_hours')||'LOCAL_PRIORITY'),
    String(formData.get('outage_mode_off_hours')||'ONLINE_PRIORITY'),
    Number(formData.get('lead_time_cutoff_min')||120),
    String(formData.get('theatre_id')||'KSFDC_SREE_TVM')
  ]);
}

export default async function PoliciesPage() {
  await ensureSchema();
  const db = getDb();
  const [rows] = await db.query<any[]>(`SELECT * FROM theatres ORDER BY theatre_id LIMIT 1`);
  const t = rows[0];
  return (
    <PageShell title="Policy Configuration" eyebrow="Governance & Schedule Controls">
      <form action={updatePolicy} className="card p-6 grid-auto" style={{gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))'}}>
        <input type="hidden" name="theatre_id" value={t.theatre_id} />
        <label><div className="subtle mb-2">Working Hours Start</div><input className="form-input" name="working_hours_start" defaultValue={String(t.working_hours_start)} /></label>
        <label><div className="subtle mb-2">Working Hours End</div><input className="form-input" name="working_hours_end" defaultValue={String(t.working_hours_end)} /></label>
        <label><div className="subtle mb-2">Working-Hours Outage Mode</div><select className="form-select" name="outage_mode_working_hours" defaultValue={t.outage_mode_working_hours}><option>LOCAL_PRIORITY</option><option>ONLINE_PRIORITY</option><option>BLOCK_ALL</option></select></label>
        <label><div className="subtle mb-2">Off-Hours Outage Mode</div><select className="form-select" name="outage_mode_off_hours" defaultValue={t.outage_mode_off_hours}><option>LOCAL_PRIORITY</option><option>ONLINE_PRIORITY</option><option>BLOCK_ALL</option></select></label>
        <label><div className="subtle mb-2">Lead Time Cutoff (minutes)</div><input className="form-input" name="lead_time_cutoff_min" defaultValue={String(t.lead_time_cutoff_min)} /></label>
        <div style={{alignSelf:'end'}}><button className="btn btn-primary" type="submit">Save Policy</button></div>
      </form>
    </PageShell>
  );
}
