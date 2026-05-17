'use client';

import { useState } from 'react';

type Theatre = {
  theatreId: string;
  name: string;
  city: string;
  localPublicUrl: string;
  workingHoursStart: string;
  workingHoursEnd: string;
  outageModeWorkingHours: 'LOCAL_PRIORITY' | 'ONLINE_PRIORITY' | 'BLOCK_ALL';
  outageModeOffHours: 'LOCAL_PRIORITY' | 'ONLINE_PRIORITY' | 'BLOCK_ALL';
  leadTimeCutoffMin: number;
};

export function PolicyForm({ theatre }: { theatre: Theatre }) {
  const [form, setForm] = useState(theatre);
  const [message, setMessage] = useState('');

  const save = async () => {
    const res = await fetch('/api/policies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setMessage(data.success ? 'Saved successfully.' : 'Save failed.');
  };

  return (
    <div className="grid grid-2">
      <div className="card">
        <label className="label">Theatre Name</label>
        <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <div className="mt16" />
        <label className="label">Local Public URL</label>
        <input className="input" value={form.localPublicUrl} onChange={(e) => setForm({ ...form, localPublicUrl: e.target.value })} />
        <div className="small mt16">For local-authority online booking, central redirects users to this URL.</div>

        <div className="grid grid-2 mt24">
          <div>
            <label className="label">Working hours start</label>
            <input className="input" type="time" value={form.workingHoursStart} onChange={(e) => setForm({ ...form, workingHoursStart: e.target.value })} />
          </div>
          <div>
            <label className="label">Working hours end</label>
            <input className="input" type="time" value={form.workingHoursEnd} onChange={(e) => setForm({ ...form, workingHoursEnd: e.target.value })} />
          </div>
        </div>

        <div className="grid grid-2 mt24">
          <div>
            <label className="label">Working-hours outage mode</label>
            <select className="select" value={form.outageModeWorkingHours} onChange={(e) => setForm({ ...form, outageModeWorkingHours: e.target.value as any })}>
              <option value="LOCAL_PRIORITY">LOCAL_PRIORITY</option>
              <option value="ONLINE_PRIORITY">ONLINE_PRIORITY</option>
              <option value="BLOCK_ALL">BLOCK_ALL</option>
            </select>
          </div>
          <div>
            <label className="label">Off-hours outage mode</label>
            <select className="select" value={form.outageModeOffHours} onChange={(e) => setForm({ ...form, outageModeOffHours: e.target.value as any })}>
              <option value="LOCAL_PRIORITY">LOCAL_PRIORITY</option>
              <option value="ONLINE_PRIORITY">ONLINE_PRIORITY</option>
              <option value="BLOCK_ALL">BLOCK_ALL</option>
            </select>
          </div>
        </div>

        <div className="mt24">
          <label className="label">Lead-time cutoff (minutes)</label>
          <input className="input" type="number" value={form.leadTimeCutoffMin} onChange={(e) => setForm({ ...form, leadTimeCutoffMin: Number(e.target.value) })} />
          <div className="small mt16">If heartbeat is lost and ONLINE_PRIORITY is active, only shows farther away than this cutoff remain bookable online.</div>
        </div>

        <div className="flex mt24" style={{flexWrap:'wrap'}}>
          <button className="button cyan" onClick={save}>Save Policy</button>
          {message && <span className="notice">{message}</span>}
        </div>
      </div>

      <div className="card">
        <div className="kicker">How the switch works</div>
        <div className="subtitle mt16">
          <p>During healthy heartbeat, authority is almost always <strong>LOCAL</strong>.</p>
          <p>When heartbeat disappears, the selected outage mode becomes active:</p>
          <ul>
            <li><strong>LOCAL_PRIORITY</strong> keeps theatre counters running and blocks online.</li>
            <li><strong>ONLINE_PRIORITY</strong> keeps online alive for safe future shows and locks out local seat selling.</li>
            <li><strong>BLOCK_ALL</strong> stops everyone except admins.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
