'use client';

import { useState } from 'react';

type Pending = {
  sessionId: string;
  theatreId: string;
  showId: string;
  authorityWhenStarted: 'LOCAL' | 'ONLINE' | 'BLOCKED';
  state: 'PENDING_CONFIRMATION' | 'CONFIRMED' | 'FAILED';
  notes?: string;
  createdAt: string;
  resolvedAt?: string | null;
};

export function PendingActions({ pending }: { pending: Pending[] }) {
  const [rows, setRows] = useState(pending);

  const mark = async (sessionId: string, state: 'CONFIRMED' | 'FAILED') => {
    const res = await fetch('/api/pending', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, state })
    });
    const data = await res.json();
    if (data.success) {
      setRows((prev) => prev.map((row) => row.sessionId === sessionId ? { ...row, state, resolvedAt: new Date().toISOString() } : row));
    }
  };

  return (
    <div className="tableWrap">
      <table>
        <thead>
          <tr><th>Session</th><th>Show</th><th>Authority</th><th>State</th><th>Created</th><th>Action</th></tr>
        </thead>
        <tbody>
          {rows.length === 0 ? <tr><td colSpan={6}>No pending transactions</td></tr> :
            rows.map((row) => (
              <tr key={row.sessionId}>
                <td>{row.sessionId}</td>
                <td>{row.showId}</td>
                <td>{row.authorityWhenStarted}</td>
                <td>{row.state}</td>
                <td>{new Date(row.createdAt).toLocaleString()}</td>
                <td className="flex" style={{paddingTop:8,paddingBottom:8}}>
                  <button className="button secondary" onClick={() => mark(row.sessionId, 'CONFIRMED')}>Confirm</button>
                  <button className="button red" onClick={() => mark(row.sessionId, 'FAILED')}>Fail</button>
                </td>
              </tr>
            ))
          }
        </tbody>
      </table>
    </div>
  );
}
