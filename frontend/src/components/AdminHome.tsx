/**
 * AdminHome Component
 * Home page para administradores com métricas do sistema
 */

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSettingsStore } from '@stores/settingsStore';
import { useAuthStore } from '@stores/authStore';
import { API_URL } from '../config/api';

interface SystemMetrics {
  total_users: number;
  total_dashboards: number;
  total_conversations: number;
  total_downloads: number;
  active_users_today: number;
  llm_requests_today: number;
  mcp_servers_count: number;
  llm_providers_count: number;
}

export const AdminHome: React.FC = () => {
  const { currentColors } = useSettingsStore();
  const { token, user } = useAuthStore();
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const response = await fetch(`${API_URL}/admin/metrics`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          setMetrics(data);
        }
      } catch (error) {
        console.error('Error fetching metrics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, [token]);

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="rounded-2xl shadow-xl p-8" style={{
        backgroundColor: currentColors.bg.primary
      }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2" style={{ color: currentColors.text.primary }}>
              Painel Administrativo
            </h1>
            <p className="text-lg" style={{ color: currentColors.text.secondary }}>
              Bem-vindo, {user?.full_name || user?.username} 👋
            </p>
          </div>
          <div className="text-6xl">
            🛡️
          </div>
        </div>
      </div>

      {/* Métricas do Sistema */}
      <div className="rounded-2xl shadow-xl p-8" style={{
        backgroundColor: currentColors.bg.primary
      }}>
        <h2 className="text-2xl font-bold mb-6" style={{ color: currentColors.text.primary }}>
          📊 Métricas do Sistema
        </h2>

        {loading ? (
          <div className="text-center py-8" style={{ color: currentColors.text.muted }}>
            Carregando métricas...
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Total de Usuários */}
            <div className="rounded-xl p-6 border" style={{
              backgroundColor: currentColors.bg.tertiary,
              borderColor: currentColors.border.default
            }}>
              <div className="text-3xl mb-2">👥</div>
              <div className="text-3xl font-bold mb-1" style={{ color: currentColors.accent.primary }}>
                {metrics?.total_users || 0}
              </div>
              <div className="text-sm" style={{ color: currentColors.text.muted }}>
                Total de Usuários
              </div>
            </div>

            {/* Total de Dashboards */}
            <div className="rounded-xl p-6 border" style={{
              backgroundColor: currentColors.bg.tertiary,
              borderColor: currentColors.border.default
            }}>
              <div className="text-3xl mb-2">📊</div>
              <div className="text-3xl font-bold mb-1" style={{ color: currentColors.accent.primary }}>
                {metrics?.total_dashboards || 0}
              </div>
              <div className="text-sm" style={{ color: currentColors.text.muted }}>
                Dashboards Criados
              </div>
            </div>

            {/* Conversas com IA */}
            <div className="rounded-xl p-6 border" style={{
              backgroundColor: currentColors.bg.tertiary,
              borderColor: currentColors.border.default
            }}>
              <div className="text-3xl mb-2">💬</div>
              <div className="text-3xl font-bold mb-1" style={{ color: currentColors.accent.primary }}>
                {metrics?.total_conversations || 0}
              </div>
              <div className="text-sm" style={{ color: currentColors.text.muted }}>
                Conversas com IA
              </div>
            </div>

            {/* Downloads */}
            <div className="rounded-xl p-6 border" style={{
              backgroundColor: currentColors.bg.tertiary,
              borderColor: currentColors.border.default
            }}>
              <div className="text-3xl mb-2">📥</div>
              <div className="text-3xl font-bold mb-1" style={{ color: currentColors.accent.primary }}>
                {metrics?.total_downloads || 0}
              </div>
              <div className="text-sm" style={{ color: currentColors.text.muted }}>
                Downloads Gerados
              </div>
            </div>

            {/* Usuários Ativos Hoje */}
            <div className="rounded-xl p-6 border" style={{
              backgroundColor: currentColors.bg.tertiary,
              borderColor: currentColors.border.default
            }}>
              <div className="text-3xl mb-2">🟢</div>
              <div className="text-3xl font-bold mb-1" style={{ color: currentColors.accent.success }}>
                {metrics?.active_users_today || 0}
              </div>
              <div className="text-sm" style={{ color: currentColors.text.muted }}>
                Ativos Hoje
              </div>
            </div>

            {/* Requisições LLM Hoje */}
            <div className="rounded-xl p-6 border" style={{
              backgroundColor: currentColors.bg.tertiary,
              borderColor: currentColors.border.default
            }}>
              <div className="text-3xl mb-2">🤖</div>
              <div className="text-3xl font-bold mb-1" style={{ color: currentColors.accent.primary }}>
                {metrics?.llm_requests_today || 0}
              </div>
              <div className="text-sm" style={{ color: currentColors.text.muted }}>
                Requisições LLM Hoje
              </div>
            </div>

            {/* Servidores MCP */}
            <div className="rounded-xl p-6 border" style={{
              backgroundColor: currentColors.bg.tertiary,
              borderColor: currentColors.border.default
            }}>
              <div className="text-3xl mb-2">🔌</div>
              <div className="text-3xl font-bold mb-1" style={{ color: currentColors.accent.primary }}>
                {metrics?.mcp_servers_count || 0}
              </div>
              <div className="text-sm" style={{ color: currentColors.text.muted }}>
                Servidores MCP
              </div>
            </div>

            {/* LLM Providers */}
            <div className="rounded-xl p-6 border" style={{
              backgroundColor: currentColors.bg.tertiary,
              borderColor: currentColors.border.default
            }}>
              <div className="text-3xl mb-2">🧠</div>
              <div className="text-3xl font-bold mb-1" style={{ color: currentColors.accent.primary }}>
                {metrics?.llm_providers_count || 0}
              </div>
              <div className="text-sm" style={{ color: currentColors.text.muted }}>
                Provedores LLM
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Ações Rápidas */}
      <div className="rounded-2xl shadow-xl p-8" style={{
        backgroundColor: currentColors.bg.primary
      }}>
        <h2 className="text-2xl font-bold mb-6" style={{ color: currentColors.text.primary }}>
          ⚡ Ações Rápidas
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            to="/settings"
            className="rounded-xl p-6 border hover:shadow-lg transition-all"
            style={{
              backgroundColor: currentColors.bg.tertiary,
              borderColor: currentColors.border.default
            }}
          >
            <div className="text-4xl mb-3">⚙️</div>
            <h3 className="font-semibold mb-2" style={{ color: currentColors.text.primary }}>
              Configurações
            </h3>
            <p className="text-sm" style={{ color: currentColors.text.muted }}>
              Gerenciar provedores LLM e sistema
            </p>
          </Link>

          <Link
            to="/servers"
            className="rounded-xl p-6 border hover:shadow-lg transition-all"
            style={{
              backgroundColor: currentColors.bg.tertiary,
              borderColor: currentColors.border.default
            }}
          >
            <div className="text-4xl mb-3">🗄️</div>
            <h3 className="font-semibold mb-2" style={{ color: currentColors.text.primary }}>
              Servidores ES
            </h3>
            <p className="text-sm" style={{ color: currentColors.text.muted }}>
              Gerenciar conexões Elasticsearch
            </p>
          </Link>

          <Link
            to="/dashboards"
            className="rounded-xl p-6 border hover:shadow-lg transition-all"
            style={{
              backgroundColor: currentColors.bg.tertiary,
              borderColor: currentColors.border.default
            }}
          >
            <div className="text-4xl mb-3">📊</div>
            <h3 className="font-semibold mb-2" style={{ color: currentColors.text.primary }}>
              Dashboards
            </h3>
            <p className="text-sm" style={{ color: currentColors.text.muted }}>
              Ver todos os dashboards
            </p>
          </Link>

          <Link
            to="/chat"
            className="rounded-xl p-6 border hover:shadow-lg transition-all"
            style={{
              backgroundColor: currentColors.bg.tertiary,
              borderColor: currentColors.border.default
            }}
          >
            <div className="text-4xl mb-3">💬</div>
            <h3 className="font-semibold mb-2" style={{ color: currentColors.text.primary }}>
              Chat com IA
            </h3>
            <p className="text-sm" style={{ color: currentColors.text.muted }}>
              Criar dashboards com IA
            </p>
          </Link>
        </div>
      </div>
    </div>
  );
};
