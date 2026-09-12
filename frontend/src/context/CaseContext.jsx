import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api';

const CaseContext = createContext();

export function CaseProvider({ children }) {
  const [activeCaseId, setActiveCaseId] = useState(() => {
    return localStorage.getItem('cfas_active_case_id') || 'case-demo-001';
  });
  const [activeCase, setActiveCase] = useState(null);
  const [activeGraph, setActiveGraph] = useState({ nodes: [], edges: [] });
  const [casesList, setCasesList] = useState([]);
  const [loadingCase, setLoadingCase] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  // Stable reference via useCallback so the useEffect below doesn't re-fire on every render
  const loadCaseData = useCallback(async (cId) => {
    // Guard: don't fire API calls if user has no token (prevents 401 cascade on login page)
    if (!localStorage.getItem('cfas_token')) return;
    setLoadingCase(true);
    try {
      const [cRes, gRes] = await Promise.all([
        api.get(`/api/v1/cases/${cId}`),
        api.get(`/api/v1/cases/${cId}/graph`).catch(() => ({ data: { nodes: [], edges: [] } })),
      ]);
      setActiveCase(cRes.data);
      setActiveGraph(gRes.data);
    } catch {
      setActiveCase(null);
    } finally {
      setLoadingCase(false);
    }
  }, []);

  // Sync active case ID to localStorage and fetch data when it changes
  useEffect(() => {
    if (activeCaseId) {
      localStorage.setItem('cfas_active_case_id', activeCaseId);
      loadCaseData(activeCaseId);
    }
  }, [activeCaseId, loadCaseData]);

  // Load all cases for quick switching (only when authenticated)
  useEffect(() => {
    if (!localStorage.getItem('cfas_token')) return;
    const fetchCases = async () => {
      try {
        const res = await api.get('/api/v1/cases');
        setCasesList(res.data.cases || []);
      } catch { /* ignore */ }
    };
    fetchCases();
  }, []);

  const selectCase = useCallback((cId) => {
    setActiveCaseId(cId);
  }, []);

  // Keyboard shortcut listener for Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <CaseContext.Provider value={{
      activeCaseId,
      activeCase,
      activeGraph,
      casesList,
      loadingCase,
      selectCase,
      reloadActiveCase: () => loadCaseData(activeCaseId),
      isCommandPaletteOpen,
      setIsCommandPaletteOpen,
    }}>
      {children}
    </CaseContext.Provider>
  );
}

export function useCase() {
  return useContext(CaseContext);
}
