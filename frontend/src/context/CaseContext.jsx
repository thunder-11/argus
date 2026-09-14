import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import api from '../api';
import { collection, errorMessage, normalizeCase, normalizeGraph } from '../contracts';
import { useAuth } from './AuthContext';

const CaseContext = createContext();

export function CaseProvider({ children }) {
  const [activeCaseId, setActiveCaseId] = useState(() => {
    return localStorage.getItem('cfas_active_case_id') || '';
  });
  const [activeCase, setActiveCase] = useState(null);
  const [activeGraph, setActiveGraph] = useState({ nodes: [], edges: [] });
  const [casesList, setCasesList] = useState([]);
  const [loadingCase, setLoadingCase] = useState(false);
  const [caseError, setCaseError] = useState('');
  const [graphState, setGraphState] = useState('empty');
  const [graphFilters, setGraphFilters] = useState({ temporal_view: 'post_report', boundary: 'exclusive', include_context: false });
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const { user } = useAuth();
  const requestSequence = useRef(0);

  // Stable reference via useCallback so the useEffect below doesn't re-fire on every render
  const loadCaseData = useCallback(async (cId) => {
    if (!user || !cId) return;
    const sequence = ++requestSequence.current;
    setLoadingCase(true);
    setCaseError('');
    try {
      const cRes = await api.get(`/api/v1/cases/${cId}`);
      if (sequence !== requestSequence.current) return;
      setActiveCase(normalizeCase(cRes.data));
      try {
        const effective = cRes.data.primary_report_event_id
          ? { ...graphFilters, report_event_id: cRes.data.primary_report_event_id }
          : { temporal_view: 'all' };
        const gRes = await api.get(`/api/v1/cases/${cId}/graph`, { params: effective });
        if (sequence !== requestSequence.current) return;
        const graph = normalizeGraph(gRes.data);
        setActiveGraph(graph);
        setGraphState(graph.edges.length ? graph.coverage?.state || 'complete' : graph.coverage?.state || 'empty');
      } catch (graphError) {
        if (sequence !== requestSequence.current) return;
        setActiveGraph(normalizeGraph(null));
        setGraphState('error');
        setCaseError(errorMessage(graphError, 'Graph evidence is unavailable.'));
      }
    } catch (error) {
      if (sequence !== requestSequence.current) return;
      setActiveCase(null);
      setActiveGraph(normalizeGraph(null));
      setCaseError(errorMessage(error, 'Case data is unavailable.'));
    } finally {
      if (sequence === requestSequence.current) setLoadingCase(false);
    }
  }, [user, graphFilters]);

  // Sync active case ID to localStorage and fetch data when it changes
  useEffect(() => {
    if (activeCaseId) {
      localStorage.setItem('cfas_active_case_id', activeCaseId);
      loadCaseData(activeCaseId);
    }
  }, [activeCaseId, loadCaseData]);

  // Load all cases for quick switching (only when authenticated)
  useEffect(() => {
    if (!user) {
      setCasesList([]); setActiveCase(null); setActiveGraph(normalizeGraph(null));
      return;
    }
    const fetchCases = async () => {
      try {
        const res = await api.get('/api/v1/cases');
        const items = collection(res.data, 'cases').map(normalizeCase);
        setCasesList(items);
        if (!activeCaseId && items[0]) setActiveCaseId(items[0].id);
      } catch (error) { setCaseError(errorMessage(error, 'Cases are unavailable.')); }
    };
    fetchCases();
  }, [user, activeCaseId]);

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
      caseError,
      graphState,
      graphFilters,
      setGraphFilters,
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
