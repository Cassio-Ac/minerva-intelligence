/**
 * ActorDetailsPanel Component (Non-Modal Version)
 *
 * Displays comprehensive information about a threat actor in a side panel including:
 * - Basic information (name, aliases)
 * - Geopolitical data from MISP Galaxy (country, state sponsor, etc.)
 * - Associated malware families from Malpedia
 * - Targeted countries and sectors
 * - MITRE ATT&CK techniques with "View in Matrix" button
 */

import React, { useState, useEffect } from 'react';
import { X, Loader2, Globe, Flag, Target, Shield, Users, AlertTriangle, ExternalLink, Activity, Database } from 'lucide-react';
import { useSettingsStore } from '@stores/settingsStore';
import { ctiService, Actor, ActorGeopoliticalData, ActorTechniquesResponse } from '../../services/cti/ctiService';
import mispFeedsService, { MISPIoC } from '../../services/cti/mispFeedsService';

interface ActorDetailsPanelProps {
  actorName: string;
  onClose: () => void;
  onTechniquesLoaded?: (techniques: string[]) => void;
  onViewMatrix?: () => void;
}

const ActorDetailsPanel: React.FC<ActorDetailsPanelProps> = ({ actorName, onClose, onTechniquesLoaded, onViewMatrix }) => {
  const { currentColors } = useSettingsStore();

  // State
  const [actor, setActor] = useState<Actor | null>(null);
  const [geopoliticalData, setGeopoliticalData] = useState<ActorGeopoliticalData | null>(null);
  const [techniques, setTechniques] = useState<ActorTechniquesResponse | null>(null);
  const [iocs, setIOCs] = useState<MISPIoC[]>([]);
  const [loadingTechniques, setLoadingTechniques] = useState(false);
  const [loadingIOCs, setLoadingIOCs] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load data on mount
  useEffect(() => {
    loadActorData();
  }, [actorName]);

  const loadActorData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Load actor details (includes families)
      const actorData = await ctiService.actors.getActorDetail(actorName, {
        include_families: true
      });
      setActor(actorData);

      // Load geopolitical data from MISP Galaxy
      try {
        const geoData = await ctiService.enrichment.getActorGeopoliticalData(actorName);
        setGeopoliticalData(geoData);
      } catch (geoError) {
        console.warn('Geopolitical data not available:', geoError);
        // Non-critical error - continue with actor data only
      }

    } catch (error: any) {
      console.error('Error loading actor data:', error);
      setError(error.response?.data?.detail || 'Failed to load actor details');
    } finally {
      setLoading(false);
    }
  };

  const loadTechniques = async () => {
    setLoadingTechniques(true);
    try {
      const techniqueData = await ctiService.enrichment.getActorTechniques(actorName);
      setTechniques(techniqueData);
      // Notify parent dashboard to highlight techniques in matrix
      onTechniquesLoaded?.(techniqueData.techniques);
    } catch (error) {
      console.warn('MITRE ATT&CK techniques not available:', error);
      // Non-critical error - actor may not have enrichment yet
    } finally {
      setLoadingTechniques(false);
    }
  };

  const loadIOCs = async () => {
    setLoadingIOCs(true);
    try {
      const response = await mispFeedsService.listIOCs({
        threat_actor: actorName,
        limit: 20
      });
      setIOCs(response.iocs);
    } catch (error) {
      console.warn('IOCs not available for actor:', error);
      // Non-critical error
    } finally {
      setLoadingIOCs(false);
    }
  };

  return (
    <div
      className="h-full rounded-lg shadow-xl flex flex-col overflow-hidden"
      style={{ backgroundColor: currentColors.bg.primary }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between p-6 border-b"
        style={{
          backgroundColor: currentColors.bg.primary,
          borderColor: currentColors.border.default
        }}
      >
        <div className="flex items-center gap-3">
          <Shield size={24} style={{ color: currentColors.accent.primary }} />
          <h2 className="text-2xl font-semibold" style={{ color: currentColors.text.primary }}>
            {actorName}
          </h2>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded hover:bg-opacity-80 transition-colors"
          style={{ backgroundColor: currentColors.bg.secondary }}
        >
          <X size={20} style={{ color: currentColors.text.primary }} />
        </button>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-auto p-6 space-y-6">
        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center p-12">
            <Loader2 size={32} className="animate-spin" style={{ color: currentColors.accent.primary }} />
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="p-4 rounded" style={{ backgroundColor: '#fee2e2', color: '#991b1b' }}>
            <AlertTriangle size={20} className="inline mr-2" />
            {error}
          </div>
        )}

        {/* Content */}
        {!loading && !error && actor && (
          <>
            {/* Aliases */}
            {actor.aka && actor.aka.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-2" style={{ color: currentColors.text.secondary }}>
                  ALIASES
                </h3>
                <div className="flex flex-wrap gap-2">
                  {actor.aka.map((alias, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 rounded-full text-sm"
                      style={{
                        backgroundColor: currentColors.bg.secondary,
                        color: currentColors.text.primary
                      }}
                    >
                      {alias}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Geopolitical Data from MISP Galaxy */}
            {geopoliticalData?.found && (
              <div
                className="p-4 rounded-lg border"
                style={{
                  backgroundColor: currentColors.bg.secondary,
                  borderColor: currentColors.border.default
                }}
              >
                <div className="flex items-center gap-2 mb-4">
                  <Globe size={20} style={{ color: currentColors.accent.primary }} />
                  <h3 className="text-lg font-semibold" style={{ color: currentColors.text.primary }}>
                    Geopolitical Intelligence
                  </h3>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Country */}
                  {geopoliticalData.country && (
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Flag size={16} style={{ color: currentColors.text.secondary }} />
                        <p className="text-xs font-medium" style={{ color: currentColors.text.secondary }}>
                          Country of Origin
                        </p>
                      </div>
                      <p className="text-sm font-semibold" style={{ color: currentColors.text.primary }}>
                        {geopoliticalData.country}
                      </p>
                    </div>
                  )}

                  {/* State Sponsor */}
                  {geopoliticalData.state_sponsor && (
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Shield size={16} style={{ color: currentColors.text.secondary }} />
                        <p className="text-xs font-medium" style={{ color: currentColors.text.secondary }}>
                          State Sponsor
                        </p>
                      </div>
                      <p className="text-sm font-semibold" style={{ color: currentColors.text.primary }}>
                        {geopoliticalData.state_sponsor}
                      </p>
                    </div>
                  )}

                  {/* Military Unit */}
                  {geopoliticalData.military_unit && (
                    <div className="col-span-2">
                      <div className="flex items-center gap-2 mb-1">
                        <Users size={16} style={{ color: currentColors.text.secondary }} />
                        <p className="text-xs font-medium" style={{ color: currentColors.text.secondary }}>
                          Military Unit
                        </p>
                      </div>
                      <p className="text-sm font-semibold" style={{ color: currentColors.text.primary }}>
                        {geopoliticalData.military_unit}
                      </p>
                    </div>
                  )}

                  {/* Attribution Confidence */}
                  {geopoliticalData.attribution_confidence && (
                    <div>
                      <p className="text-xs font-medium mb-1" style={{ color: currentColors.text.secondary }}>
                        Attribution Confidence
                      </p>
                      <p className="text-sm font-semibold" style={{ color: currentColors.text.primary }}>
                        {geopoliticalData.attribution_confidence}
                      </p>
                    </div>
                  )}

                  {/* Incident Type */}
                  {geopoliticalData.incident_type && (
                    <div>
                      <p className="text-xs font-medium mb-1" style={{ color: currentColors.text.secondary }}>
                        Incident Type
                      </p>
                      <p className="text-sm font-semibold" style={{ color: currentColors.text.primary }}>
                        {geopoliticalData.incident_type}
                      </p>
                    </div>
                  )}
                </div>

                {/* Targeted Countries */}
                {geopoliticalData.targeted_countries.length > 0 && (
                  <div className="mt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Target size={16} style={{ color: currentColors.text.secondary }} />
                      <p className="text-xs font-medium" style={{ color: currentColors.text.secondary }}>
                        Targeted Countries
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {geopoliticalData.targeted_countries.map((country, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-1 rounded text-xs"
                          style={{
                            backgroundColor: currentColors.bg.primary,
                            color: currentColors.text.primary
                          }}
                        >
                          {country}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Targeted Sectors */}
                {geopoliticalData.targeted_sectors.length > 0 && (
                  <div className="mt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Target size={16} style={{ color: currentColors.text.secondary }} />
                      <p className="text-xs font-medium" style={{ color: currentColors.text.secondary }}>
                        Targeted Sectors
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {geopoliticalData.targeted_sectors.map((sector, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-1 rounded text-xs"
                          style={{
                            backgroundColor: currentColors.bg.primary,
                            color: currentColors.text.primary
                          }}
                        >
                          {sector}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Description */}
                {geopoliticalData.description && (
                  <div className="mt-4">
                    <p className="text-xs font-medium mb-1" style={{ color: currentColors.text.secondary }}>
                      Description
                    </p>
                    <p className="text-sm" style={{ color: currentColors.text.primary }}>
                      {geopoliticalData.description}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Associated Malware Families */}
            {actor.familias_relacionadas && actor.familias_relacionadas.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-3" style={{ color: currentColors.text.secondary }}>
                  ASSOCIATED MALWARE FAMILIES ({actor.familias_relacionadas.length})
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {actor.familias_relacionadas.map((family, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded border"
                      style={{
                        backgroundColor: currentColors.bg.secondary,
                        borderColor: currentColors.border.default
                      }}
                    >
                      <p className="text-sm font-medium" style={{ color: currentColors.text.primary }}>
                        {family}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Description */}
            {actor.explicacao && (
              <div>
                <h3 className="text-sm font-semibold mb-2" style={{ color: currentColors.text.secondary }}>
                  DESCRIPTION
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: currentColors.text.primary }}>
                  {actor.explicacao}
                </p>
              </div>
            )}

            {/* MITRE ATT&CK Techniques - Dynamic Load */}
            <div
              className="p-4 rounded-lg border"
              style={{
                backgroundColor: currentColors.bg.secondary,
                borderColor: currentColors.border.default
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Activity size={20} style={{ color: currentColors.accent.primary }} />
                  <h3 className="text-lg font-semibold" style={{ color: currentColors.text.primary }}>
                    MITRE ATT&CK Techniques
                  </h3>
                </div>
                {!techniques && !loadingTechniques && (
                  <button
                    onClick={loadTechniques}
                    className="px-3 py-1 rounded text-sm hover:opacity-80 transition-opacity"
                    style={{
                      backgroundColor: currentColors.accent.primary,
                      color: '#fff'
                    }}
                  >
                    Load Techniques
                  </button>
                )}
              </div>

              {loadingTechniques && (
                <div className="flex justify-center p-4">
                  <Loader2 size={20} className="animate-spin" style={{ color: currentColors.accent.primary }} />
                </div>
              )}

              {techniques && (
                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-xs" style={{ color: currentColors.text.secondary }}>
                      {techniques.techniques_count} techniques identified
                      {techniques.from_cache && <span className="ml-2">(cached)</span>}
                    </span>
                    {techniques.techniques_count > 0 && onViewMatrix && (
                      <button
                        onClick={() => {
                          onViewMatrix();
                        }}
                        className="px-3 py-1 rounded text-xs hover:opacity-80 transition-opacity flex items-center gap-1"
                        style={{
                          backgroundColor: currentColors.accent.primary,
                          color: '#fff'
                        }}
                      >
                        <ExternalLink size={12} />
                        View in Matrix
                      </button>
                    )}
                  </div>

                  {techniques.techniques_count > 0 ? (
                    <div className="grid grid-cols-3 gap-2">
                      {techniques.techniques.map((techId) => (
                        <div
                          key={techId}
                          className="px-2 py-1.5 rounded text-center text-xs font-mono"
                          style={{
                            backgroundColor: currentColors.bg.primary,
                            color: currentColors.accent.primary,
                            border: `1px solid ${currentColors.accent.primary}`
                          }}
                        >
                          {techId}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-center py-4" style={{ color: currentColors.text.secondary }}>
                      No MITRE ATT&CK mapping available for this actor
                    </p>
                  )}
                </div>
              )}

              {!techniques && !loadingTechniques && (
                <p className="text-sm text-center py-4" style={{ color: currentColors.text.secondary }}>
                  Click "Load Techniques" to view MITRE ATT&CK mapping
                </p>
              )}
            </div>

            {/* References */}
            {actor.referencias && actor.referencias.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-2" style={{ color: currentColors.text.secondary }}>
                  REFERENCES
                </h3>
                <div className="space-y-2">
                  {actor.referencias.map((ref, idx) => (
                    <a
                      key={idx}
                      href={ref.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm hover:underline"
                      style={{ color: currentColors.accent.primary }}
                    >
                      <ExternalLink size={14} />
                      {ref.desc || ref.url}
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* MISP IOCs - Related Indicators */}
            <div
              className="p-4 rounded-lg border"
              style={{
                backgroundColor: currentColors.bg.secondary,
                borderColor: currentColors.border.default
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Database size={20} style={{ color: '#f59e0b' }} />
                  <h3 className="text-lg font-semibold" style={{ color: currentColors.text.primary }}>
                    MISP IOCs
                  </h3>
                </div>
                {iocs.length === 0 && !loadingIOCs && (
                  <button
                    onClick={loadIOCs}
                    className="px-3 py-1 rounded text-sm hover:opacity-80 transition-opacity"
                    style={{
                      backgroundColor: '#f59e0b',
                      color: '#fff'
                    }}
                  >
                    Load IOCs
                  </button>
                )}
              </div>

              {loadingIOCs && (
                <div className="flex justify-center p-4">
                  <Loader2 size={20} className="animate-spin" style={{ color: '#f59e0b' }} />
                </div>
              )}

              {iocs.length > 0 && (
                <div>
                  <div className="mb-3">
                    <span className="text-xs" style={{ color: currentColors.text.secondary }}>
                      {iocs.length} IOCs found in MISP feeds
                    </span>
                  </div>

                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {iocs.map((ioc) => (
                      <div
                        key={ioc.id}
                        className="p-3 rounded border"
                        style={{
                          backgroundColor: currentColors.bg.primary,
                          borderColor: currentColors.border.default
                        }}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-mono text-xs mb-1 break-all" style={{ color: currentColors.text.primary }}>
                              {ioc.value}
                            </p>
                            <div className="flex gap-1 flex-wrap">
                              <span
                                className="px-2 py-0.5 rounded text-xs"
                                style={{
                                  backgroundColor: ioc.type === 'ip' ? '#3b82f6' : ioc.type === 'domain' ? '#10b981' : ioc.type === 'url' ? '#8b5cf6' : '#06b6d4',
                                  color: '#fff'
                                }}
                              >
                                {ioc.type}
                              </span>
                              {ioc.malware_family && (
                                <span
                                  className="px-2 py-0.5 rounded text-xs"
                                  style={{ backgroundColor: '#dc2626', color: '#fff' }}
                                >
                                  {ioc.malware_family}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {iocs.length === 0 && !loadingIOCs && (
                <p className="text-sm text-center py-4" style={{ color: currentColors.text.secondary }}>
                  Click "Load IOCs" to view indicators from MISP feeds
                </p>
              )}
            </div>

            {/* Malpedia Link */}
            {actor.url && (
              <div className="pt-4 border-t" style={{ borderColor: currentColors.border.default }}>
                <a
                  href={actor.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm hover:underline"
                  style={{ color: currentColors.accent.primary }}
                >
                  <ExternalLink size={14} />
                  View on Malpedia
                </a>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ActorDetailsPanel;
