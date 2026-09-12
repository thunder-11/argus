import { useState } from 'react';
import { useCase } from '../context/CaseContext';
import api from '../api';

export default function ReportsPage() {
  const { casesList, activeCaseId } = useCase();
  const [selectedCase, setSelectedCase] = useState(activeCaseId || 'case-demo-001');
  const [generating, setGenerating] = useState('');

  const previousReports = [
    {
      id: 'REP-63BSA-2026-001',
      caseId: 'case-demo-001',
      caseName: 'NCRP-2026-88421',
      type: 'Sec 63 BSA Forensic Court Report',
      statutoryAct: 'Bharatiya Sakshya Adhiniyam, 2023 § 63',
      vasp: 'CoinDCX (Neblio Technologies Pvt. Ltd.)',
      hash: '9e7b...41a2',
      date: '2026-08-27 18:45:00 UTC',
    },
    {
      id: 'NOT-94BNSS-2026-001',
      caseId: 'case-demo-001',
      caseName: 'NCRP-2026-88421',
      type: 'Sec 94 BNSS Emergency Freeze Notice',
      statutoryAct: 'Bharatiya Nagarik Suraksha Sanhita, 2023 § 94',
      vasp: 'CoinDCX (Neblio Technologies Pvt. Ltd.)',
      hash: '3f8a...991c',
      date: '2026-08-27 18:40:00 UTC',
    },
    {
      id: 'REP-63BSA-2026-002',
      caseId: 'case-demo-002',
      caseName: 'NCRP-2026-77190',
      type: 'Sec 63 BSA Forensic Court Report',
      statutoryAct: 'Bharatiya Sakshya Adhiniyam, 2023 § 63',
      vasp: 'WazirX (Zanmai Labs Pvt. Ltd.)',
      hash: '5d1c...8842',
      date: '2026-08-25 14:20:00 UTC',
    },
  ];

  const handleGenerateNotice = async () => {
    setGenerating('notice');
    try {
      const res = await api.post(`/api/v1/cases/${selectedCase}/generate-freeze-notice`, {
        vasp_id: 'vasp-coindcx',
        police_station: 'Cyber Crime Police Station, Bengaluru Central',
        officer_name: 'Inspector S. Sharma',
        fir_cr_number: 'NCRP-2026-88421',
        designation: 'Investigating Officer',
      });

      const b64 = res.data.pdf_base64;
      const filename = res.data.pdf_filename || `Sec94_BNSS_Freeze_Notice_${selectedCase}.pdf`;
      const byteCharacters = atob(b64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Notice generation error:', err);
      alert('Notice Generation Failed: ' + (err.response?.data?.detail || err.message));
    } finally {
      setGenerating('');
    }
  };

  const handleGenerateReport = async () => {
    setGenerating('report');
    try {
      const res = await api.post(`/api/v1/cases/${selectedCase}/generate-court-report`, {});

      const b64 = res.data.pdf_base64;
      const filename = res.data.pdf_filename || `Sec63_BSA_Forensic_Report_${selectedCase}.pdf`;
      const byteCharacters = atob(b64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Report generation error:', err);
      alert('Report Generation Failed: ' + (err.response?.data?.detail || err.message));
    } finally {
      setGenerating('');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div className="page-header" style={{ margin: 0 }}>
        <div>
          <h1>📑 Statutory Reports & Legal Notices Archive</h1>
          <p className="subtitle">Certified Section 63 BSA Forensic Evidence Reports & Section 94 BNSS Freezing Notices</p>
        </div>
      </div>

      {/* Report Generator Deck */}
      <div className="card" style={{ padding: '20px 24px', background: 'var(--bg-card)', border: '1px solid var(--border-default)' }}>
        <div style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--text-muted)', marginBottom: 14 }}>
          ⚖️ Instant Statutory Document Generation
        </div>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 260 }}>
            <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', marginBottom: 4 }}>
              SELECT CASE COMPLAINT
            </label>
            <select
              className="form-select"
              value={selectedCase}
              onChange={e => setSelectedCase(e.target.value)}
            >
              {casesList.map(c => (
                <option key={c.id} value={c.id}>
                  {c.external_complaint_id} — {c.fraud_typology} (${c.reported_loss_amount?.toLocaleString()})
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', paddingTop: 18 }}>
            <button
              className="btn btn-danger"
              onClick={handleGenerateNotice}
              disabled={generating === 'notice'}
            >
              {generating === 'notice' ? '⏳ Generating...' : '📄 Generate Sec 94 BNSS Notice (PDF)'}
            </button>
            <button
              className="btn btn-primary"
              onClick={handleGenerateReport}
              disabled={generating === 'report'}
            >
              {generating === 'report' ? '⏳ Generating...' : '📑 Generate Sec 63 BSA Court Report (PDF)'}
            </button>
          </div>
        </div>
      </div>

      {/* Previous Reports Archive */}
      <div className="panel" style={{ margin: 0 }}>
        <div className="panel-header">
          <h3>Certified Legal Notice & Report Archive</h3>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Document Ref</th>
                <th>Case Name</th>
                <th>Document Type</th>
                <th>Statutory Admissibility</th>
                <th>Target VASP</th>
                <th>SHA-256 Hash</th>
                <th>Generated At</th>
              </tr>
            </thead>
            <tbody>
              {previousReports.map(r => (
                <tr key={r.id}>
                  <td className="mono" style={{ color: 'var(--accent-copper-light)', fontWeight: 800 }}>{r.id}</td>
                  <td style={{ fontWeight: 700 }}>{r.caseName}</td>
                  <td style={{ fontWeight: 800 }}>{r.type}</td>
                  <td><span className="badge badge-fiu">{r.statutoryAct}</span></td>
                  <td style={{ color: 'var(--text-gold)', fontWeight: 700 }}>{r.vasp}</td>
                  <td className="mono" style={{ color: 'var(--text-muted)' }}>{r.hash}</td>
                  <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{r.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
