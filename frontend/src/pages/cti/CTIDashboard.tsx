/**
 * CTI Dashboard - Cyber Threat Intelligence
 *
 * Two-column layout:
 * 1. Threat Actors (left) - fixed width
 * 2. Actor Details Panel OR MITRE ATT&CK Matrix (right) - dynamic content
 *
 * Click on actor to see detailed information in the right panel.
 * Click "View in Matrix" to show MITRE ATT&CK matrix instead of details.
 */

import React, { useState, useEffect } from 'react';
import { Target, AlertCircle, Loader2, Shield, Brain, Database, Search, List, Globe, LayoutGrid } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSettingsStore } from '@stores/settingsStore';
import ActorsList from '../../components/cti/ActorsList';
import AttackMatrix from '../../components/cti/AttackMatrix';
import ActorDetailsPanel from '../../components/cti/ActorDetailsPanel';
import WorldMap from '../../components/cti/WorldMap';
import { ctiService } from '../../services/cti/ctiService';

const CTIDashboard: React.FC = () => {
  const { currentColors } = useSettingsStore();
  const navigate = useNavigate();

  // View state: 'none' | 'details' | 'matrix'
  const [rightPanelView, setRightPanelView] = useState<'none' | 'details' | 'matrix'>('none');
  const [selectedActor, setSelectedActor] = useState<string | null>(null);
  const [highlightedTechniques, setHighlightedTechniques] = useState<string[]>([]);

  // View mode: 'list' | 'map'
  const [viewMode, setViewMode] = useState<'list' | 'map'>('map');

  // Search query for highlighting on map
  const [searchQuery, setSearchQuery] = useState('');

  // Loading states
  const [isHighlighting, setIsHighlighting] = useState(false);
  const [highlightError, setHighlightError] = useState<string | null>(null);

  // Stats
  const [stats, setStats] = useState<any>(null);

  // Load initial stats
  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const data = await ctiService.techniques.getStats();
      setStats(data);
    } catch (error) {
      console.error('Error loading CTI stats:', error);
    }
  };

  const handleActorClick = (actorName: string) => {
    setSelectedActor(actorName);
    setRightPanelView('details');
  };

  const handleTechniquesLoaded = (techniques: string[]) => {
    console.log('🎯 Techniques loaded:', techniques.length);
    setHighlightedTechniques(techniques);
  };

  const handleViewMatrix = () => {
    setRightPanelView('matrix');
  };

  const handleClosePanel = () => {
    setRightPanelView('none');
    setSelectedActor(null);
    setHighlightedTechniques([]);
  };

  return (
    <div
      className="h-full overflow-y-auto p-6"
      style={{ backgroundColor: currentColors.bg.secondary }}
    >
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Target size={32} style={{ color: currentColors.text.primary }} />
          <h1 className="text-3xl font-semibold" style={{ color: currentColors.text.primary }}>
            Cyber Threat Intelligence
          </h1>
        </div>
        <p className="text-sm" style={{ color: currentColors.text.secondary }}>
          Monitor threat actors and MITRE ATT&CK techniques. Click on an actor to see details.
        </p>

        {/* Navigation Cards */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* MISP Feeds Card */}
          <button
            onClick={() => navigate('/cti/feeds')}
            className="p-4 rounded-lg border-2 text-left hover:shadow-lg transition-all"
            style={{
              backgroundColor: currentColors.bg.primary,
              borderColor: currentColors.border.default,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = currentColors.accent.primary;
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = currentColors.border.default;
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <div className="flex items-center gap-3 mb-2">
              <Shield size={24} style={{ color: currentColors.accent.primary }} />
              <h3 className="text-lg font-semibold" style={{ color: currentColors.text.primary }}>
                MISP Feeds
              </h3>
            </div>
            <p className="text-sm" style={{ color: currentColors.text.secondary }}>
              Teste e visualize feeds públicos de threat intelligence (IOCs). 15 feeds disponíveis incluindo DiamondFox, SSL Blacklist, OpenPhish.
            </p>
          </button>

          {/* IOC Enrichment Card */}
          <button
            onClick={() => navigate('/cti/enrichment')}
            className="p-4 rounded-lg border-2 text-left hover:shadow-lg transition-all"
            style={{
              backgroundColor: currentColors.bg.primary,
              borderColor: currentColors.border.default,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = currentColors.accent.secondary;
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = currentColors.border.default;
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <div className="flex items-center gap-3 mb-2">
              <Brain size={24} style={{ color: currentColors.accent.secondary }} />
              <h3 className="text-lg font-semibold" style={{ color: currentColors.text.primary }}>
                IOC Enrichment
              </h3>
            </div>
            <p className="text-sm" style={{ color: currentColors.text.secondary }}>
              Enriqueça IOCs com LLM e threat intelligence. MITRE ATT&CK mapping, detection methods, e análise contextual.
            </p>
          </button>

          {/* IOC Search Card */}
          <button
            onClick={() => navigate('/cti/search')}
            className="p-4 rounded-lg border-2 text-left hover:shadow-lg transition-all"
            style={{
              backgroundColor: currentColors.bg.primary,
              borderColor: currentColors.border.default,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#10b981';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = currentColors.border.default;
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <div className="flex items-center gap-3 mb-2">
              <Search size={24} style={{ color: '#10b981' }} />
              <h3 className="text-lg font-semibold" style={{ color: currentColors.text.primary }}>
                IOC Search
              </h3>
            </div>
            <p className="text-sm" style={{ color: currentColors.text.secondary }}>
              Busque um IOC específico (IP, domain, URL, hash) no MISP e OTX.
            </p>
          </button>

          {/* IOC Browser Card - NEW */}
          <button
            onClick={() => navigate('/cti/iocs')}
            className="p-4 rounded-lg border-2 text-left hover:shadow-lg transition-all"
            style={{
              backgroundColor: currentColors.bg.primary,
              borderColor: currentColors.border.default,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#f59e0b';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = currentColors.border.default;
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <div className="flex items-center gap-3 mb-2">
              <List size={24} style={{ color: '#f59e0b' }} />
              <h3 className="text-lg font-semibold" style={{ color: currentColors.text.primary }}>
                IOC Browser
              </h3>
            </div>
            <p className="text-sm" style={{ color: currentColors.text.secondary }}>
              Navegue pelos IOCs salvos, filtrados por tipo (IP, domain, URL, hash).
            </p>
          </button>
        </div>

        {/* Stats Summary */}
        {stats && (
          <div
            className="mt-4 p-4 rounded-lg flex gap-6 flex-wrap"
            style={{ backgroundColor: currentColors.bg.primary }}
          >
            <div>
              <p className="text-xs" style={{ color: currentColors.text.secondary }}>
                Tactics
              </p>
              <p className="text-xl font-semibold" style={{ color: currentColors.text.primary }}>
                {stats.total_tactics}
              </p>
            </div>
            <div>
              <p className="text-xs" style={{ color: currentColors.text.secondary }}>
                Techniques
              </p>
              <p className="text-xl font-semibold" style={{ color: currentColors.text.primary }}>
                {stats.total_techniques}
              </p>
            </div>
            <div>
              <p className="text-xs" style={{ color: currentColors.text.secondary }}>
                Sub-techniques
              </p>
              <p className="text-xl font-semibold" style={{ color: currentColors.text.primary }}>
                {stats.total_subtechniques}
              </p>
            </div>
            <div>
              <p className="text-xs" style={{ color: currentColors.text.secondary }}>
                Mitigations
              </p>
              <p className="text-xl font-semibold" style={{ color: currentColors.text.primary }}>
                {stats.total_mitigations}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* View Mode Toggle and Search */}
      <div className="mb-4 flex items-center gap-4">
        {/* View Mode Toggle */}
        <div
          className="flex rounded-lg overflow-hidden"
          style={{ border: `1px solid ${currentColors.border.default}` }}
        >
          <button
            onClick={() => setViewMode('map')}
            className="px-4 py-2 flex items-center gap-2 text-sm font-medium transition-colors"
            style={{
              backgroundColor: viewMode === 'map' ? currentColors.accent.primary : currentColors.bg.primary,
              color: viewMode === 'map' ? currentColors.text.inverse : currentColors.text.primary
            }}
          >
            <Globe size={16} />
            Map View
          </button>
          <button
            onClick={() => setViewMode('list')}
            className="px-4 py-2 flex items-center gap-2 text-sm font-medium transition-colors"
            style={{
              backgroundColor: viewMode === 'list' ? currentColors.accent.primary : currentColors.bg.primary,
              color: viewMode === 'list' ? currentColors.text.inverse : currentColors.text.primary
            }}
          >
            <LayoutGrid size={16} />
            List View
          </button>
        </div>

        {/* Search for highlighting on map */}
        {viewMode === 'map' && (
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 transform -translate-y-1/2"
                style={{ color: currentColors.text.secondary }}
              />
              <input
                type="text"
                placeholder="Search actor to highlight on map..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg text-sm focus:outline-none focus:ring-2"
                style={{
                  backgroundColor: currentColors.bg.primary,
                  color: currentColors.text.primary,
                  border: `1px solid ${currentColors.border.default}`,
                }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 rounded hover:bg-opacity-80"
                  style={{ color: currentColors.text.muted }}
                >
                  ×
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Map View */}
      {viewMode === 'map' && (
        <div style={{ height: 'calc(100vh - 380px)' }}>
          <WorldMap
            onActorClick={handleActorClick}
            highlightedActor={searchQuery || null}
            className="h-full"
          />
        </div>
      )}

      {/* List View: Two-Column Layout: Actors List + Dynamic Right Panel */}
      {viewMode === 'list' && (
        <div
          className={rightPanelView !== 'none' ? "grid grid-cols-[400px_1fr] gap-4" : "flex"}
          style={{ height: 'calc(100vh - 380px)' }}
        >
          {/* Column 1: Threat Actors (Always Visible) */}
          <div
            className="rounded-lg p-4 flex flex-col overflow-hidden"
            style={{
              backgroundColor: currentColors.bg.primary,
              width: rightPanelView !== 'none' ? 'auto' : '400px',
              height: '100%'
            }}
          >
            <h2 className="text-lg font-semibold mb-4" style={{ color: currentColors.text.primary }}>
              Threat Actors
            </h2>
            <div className="flex-1 overflow-hidden">
              <ActorsList
                selectedActors={[]}
                onActorSelect={() => {}}
                onActorClick={handleActorClick}
              />
            </div>
          </div>

          {/* Column 2: Actor Details Panel */}
          {rightPanelView === 'details' && selectedActor && (
            <ActorDetailsPanel
              actorName={selectedActor}
              onClose={handleClosePanel}
              onTechniquesLoaded={handleTechniquesLoaded}
              onViewMatrix={handleViewMatrix}
            />
          )}

          {/* Column 2: MITRE ATT&CK Matrix */}
          {rightPanelView === 'matrix' && highlightedTechniques.length > 0 && (
            <div
              className="rounded-lg p-4 flex flex-col"
              style={{ backgroundColor: currentColors.bg.primary, minWidth: 0 }}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold" style={{ color: currentColors.text.primary }}>
                  MITRE ATT&CK Matrix - {highlightedTechniques.length} Techniques
                </h2>
                <button
                  onClick={() => setRightPanelView('details')}
                  className="px-3 py-1 rounded text-sm hover:opacity-80"
                  style={{ backgroundColor: currentColors.bg.secondary, color: currentColors.text.primary }}
                >
                  Back to Details
                </button>
              </div>
              <div className="flex-1 overflow-auto">
                <AttackMatrix highlightedTechniques={highlightedTechniques} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Actor Details Modal for Map View */}
      {viewMode === 'map' && selectedActor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div
            className="w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-lg shadow-2xl"
            style={{ backgroundColor: currentColors.bg.primary }}
          >
            <ActorDetailsPanel
              actorName={selectedActor}
              onClose={handleClosePanel}
              onTechniquesLoaded={handleTechniquesLoaded}
              onViewMatrix={handleViewMatrix}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default CTIDashboard;
