/**
 * CVEPage - CVE Vulnerabilities Feed with Floating AI Chat
 *
 * Features:
 * - CVE grid as main focus
 * - Timeline chart with daily CVE counts
 * - Filter bar with search, severity levels, sources, and date range
 * - Floating AI chat for CVE analysis
 */

import React, { useState, useEffect, useCallback } from 'react';
import { api } from '@services/api';
import { useSettingsStore } from '@stores/settingsStore';
import CVETimeline from '../components/cve/CVETimeline';
import CVEGrid from '../components/cve/CVEGrid';
import CVEFilterBar from '../components/cve/CVEFilterBar';
import FloatingChat from '../components/rss/FloatingChat';

interface CVEEntry {
  id: number;
  date: string;
  cve_id: string;
  cve_title: string;
  cve_content: string;
  cve_severity_level: string;
  cve_severity_score: number;
}

interface CVEStats {
  total_cves: number;
  cves_today: number;
  cves_this_week: number;
  cves_this_month: number;
  cves_by_severity: Record<string, number>;
  top_sources: Array<{ name: string; count: number }>;
  timeline: Array<{ date: string; count: number }>;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const CVEPage: React.FC = () => {
  const { currentColors } = useSettingsStore();

  // Data state
  const [cves, setCVEs] = useState<CVEEntry[]>([]);
  const [stats, setStats] = useState<CVEStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSeverityLevels, setSelectedSeverityLevels] = useState<string[]>([]);
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState('7d');

  // Fetch stats and CVEs
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch stats for timeline
      const statsResponse = await api.get<CVEStats>('/cves/stats');
      setStats(statsResponse.data);

      // Build date filter
      let dateFrom: Date | undefined;
      const now = new Date();
      if (dateRange === '24h') {
        dateFrom = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      } else if (dateRange === '7d') {
        dateFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      } else if (dateRange === '30d') {
        dateFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }

      // Fetch CVEs with filters
      const limit = dateRange === 'all' ? 1000 : 50;

      const cvesResponse = await api.post<{
        total: number;
        cves: CVEEntry[];
        facets?: any;
        took_ms: number;
      }>(
        '/cves/search',
        {
          query: searchQuery || undefined,
          severity_levels: selectedSeverityLevels.length > 0 ? selectedSeverityLevels : undefined,
          sources: selectedSources.length > 0 ? selectedSources : undefined,
          date_from: dateFrom?.toISOString(),
          limit,
          offset: 0,
          sort_by: 'date',
          sort_order: 'desc',
        }
      );

      setCVEs(cvesResponse.data.cves);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, selectedSeverityLevels, selectedSources, dateRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Chat handler
  const handleSendMessage = async (message: string, context: Message[]): Promise<string> => {
    try {
      const response = await api.post<{ answer: string; context_used: number }>('/cves/chat', {
        query: message,
        severity_level: selectedSeverityLevels.length === 1 ? selectedSeverityLevels[0] : undefined,
        source: selectedSources.length === 1 ? selectedSources[0] : undefined,
        days: dateRange === '24h' ? 1 : dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 365,
        max_context: 10,
      });

      return response.data.answer;
    } catch (error) {
      console.error('Error sending chat message:', error);
      throw error;
    }
  };

  // Get available severity levels and sources from stats
  const availableSeverityLevels = stats
    ? Object.keys(stats.cves_by_severity).filter(level => stats.cves_by_severity[level] > 0)
    : [];

  const availableSources = stats && stats.top_sources
    ? stats.top_sources.map(source => source.name)
    : [];

  // Filter timeline data based on selected date range
  const getFilteredTimeline = () => {
    if (!stats || !stats.timeline.length) return [];

    // If severity levels or sources are selected, we need to build timeline from filtered CVEs
    if (selectedSeverityLevels.length > 0 || selectedSources.length > 0) {
      // Group CVEs by date
      const timelineMap = new Map<string, number>();

      cves.forEach(cve => {
        const date = new Date(cve.date).toISOString().split('T')[0];
        timelineMap.set(date, (timelineMap.get(date) || 0) + 1);
      });

      // Convert to timeline array and sort by date
      const timeline = Array.from(timelineMap.entries())
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date));

      return timeline;
    }

    // Otherwise filter the global timeline by date range only
    const now = new Date();
    let cutoffDate: Date;

    switch (dateRange) {
      case '24h':
        cutoffDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default: // 'all'
        return stats.timeline;
    }

    return stats.timeline.filter(item => {
      const itemDate = new Date(item.date);
      return itemDate >= cutoffDate;
    });
  };

  return (
    <div className="h-screen flex flex-col" style={{ backgroundColor: currentColors.bg.secondary }}>
      <div className="container mx-auto px-4 py-8 flex-shrink-0">
        {/* Header with Timeline */}
        <div className="mb-8">
          <h1
            className="text-3xl font-bold mb-6"
            style={{ color: currentColors.text.primary }}
          >
            CVE Vulnerabilities
          </h1>

          {/* Stats Summary */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div
                className="rounded-lg shadow p-4"
                style={{ backgroundColor: currentColors.bg.primary }}
              >
                <div className="text-sm" style={{ color: currentColors.text.secondary }}>
                  Total de CVEs
                </div>
                <div className="text-2xl font-bold" style={{ color: currentColors.text.primary }}>
                  {stats.total_cves.toLocaleString()}
                </div>
              </div>
              <div
                className="rounded-lg shadow p-4"
                style={{ backgroundColor: currentColors.bg.primary }}
              >
                <div className="text-sm" style={{ color: currentColors.text.secondary }}>
                  Hoje
                </div>
                <div className="text-2xl font-bold" style={{ color: currentColors.text.primary }}>
                  {stats.cves_today}
                </div>
              </div>
              <div
                className="rounded-lg shadow p-4"
                style={{ backgroundColor: currentColors.bg.primary }}
              >
                <div className="text-sm" style={{ color: currentColors.text.secondary }}>
                  Esta Semana
                </div>
                <div className="text-2xl font-bold" style={{ color: currentColors.text.primary }}>
                  {stats.cves_this_week}
                </div>
              </div>
              <div
                className="rounded-lg shadow p-4"
                style={{ backgroundColor: currentColors.bg.primary }}
              >
                <div className="text-sm" style={{ color: currentColors.text.secondary }}>
                  Este Mês
                </div>
                <div className="text-2xl font-bold" style={{ color: currentColors.text.primary }}>
                  {stats.cves_this_month.toLocaleString()}
                </div>
              </div>
            </div>
          )}

          {/* Timeline Chart */}
          {stats && getFilteredTimeline().length > 0 && (
            <CVETimeline data={getFilteredTimeline()} />
          )}
        </div>

        {/* Filter Bar */}
        <CVEFilterBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedSeverityLevels={selectedSeverityLevels}
          onSeverityLevelChange={setSelectedSeverityLevels}
          selectedSources={selectedSources}
          onSourceChange={setSelectedSources}
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          severityLevels={availableSeverityLevels}
          sources={availableSources}
        />
      </div>

      {/* Scrollable CVEs Grid Container */}
      <div className="flex-1 overflow-y-auto">
        <div className="container mx-auto px-4 pb-8">
          {/* CVEs Grid */}
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <CVEGrid cves={cves} />
          )}
        </div>
      </div>

      {/* Floating Chat */}
      <FloatingChat onSendMessage={handleSendMessage} />
    </div>
  );
};

export default CVEPage;
