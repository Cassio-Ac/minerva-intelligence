/**
 * DataLeaksPage - Data Breaches & Leaks Feed with Floating AI Chat
 *
 * Features:
 * - Breaches grid as main focus
 * - Timeline chart with daily breach counts
 * - Filter bar with search, sources, types, and date range
 * - Floating AI chat for breach analysis
 */

import React, { useState, useEffect, useCallback } from 'react';
import { api } from '@services/api';
import { useSettingsStore } from '@stores/settingsStore';
import BreachTimeline from '../components/breaches/BreachTimeline';
import BreachGrid from '../components/breaches/BreachGrid';
import BreachFilterBar from '../components/breaches/BreachFilterBar';
import FloatingChat from '../components/rss/FloatingChat';

interface BreachEntry {
  id: number;
  date: string;
  breach_source: string;
  breach_content: string;
  breach_author: string;
  breach_type: string;
}

interface BreachStats {
  total_breaches: number;
  breaches_today: number;
  breaches_this_week: number;
  breaches_this_month: number;
  breaches_by_type: Record<string, number>;
  top_sources: Array<{ name: string; count: number }>;
  top_authors: Array<{ name: string; count: number }>;
  timeline: Array<{ date: string; count: number }>;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const DataLeaksPage: React.FC = () => {
  const { currentColors } = useSettingsStore();

  // Data state
  const [breaches, setBreaches] = useState<BreachEntry[]>([]);
  const [stats, setStats] = useState<BreachStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState('7d');

  // Fetch stats and breaches
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch stats for timeline
      const statsResponse = await api.get<BreachStats>('/breaches/stats');
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

      // Fetch breaches with filters
      const limit = dateRange === 'all' ? 1000 : 50;

      const breachesResponse = await api.post<{
        total: number;
        breaches: BreachEntry[];
        facets?: any;
        took_ms: number;
      }>(
        '/breaches/search',
        {
          query: searchQuery || undefined,
          types: selectedTypes.length > 0 ? selectedTypes : undefined,
          sources: selectedSources.length > 0 ? selectedSources : undefined,
          date_from: dateFrom?.toISOString(),
          limit,
          offset: 0,
          sort_by: 'date',
          sort_order: 'desc',
        }
      );

      setBreaches(breachesResponse.data.breaches);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, selectedTypes, selectedSources, dateRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Chat handler
  const handleSendMessage = async (message: string, context: Message[]): Promise<string> => {
    try {
      const response = await api.post<{ answer: string; context_used: number }>('/breaches/chat', {
        query: message,
        breach_type: selectedTypes.length === 1 ? selectedTypes[0] : undefined,
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

  // Get available types and sources from stats
  const availableTypes = stats
    ? Object.keys(stats.breaches_by_type).filter(type => stats.breaches_by_type[type] > 0)
    : [];

  const availableSources = stats && stats.top_sources
    ? stats.top_sources.map(source => source.name)
    : [];

  // Filter timeline data based on selected date range
  const getFilteredTimeline = () => {
    if (!stats || !stats.timeline.length) return [];

    // If types or sources are selected, we need to build timeline from filtered breaches
    if (selectedTypes.length > 0 || selectedSources.length > 0) {
      // Group breaches by date
      const timelineMap = new Map<string, number>();

      breaches.forEach(breach => {
        const date = new Date(breach.date).toISOString().split('T')[0];
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
            Data Leaks & Breaches
          </h1>

          {/* Stats Summary */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div
                className="rounded-lg shadow p-4"
                style={{ backgroundColor: currentColors.bg.primary }}
              >
                <div className="text-sm" style={{ color: currentColors.text.secondary }}>
                  Total de Vazamentos
                </div>
                <div className="text-2xl font-bold" style={{ color: currentColors.text.primary }}>
                  {stats.total_breaches.toLocaleString()}
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
                  {stats.breaches_today}
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
                  {stats.breaches_this_week}
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
                  {stats.breaches_this_month.toLocaleString()}
                </div>
              </div>
            </div>
          )}

          {/* Timeline Chart */}
          {stats && getFilteredTimeline().length > 0 && (
            <BreachTimeline data={getFilteredTimeline()} />
          )}
        </div>

        {/* Filter Bar */}
        <BreachFilterBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedTypes={selectedTypes}
          onTypeChange={setSelectedTypes}
          selectedSources={selectedSources}
          onSourceChange={setSelectedSources}
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          types={availableTypes}
          sources={availableSources}
        />
      </div>

      {/* Scrollable Breaches Grid Container */}
      <div className="flex-1 overflow-y-auto">
        <div className="container mx-auto px-4 pb-8">
          {/* Breaches Grid */}
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
            </div>
          ) : (
            <BreachGrid breaches={breaches} />
          )}
        </div>
      </div>

      {/* Floating Chat */}
      <FloatingChat onSendMessage={handleSendMessage} />
    </div>
  );
};

export default DataLeaksPage;
