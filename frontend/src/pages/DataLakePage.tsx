/**
 * DataLakePage - Consulta de Credenciais no Data Lake
 *
 * Features:
 * - Collapsible timeline chart (top)
 * - Search across ~100M leaked credentials
 * - Statistics sidebar
 * - Top domains
 * - Pagination
 * - Copy to clipboard
 */

import React, { useState, useEffect, useCallback } from 'react';
import { api } from '@services/api';
import { useSettingsStore } from '@stores/settingsStore';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface CredentialResult {
  usuario: string;
  senha: string;
  url: string | null;
  dominio_email: string | null;
  dominio_url: string | null;
  complexidade_senha: string | null;
  forca_senha: number | null;
  tamanho_senha: number | null;
  data_breach: string | null;
  arquivo: string | null;
  grupo_telegram: string | null;
  padrao_detectado: string | null;
}

interface SearchResponse {
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  results: CredentialResult[];
  query: string;
  search_time_ms: number;
}

interface DataLakeStats {
  total_credentials: number;
  unique_domains: number;
  unique_email_domains: number;
  by_complexity: Record<string, number>;
  by_pattern: Record<string, number>;
  recent_ingestions: number;
  avg_password_strength: number;
}

interface TimelineItem {
  date: string;
  count: number;
}

interface TopDomain {
  domain: string;
  count: number;
}

const DataLakePage: React.FC = () => {
  const { currentColors } = useSettingsStore();

  // Search state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchResults, setSearchResults] = useState<SearchResponse | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Stats state
  const [stats, setStats] = useState<DataLakeStats | null>(null);
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [topDomains, setTopDomains] = useState<TopDomain[]>([]);
  const [loadingStats, setLoadingStats] = useState<boolean>(true);

  // UI state
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [showPasswords, setShowPasswords] = useState<boolean>(false);
  const [showTimeline, setShowTimeline] = useState<boolean>(true);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      const response = await api.get<DataLakeStats>('/credentials/datalake/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  }, []);

  // Fetch timeline
  const fetchTimeline = useCallback(async () => {
    try {
      const response = await api.get<{ timeline: TimelineItem[] }>('/credentials/datalake/timeline?months=12');
      setTimeline(response.data.timeline);
    } catch (error) {
      console.error('Error fetching timeline:', error);
    }
  }, []);

  // Fetch top domains
  const fetchTopDomains = useCallback(async () => {
    try {
      const response = await api.get<{ domains: TopDomain[] }>('/credentials/datalake/top-domains?domain_type=url&limit=10');
      setTopDomains(response.data.domains);
    } catch (error) {
      console.error('Error fetching top domains:', error);
    }
  }, []);

  // Search credentials
  const searchCredentials = useCallback(async (page: number = 1) => {
    if (!searchQuery.trim() || searchQuery.trim().length < 3) {
      setSearchError('Digite pelo menos 3 caracteres para buscar');
      return;
    }

    setIsSearching(true);
    setSearchError(null);

    try {
      const response = await api.get<SearchResponse>(
        `/credentials/datalake/search?q=${encodeURIComponent(searchQuery.trim())}&page=${page}&page_size=50`
      );
      setSearchResults(response.data);
      setCurrentPage(page);
    } catch (error: any) {
      console.error('Error searching:', error);
      setSearchError(error.response?.data?.detail || 'Erro ao buscar credenciais');
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery]);

  // Copy to clipboard
  const copyToClipboard = useCallback((text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  }, []);

  // Initial load
  useEffect(() => {
    const loadData = async () => {
      setLoadingStats(true);
      await Promise.all([fetchStats(), fetchTimeline(), fetchTopDomains()]);
      setLoadingStats(false);
    };
    loadData();
  }, [fetchStats, fetchTimeline, fetchTopDomains]);

  // Format number
  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toLocaleString('pt-BR');
  };

  return (
    <div style={{
      height: '100%',
      backgroundColor: currentColors.bg.primary,
      color: currentColors.text.primary,
      padding: '12px',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      boxSizing: 'border-box'
    }}>
      {/* Timeline Chart - Top (Collapsible) */}
      <div style={{
        backgroundColor: currentColors.bg.secondary,
        borderRadius: '8px',
        padding: showTimeline ? '12px' : '8px 12px',
        marginBottom: '12px',
        border: `1px solid ${currentColors.border.default}`,
        flexShrink: 0
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: showTimeline ? '8px' : '0'
        }}>
          <div>
            <h3 style={{ margin: '0', color: currentColors.text.primary, fontSize: '14px' }}>
              Timeline de Vazamentos (12 Meses)
            </h3>
            {!showTimeline && stats && (
              <span style={{ fontSize: '12px', color: currentColors.text.secondary, marginLeft: '12px' }}>
                {formatNumber(stats.total_credentials)} credenciais indexadas
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
              color: currentColors.text.secondary,
              cursor: 'pointer'
            }}>
              <input
                type="checkbox"
                checked={showPasswords}
                onChange={(e) => setShowPasswords(e.target.checked)}
              />
              Mostrar senhas
            </label>
            <button
              onClick={() => setShowTimeline(!showTimeline)}
              style={{
                padding: '6px 12px',
                backgroundColor: currentColors.bg.tertiary,
                border: `1px solid ${currentColors.border.default}`,
                borderRadius: '6px',
                color: currentColors.text.secondary,
                cursor: 'pointer',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              {showTimeline ? '▲ Ocultar' : '▼ Mostrar'}
            </button>
          </div>
        </div>
        {showTimeline && (
          timeline.length > 0 ? (
            <div style={{ height: '150px', width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timeline}>
                  <CartesianGrid strokeDasharray="3 3" stroke={currentColors.border.default} />
                  <XAxis
                    dataKey="date"
                    stroke={currentColors.text.secondary}
                    tick={{ fill: currentColors.text.secondary, fontSize: 11 }}
                  />
                  <YAxis
                    stroke={currentColors.text.secondary}
                    tick={{ fill: currentColors.text.secondary, fontSize: 11 }}
                    tickFormatter={formatNumber}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: currentColors.bg.secondary,
                      border: `1px solid ${currentColors.border.default}`,
                      borderRadius: '8px',
                      color: currentColors.text.primary
                    }}
                    formatter={(value: number) => [formatNumber(value), 'Credenciais']}
                  />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="#f97316"
                    strokeWidth={2}
                    fill="#f9731633"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div style={{
              height: '150px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: currentColors.text.secondary
            }}>
              Carregando timeline...
            </div>
          )
        )}
      </div>

      {/* Main Layout - 2 Columns */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 280px',
        gap: '12px',
        flex: 1,
        minHeight: 0,
        overflow: 'hidden'
      }}>
        {/* Left - Search & Results */}
        <div style={{
          backgroundColor: currentColors.bg.secondary,
          borderRadius: '8px',
          border: `1px solid ${currentColors.border.default}`,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          {/* Search Form */}
          <div style={{
            padding: '12px',
            borderBottom: `1px solid ${currentColors.border.default}`
          }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                placeholder="Buscar por empresa, dominio, email, usuario..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && searchCredentials(1)}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  backgroundColor: currentColors.bg.tertiary,
                  border: `1px solid ${currentColors.border.default}`,
                  borderRadius: '6px',
                  color: currentColors.text.primary,
                  fontSize: '14px'
                }}
              />
              <button
                onClick={() => searchCredentials(1)}
                disabled={isSearching || searchQuery.trim().length < 3}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#f97316',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: (isSearching || searchQuery.trim().length < 3) ? 'not-allowed' : 'pointer',
                  fontWeight: '600',
                  fontSize: '14px',
                  opacity: (isSearching || searchQuery.trim().length < 3) ? 0.6 : 1
                }}
              >
                {isSearching ? 'Buscando...' : 'Buscar'}
              </button>
            </div>
            {searchError && (
              <div style={{
                marginTop: '8px',
                padding: '8px 12px',
                backgroundColor: '#dc262633',
                borderRadius: '6px',
                color: '#dc2626',
                fontSize: '12px'
              }}>
                {searchError}
              </div>
            )}
          </div>

          {/* Results */}
          <div style={{ flex: 1, overflow: 'auto', padding: '12px' }}>
            {searchResults ? (
              <>
                {/* Results Header */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '12px',
                  paddingBottom: '8px',
                  borderBottom: `1px solid ${currentColors.border.default}`
                }}>
                  <div style={{ fontSize: '13px', color: currentColors.text.secondary }}>
                    <strong style={{ color: '#f97316' }}>{searchResults.total.toLocaleString('pt-BR')}</strong> resultados para "{searchResults.query}"
                    <span style={{ marginLeft: '8px', opacity: 0.7 }}>({searchResults.search_time_ms}ms)</span>
                  </div>
                  <div style={{ fontSize: '12px', color: currentColors.text.secondary }}>
                    Pagina {searchResults.page} de {searchResults.total_pages}
                  </div>
                </div>

                {/* Results Table */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {searchResults.results.map((cred, index) => (
                    <div
                      key={index}
                      style={{
                        padding: '10px 12px',
                        backgroundColor: currentColors.bg.tertiary,
                        borderRadius: '6px',
                        border: `1px solid ${currentColors.border.default}`,
                        fontSize: '12px'
                      }}
                    >
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr auto',
                        gap: '12px',
                        alignItems: 'center'
                      }}>
                        {/* Usuario */}
                        <div>
                          <div style={{ color: currentColors.text.secondary, marginBottom: '2px', fontSize: '10px' }}>
                            USUARIO
                          </div>
                          <div style={{
                            fontFamily: 'monospace',
                            color: '#3b82f6',
                            wordBreak: 'break-all'
                          }}>
                            {cred.usuario}
                          </div>
                        </div>

                        {/* Senha */}
                        <div>
                          <div style={{ color: currentColors.text.secondary, marginBottom: '2px', fontSize: '10px' }}>
                            SENHA
                          </div>
                          <div style={{
                            fontFamily: 'monospace',
                            color: '#22c55e',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                          }}>
                            <span style={{ wordBreak: 'break-all' }}>
                              {showPasswords ? cred.senha : '••••••••'}
                            </span>
                            <button
                              onClick={() => copyToClipboard(`${cred.usuario}:${cred.senha}`, index)}
                              style={{
                                padding: '2px 6px',
                                backgroundColor: copiedIndex === index ? '#22c55e' : currentColors.bg.secondary,
                                border: `1px solid ${currentColors.border.default}`,
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '10px',
                                color: copiedIndex === index ? '#fff' : currentColors.text.secondary
                              }}
                            >
                              {copiedIndex === index ? 'Copiado!' : 'Copiar'}
                            </button>
                          </div>
                        </div>

                        {/* Source */}
                        <div style={{ textAlign: 'right' }}>
                          {cred.dominio_url && (
                            <span style={{
                              padding: '2px 6px',
                              backgroundColor: '#f9731633',
                              color: '#f97316',
                              borderRadius: '4px',
                              fontSize: '10px'
                            }}>
                              {cred.dominio_url.length > 25
                                ? cred.dominio_url.substring(0, 25) + '...'
                                : cred.dominio_url}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* URL Row */}
                      {cred.url && (
                        <div style={{
                          marginTop: '6px',
                          paddingTop: '6px',
                          borderTop: `1px solid ${currentColors.border.default}`,
                          color: currentColors.text.secondary,
                          fontSize: '11px',
                          wordBreak: 'break-all'
                        }}>
                          <strong>URL:</strong> {cred.url.length > 100 ? cred.url.substring(0, 100) + '...' : cred.url}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {searchResults.total_pages > 1 && (
                  <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    gap: '8px',
                    marginTop: '16px',
                    paddingTop: '12px',
                    borderTop: `1px solid ${currentColors.border.default}`
                  }}>
                    <button
                      onClick={() => searchCredentials(currentPage - 1)}
                      disabled={currentPage <= 1 || isSearching}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: currentPage <= 1 ? currentColors.bg.tertiary : '#f97316',
                        color: currentPage <= 1 ? currentColors.text.secondary : '#fff',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
                        opacity: currentPage <= 1 ? 0.5 : 1
                      }}
                    >
                      Anterior
                    </button>
                    <span style={{
                      padding: '8px 16px',
                      color: currentColors.text.secondary,
                      fontSize: '13px'
                    }}>
                      {currentPage} / {searchResults.total_pages}
                    </span>
                    <button
                      onClick={() => searchCredentials(currentPage + 1)}
                      disabled={currentPage >= searchResults.total_pages || isSearching}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: currentPage >= searchResults.total_pages ? currentColors.bg.tertiary : '#f97316',
                        color: currentPage >= searchResults.total_pages ? currentColors.text.secondary : '#fff',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: currentPage >= searchResults.total_pages ? 'not-allowed' : 'pointer',
                        opacity: currentPage >= searchResults.total_pages ? 0.5 : 1
                      }}
                    >
                      Proxima
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div style={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: currentColors.text.secondary
              }}>
                <div style={{ fontSize: '48px', marginBottom: '12px' }}>🔐</div>
                <div style={{ fontSize: '14px', marginBottom: '4px' }}>
                  Busque credenciais vazadas
                </div>
                <div style={{ fontSize: '12px', textAlign: 'center', maxWidth: '300px' }}>
                  Digite o nome da empresa, dominio, email ou usuario para buscar no Data Lake
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right - Statistics */}
        <div style={{
          backgroundColor: currentColors.bg.secondary,
          borderRadius: '8px',
          padding: '12px',
          border: `1px solid ${currentColors.border.default}`,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'auto'
        }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', color: currentColors.text.primary }}>
            Estatisticas do Data Lake
          </h3>

          {loadingStats ? (
            <div style={{ color: currentColors.text.secondary, fontSize: '12px' }}>
              Carregando...
            </div>
          ) : stats && (
            <>
              {/* Stats Cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                <div style={{
                  padding: '10px',
                  backgroundColor: currentColors.bg.tertiary,
                  borderRadius: '6px'
                }}>
                  <div style={{ fontSize: '10px', color: currentColors.text.secondary, marginBottom: '2px' }}>
                    TOTAL DE CREDENCIAIS
                  </div>
                  <div style={{ fontSize: '20px', fontWeight: '700', color: '#f97316' }}>
                    {formatNumber(stats.total_credentials)}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div style={{
                    padding: '10px',
                    backgroundColor: currentColors.bg.tertiary,
                    borderRadius: '6px'
                  }}>
                    <div style={{ fontSize: '10px', color: currentColors.text.secondary, marginBottom: '2px' }}>
                      DOMINIOS URL
                    </div>
                    <div style={{ fontSize: '16px', fontWeight: '600', color: '#3b82f6' }}>
                      {formatNumber(stats.unique_domains)}
                    </div>
                  </div>
                  <div style={{
                    padding: '10px',
                    backgroundColor: currentColors.bg.tertiary,
                    borderRadius: '6px'
                  }}>
                    <div style={{ fontSize: '10px', color: currentColors.text.secondary, marginBottom: '2px' }}>
                      DOMINIOS EMAIL
                    </div>
                    <div style={{ fontSize: '16px', fontWeight: '600', color: '#22c55e' }}>
                      {formatNumber(stats.unique_email_domains)}
                    </div>
                  </div>
                </div>

                <div style={{
                  padding: '10px',
                  backgroundColor: currentColors.bg.tertiary,
                  borderRadius: '6px'
                }}>
                  <div style={{ fontSize: '10px', color: currentColors.text.secondary, marginBottom: '2px' }}>
                    FORCA MEDIA DAS SENHAS
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                      flex: 1,
                      height: '8px',
                      backgroundColor: currentColors.bg.primary,
                      borderRadius: '4px',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        width: `${stats.avg_password_strength}%`,
                        height: '100%',
                        backgroundColor: stats.avg_password_strength < 30 ? '#dc2626' :
                                        stats.avg_password_strength < 60 ? '#f97316' : '#22c55e',
                        borderRadius: '4px'
                      }} />
                    </div>
                    <span style={{ fontSize: '12px', color: currentColors.text.secondary }}>
                      {stats.avg_password_strength}%
                    </span>
                  </div>
                </div>
              </div>

              {/* By Pattern */}
              <div style={{ marginBottom: '16px' }}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '12px', color: currentColors.text.primary }}>
                  Por Padrao
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {Object.entries(stats.by_pattern).map(([pattern, count]) => (
                    <div
                      key={pattern}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '6px 8px',
                        backgroundColor: currentColors.bg.tertiary,
                        borderRadius: '4px',
                        fontSize: '11px'
                      }}
                    >
                      <span style={{ color: '#f97316', fontFamily: 'monospace' }}>{pattern}</span>
                      <span style={{ color: currentColors.text.secondary }}>{formatNumber(count)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top Domains */}
              {topDomains.length > 0 && (
                <div>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '12px', color: currentColors.text.primary }}>
                    Top Dominios Vazados
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {topDomains.slice(0, 8).map((domain, index) => (
                      <div
                        key={domain.domain}
                        onClick={() => {
                          setSearchQuery(domain.domain);
                          searchCredentials(1);
                        }}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '6px 8px',
                          backgroundColor: currentColors.bg.tertiary,
                          borderRadius: '4px',
                          fontSize: '11px',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = '#f97316';
                          e.currentTarget.style.backgroundColor = currentColors.bg.primary;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = 'transparent';
                          e.currentTarget.style.backgroundColor = currentColors.bg.tertiary;
                        }}
                      >
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{
                            width: '18px',
                            height: '18px',
                            backgroundColor: '#f97316',
                            color: '#fff',
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '10px',
                            fontWeight: '600'
                          }}>
                            {index + 1}
                          </span>
                          <span style={{ color: currentColors.text.primary }}>
                            {domain.domain.length > 20 ? domain.domain.substring(0, 20) + '...' : domain.domain}
                          </span>
                        </span>
                        <span style={{ color: currentColors.text.secondary }}>{formatNumber(domain.count)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default DataLakePage;
