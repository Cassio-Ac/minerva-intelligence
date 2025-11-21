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
import { Target, AlertCircle, Loader2, Shield, Brain, Database } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSettingsStore } from '@stores/settingsStore';
import ActorsList from '../../components/cti/ActorsList';
import AttackMatrix from '../../components/cti/AttackMatrix';
import ActorDetailsPanel from '../../components/cti/ActorDetailsPanel';
import { ctiService } from '../../services/cti/ctiService';

const CTIDashboard: React.FC = () => {
  const { currentColors } = useSettingsStore();
  const navigate = useNavigate();

  // View state: 'none' | 'details' | 'matrix'
  const [rightPanelView, setRightPanelView] = useState<'none' | 'details' | 'matrix'>('none');
  const [selectedActor, setSelectedActor] = useState<string | null>(null);
  const [highlightedTechniques, setHighlightedTechniques] = useState<string[]>([]);

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
      className="min-h-screen p-6"
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
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
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

      {/* Two-Column Layout: Actors List + Dynamic Right Panel */}
      <div
        className={rightPanelView !== 'none' ? "grid grid-cols-[400px_1fr] gap-4" : "flex"}
        style={{ height: 'calc(100vh - 320px)' }}
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
    </div>
  );
};

export default CTIDashboard;
