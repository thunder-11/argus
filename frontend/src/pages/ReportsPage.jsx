import { useEffect, useState } from 'react';
import { useCase } from '../context/CaseContext';
import api from '../api';
import { collection, errorMessage } from '../contracts';

function downloadBase64(payload, fallback) {
  const bytes = Uint8Array.from(atob(payload.pdf_base64), char => char.charCodeAt(0));
  const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
  const link = document.createElement('a'); link.href = url; link.download = payload.pdf_filename || fallback; link.click();
  URL.revokeObjectURL(url);
}

export default function ReportsPage() {
  const { casesList, activeCaseId } = useCase();
  const [selectedCase, setSelectedCase] = useState(activeCaseId || '');
  const [reports, setReports] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState('');

  const loadReports = async () => {
    try { const response = await api.get('/api/v1/reports'); setReports(collection(response.data, 'reports')); }
    catch (error) { setMessage(errorMessage(error, 'Report history is unavailable.')); }
  };
  useEffect(() => { loadReports(); }, []);
  useEffect(() => { if (!selectedCase && activeCaseId) setSelectedCase(activeCaseId); }, [activeCaseId, selectedCase]);

  const generate = async () => {
    if (!selectedCase) return;
    setGenerating(true); setMessage('');
    try {
      const response = await api.post(`/api/v1/cases/${selectedCase}/generate-court-report`, {});
      if (response.data.pdf_base64) downloadBase64(response.data, `report-${selectedCase}.pdf`);
      setMessage('Draft report generated. Human review and signature remain required.');
      await loadReports();
    } catch (error) { setMessage(errorMessage(error, 'Report generation failed.')); }
    finally { setGenerating(false); }
  };

  const download = async report => {
    try {
      const response = await api.get(`/api/v1/reports/${report.id}/download`, { responseType: 'blob' });
      const url = URL.createObjectURL(response.data); const link = document.createElement('a'); link.href = url; link.download = `${report.reference || report.id}.pdf`; link.click(); URL.revokeObjectURL(url);
    } catch (error) { setMessage(errorMessage(error, 'Report download failed.')); }
  };

  return <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
    <div className="page-header" style={{ margin: 0 }}><div><h1>📑 Reports & Legal Drafts</h1><p className="subtitle">Immutable evidence reports; human review and signature required</p></div></div>
    <div className="card" style={{ padding: 20, display: 'flex', gap: 12 }}><select className="form-select" value={selectedCase} onChange={e => setSelectedCase(e.target.value)} style={{ flex: 1 }}><option value="">Select case</option>{casesList.map(item => <option key={item.id} value={item.id}>{item.external_complaint_id}</option>)}</select><button className="btn btn-primary" onClick={generate} disabled={!selectedCase || generating}>{generating ? 'Generating…' : 'Generate draft report'}</button></div>
    {message && <div className="card" style={{ padding: 12 }}>{message}</div>}
    <div className="panel" style={{ margin: 0 }}><div className="panel-header"><h3>Report History</h3></div><div style={{ overflowX: 'auto' }}><table className="data-table"><thead><tr><th>Reference</th><th>Case</th><th>SHA-256</th><th>Generated</th><th>Action</th></tr></thead><tbody>{reports.map(report => <tr key={report.id}><td>{report.reference}</td><td className="mono">{report.case_id}</td><td className="mono">{report.sha256}</td><td>{report.generated_at}</td><td><button className="btn btn-outline" onClick={() => download(report)}>Download</button></td></tr>)}</tbody></table>{!reports.length && <div style={{ padding: 30, textAlign: 'center' }}>No reports are available.</div>}</div></div>
  </div>;
}
