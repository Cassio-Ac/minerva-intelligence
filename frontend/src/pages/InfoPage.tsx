/**
 * InfoPage - RSS News Feed with Floating AI Chat
 *
 * Features:
 * - News grid as main focus
 * - Timeline chart with daily article counts
 * - Filter bar with search, categories, and date range
 * - Floating AI chat for news analysis
 */

import React, { useState, useEffect, useCallback } from 'react';
import { api } from '@services/api';
import { useSettingsStore } from '@stores/settingsStore';
import NewsTimeline from '../components/rss/NewsTimeline';
import NewsGrid from '../components/rss/NewsGrid';
import FilterBar from '../components/rss/FilterBar';
import FloatingChat from '../components/rss/FloatingChat';

interface RSSArticle {
  content_hash: string;
  title: string;
  link: string;
  published: string;
  summary: string;
  author?: string;
  tags: string[];
  category: string;
  feed_name: string;
  feed_title?: string;
  feed_description?: string;
  feed_link?: string;
  feed_updated?: string;
  collected_at: string;
  source_type?: string;
  '@timestamp'?: string;
  sentiment?: string;
  entities?: string[];
  keywords?: string[];
}

interface RSSStats {
  total_articles: number;
  total_sources: number;
  active_sources: number;
  total_categories: number;
  articles_today: number;
  articles_this_week: number;
  articles_this_month: number;
  last_collection_at?: string;
  top_sources: Array<{ name: string; count: number }>;
  articles_by_category: Record<string, number>;
  timeline: Array<{ date: string; count: number }>;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const InfoPage: React.FC = () => {
  const { currentColors } = useSettingsStore();

  // Data state
  const [articles, setArticles] = useState<RSSArticle[]>([]);
  const [stats, setStats] = useState<RSSStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState('7d');

  // Fetch stats and articles
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch stats for timeline
      const statsResponse = await api.get<RSSStats>('/rss/stats');
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

      // Fetch articles with filters
      // Use larger limit for "all" period to build proper timeline
      const limit = dateRange === 'all' ? 10000 : 50;

      const articlesResponse = await api.post<{ total: number; articles: RSSArticle[] }>(
        '/rss/articles/search',
        {
          query: searchQuery || undefined,
          categories: selectedCategories.length > 0 ? selectedCategories : undefined,
          feed_names: selectedSources.length > 0 ? selectedSources : undefined,
          date_from: dateFrom?.toISOString(),
          limit,
          offset: 0,
          sort_by: 'published',
          sort_order: 'desc',
        }
      );

      setArticles(articlesResponse.data.articles);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, selectedCategories, selectedSources, dateRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Sync Now handler
  const handleSyncNow = async () => {
    setSyncing(true);
    try {
      // Send empty object to collect all active sources
      await api.post('/rss/collect', {});
      // Wait a bit for collection to complete, then refresh data
      setTimeout(() => {
        fetchData();
        setSyncing(false);
      }, 60000); // 60 seconds - collection takes time
    } catch (error) {
      console.error('Error triggering RSS sync:', error);
      setSyncing(false);
    }
  };

  // Chat handler
  const handleSendMessage = async (message: string, context: Message[]): Promise<string> => {
    try {
      const response = await api.post<{ answer: string }>('/rss/chat', {
        query: message,
        categories: selectedCategories.length > 0 ? selectedCategories : undefined,
        sources: selectedSources.length > 0 ? selectedSources : undefined,
        max_context_articles: 10,
        context: context.map(msg => ({ role: msg.role, content: msg.content })),
      });

      return response.data.answer;
    } catch (error) {
      console.error('Error sending chat message:', error);
      throw error;
    }
  };

  // Get available categories and sources from stats
  const availableCategories = stats
    ? Object.keys(stats.articles_by_category).filter(cat => stats.articles_by_category[cat] > 0)
    : [];

  const availableSources = stats && stats.all_sources
    ? stats.all_sources.map(source => source.name)
    : [];

  // Filter timeline data based on selected date range, categories, and sources
  const getFilteredTimeline = () => {
    // If no filters are selected (or just date filter), return the global timeline
    if (!stats || !stats.timeline.length) return [];

    // If categories or sources are selected, we need to build timeline from filtered articles
    if (selectedCategories.length > 0 || selectedSources.length > 0) {
      // Group articles by date
      const timelineMap = new Map<string, number>();

      articles.forEach(article => {
        const date = new Date(article.published).toISOString().split('T')[0];
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
            Feed de Notícias
          </h1>

          {/* Stats Summary */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div
                className="rounded-lg shadow p-4"
                style={{ backgroundColor: currentColors.bg.primary }}
              >
                <div className="text-sm" style={{ color: currentColors.text.secondary }}>
                  Total de Artigos
                </div>
                <div className="text-2xl font-bold" style={{ color: currentColors.text.primary }}>
                  {stats.total_articles}
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
                  {stats.articles_today}
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
                  {stats.articles_this_week}
                </div>
              </div>
              <div
                className="rounded-lg shadow p-4"
                style={{ backgroundColor: currentColors.bg.primary }}
              >
                <div className="text-sm" style={{ color: currentColors.text.secondary }}>
                  Fontes Ativas
                </div>
                <div className="text-2xl font-bold" style={{ color: currentColors.text.primary }}>
                  {stats.active_sources}
                </div>
              </div>
            </div>
          )}

          {/* Timeline Chart */}
          {stats && getFilteredTimeline().length > 0 && (
            <NewsTimeline data={getFilteredTimeline()} />
          )}
        </div>

        {/* Filter Bar */}
        <FilterBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedCategories={selectedCategories}
          onCategoryChange={setSelectedCategories}
          selectedSources={selectedSources}
          onSourceChange={setSelectedSources}
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          categories={availableCategories}
          sources={availableSources}
          onSyncNow={handleSyncNow}
        />
      </div>

      {/* Scrollable News Grid Container */}
      <div className="flex-1 overflow-y-auto">
        <div className="container mx-auto px-4 pb-8">
          {/* News Grid */}
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <NewsGrid articles={articles} />
          )}
        </div>
      </div>

      {/* Floating Chat */}
      <FloatingChat onSendMessage={handleSendMessage} />
    </div>
  );
};

export default InfoPage;
