/**
 * APT Dashboard - Advanced Persistent Threats
 *
 * Focused view for APT/threat actor analysis with:
 * - Interactive world map with heatmap
 * - Actor details and MITRE ATT&CK techniques
 * - Geopolitical data
 */

import React, { useState, useEffect } from 'react';
import { Users, Search, Globe, LayoutGrid, X } from 'lucide-react';
import { useSettingsStore } from '@stores/settingsStore';
import ActorsList from '../../components/cti/ActorsList';
import AttackMatrix from '../../components/cti/AttackMatrix';
import ActorDetailsPanel from '../../components/cti/ActorDetailsPanel';
import WorldMap from '../../components/cti/WorldMap';
import { ctiService } from '../../services/cti/ctiService';

const APTDashboard: React.FC = () => {
  const { currentColors } = useSettingsStore();

  // View state
  const [rightPanelView, setRightPanelView] = useState<'none' | 'details' | 'matrix'>('none');
  const [selectedActor, setSelectedActor] = useState<string | null>(null);
  const [highlightedTechniques, setHighlightedTechniques] = useState<string[]>([]);

  // View mode: 'map' | 'list'
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');

  // Search query for highlighting on map
  const [searchQuery, setSearchQuery] = useState('');

  // Stats
  const [stats, setStats] = useState<any>(null);
  const [actorStats, setActorStats] = useState<{ totalActors: number; totalCountries: number } | null>(null);

  // Load initial stats
  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const [techniqueStats, actorsResponse] = await Promise.all([
        ctiService.techniques.getStats(),
        ctiService.actors.getActorsByCountry()
      ]);
      setStats(techniqueStats);

      // Calculate actor stats from country data
      const totalActors = actorsResponse.countries.reduce((sum: number, c: any) => sum + c.count, 0);
      const totalCountries = actorsResponse.countries.length;
      setActorStats({ totalActors, totalCountries });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleActorClick = (actorName: string) => {
    setSelectedActor(actorName);
    setRightPanelView('details');
  };

  const handleTechniquesLoaded = (techniques: string[]) => {
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
          <Users size={32} style={{ color: currentColors.accent.error }} />
          <h1 className="text-3xl font-semibold" style={{ color: currentColors.text.primary }}>
            APT - Advanced Persistent Threats
          </h1>
        </div>
        <p className="text-sm" style={{ color: currentColors.text.secondary }}>
          Monitor threat actors by country of origin. Click on a country or actor to see detailed information and MITRE ATT&CK techniques.
        </p>

        {/* Stats Summary */}
        <div
          className="mt-4 p-4 rounded-lg flex gap-8 flex-wrap"
          style={{ backgroundColor: currentColors.bg.primary }}
        >
          {actorStats && (
            <>
              <div>
                <p className="text-xs" style={{ color: currentColors.text.secondary }}>
                  Threat Actors
                </p>
                <p className="text-2xl font-bold" style={{ color: currentColors.accent.error }}>
                  {actorStats.totalActors}
                </p>
              </div>
              <div>
                <p className="text-xs" style={{ color: currentColors.text.secondary }}>
                  Countries
                </p>
                <p className="text-2xl font-bold" style={{ color: currentColors.accent.warning }}>
                  {actorStats.totalCountries}
                </p>
              </div>
            </>
          )}
          {stats && (
            <>
              <div>
                <p className="text-xs" style={{ color: currentColors.text.secondary }}>
                  MITRE Tactics
                </p>
                <p className="text-2xl font-bold" style={{ color: currentColors.accent.primary }}>
                  {stats.total_tactics}
                </p>
              </div>
              <div>
                <p className="text-xs" style={{ color: currentColors.text.secondary }}>
                  MITRE Techniques
                </p>
                <p className="text-2xl font-bold" style={{ color: currentColors.accent.secondary }}>
                  {stats.total_techniques}
                </p>
              </div>
              <div>
                <p className="text-xs" style={{ color: currentColors.text.secondary }}>
                  Sub-techniques
                </p>
                <p className="text-2xl font-bold" style={{ color: currentColors.text.primary }}>
                  {stats.total_subtechniques}
                </p>
              </div>
            </>
          )}
        </div>
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
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Map View */}
      {viewMode === 'map' && (
        <div style={{ height: 'calc(100vh - 340px)' }}>
          <WorldMap
            onActorClick={handleActorClick}
            highlightedActor={searchQuery || null}
            className="h-full"
          />
        </div>
      )}

      {/* List View: Two-Column Layout */}
      {viewMode === 'list' && (
        <div
          className={rightPanelView !== 'none' ? "grid grid-cols-[400px_1fr] gap-4" : "flex"}
          style={{ height: 'calc(100vh - 340px)' }}
        >
          {/* Column 1: Threat Actors */}
          <div
            className="rounded-lg p-4 flex flex-col overflow-hidden"
            style={{
              backgroundColor: currentColors.bg.primary,
              width: rightPanelView !== 'none' ? 'auto' : '400px',
              height: '100%'
            }}
          >
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: currentColors.text.primary }}>
              <Users size={20} style={{ color: currentColors.accent.error }} />
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

export default APTDashboard;
