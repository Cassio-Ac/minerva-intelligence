/**
 * PowerUserHome Component
 * Home page para power users com histórico de mensagens e dashboards salvos
 */

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSettingsStore } from '@stores/settingsStore';
import { useAuthStore } from '@stores/authStore';

interface Conversation {
  id: string;
  title: string;
  created_at: string;
  message_count: number;
}

interface Dashboard {
  id: string;
  title: string;
  description: string;
  created_at: string;
  updated_at: string;
  widgets_count: number;
}

export const PowerUserHome: React.FC = () => {
  const { currentColors } = useSettingsStore();
  const { token, user } = useAuthStore();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Buscar conversas recentes
        const convResponse = await fetch('http://localhost:8000/api/v1/conversations?limit=5', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (convResponse.ok) {
          const convData = await convResponse.json();
          setConversations(convData);
        }

        // Buscar dashboards do usuário
        const dashResponse = await fetch('http://localhost:8000/api/v1/dashboards?limit=6', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (dashResponse.ok) {
          const dashData = await dashResponse.json();
          setDashboards(dashData);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m atrás`;
    if (diffHours < 24) return `${diffHours}h atrás`;
    if (diffDays < 7) return `${diffDays}d atrás`;
    return date.toLocaleDateString('pt-BR');
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="rounded-2xl shadow-xl p-8" style={{
        backgroundColor: currentColors.bg.primary
      }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2" style={{ color: currentColors.text.primary }}>
              Bem-vindo de volta!
            </h1>
            <p className="text-lg" style={{ color: currentColors.text.secondary }}>
              Olá, {user?.full_name || user?.username} 👋
            </p>
          </div>
          <div className="text-6xl">
            ⚡
          </div>
        </div>
      </div>

      {/* Ações Rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link
          to="/chat"
          className="rounded-xl p-6 shadow-lg hover:shadow-xl transition-all border"
          style={{
            backgroundColor: currentColors.bg.primary,
            borderColor: currentColors.accent.primary
          }}
        >
          <div className="text-4xl mb-3">💬</div>
          <h3 className="text-lg font-semibold mb-2" style={{ color: currentColors.text.primary }}>
            Novo Chat
          </h3>
          <p className="text-sm" style={{ color: currentColors.text.muted }}>
            Criar dashboards com IA
          </p>
        </Link>

        <Link
          to="/dashboards"
          className="rounded-xl p-6 shadow-lg hover:shadow-xl transition-all border"
          style={{
            backgroundColor: currentColors.bg.primary,
            borderColor: currentColors.accent.primary
          }}
        >
          <div className="text-4xl mb-3">📊</div>
          <h3 className="text-lg font-semibold mb-2" style={{ color: currentColors.text.primary }}>
            Meus Dashboards
          </h3>
          <p className="text-sm" style={{ color: currentColors.text.muted }}>
            Ver todos os dashboards
          </p>
        </Link>

        {user?.can_upload_csv && (
          <Link
            to="/csv-upload"
            className="rounded-xl p-6 shadow-lg hover:shadow-xl transition-all border"
            style={{
              backgroundColor: currentColors.bg.primary,
              borderColor: currentColors.accent.primary
            }}
          >
            <div className="text-4xl mb-3">📤</div>
            <h3 className="text-lg font-semibold mb-2" style={{ color: currentColors.text.primary }}>
              Upload CSV
            </h3>
            <p className="text-sm" style={{ color: currentColors.text.muted }}>
              Importar dados
            </p>
          </Link>
        )}

        <Link
          to="/downloads"
          className="rounded-xl p-6 shadow-lg hover:shadow-xl transition-all border"
          style={{
            backgroundColor: currentColors.bg.primary,
            borderColor: currentColors.accent.primary
          }}
        >
          <div className="text-4xl mb-3">📥</div>
          <h3 className="text-lg font-semibold mb-2" style={{ color: currentColors.text.primary }}>
            Downloads
          </h3>
          <p className="text-sm" style={{ color: currentColors.text.muted }}>
            Arquivos exportados
          </p>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Histórico de Conversas */}
        <div className="rounded-2xl shadow-xl p-6" style={{
          backgroundColor: currentColors.bg.primary
        }}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold" style={{ color: currentColors.text.primary }}>
              💬 Conversas Recentes
            </h2>
            <Link
              to="/chat"
              className="text-sm hover:underline"
              style={{ color: currentColors.accent.primary }}
            >
              Ver todas
            </Link>
          </div>

          {loading ? (
            <div className="text-center py-8" style={{ color: currentColors.text.muted }}>
              Carregando...
            </div>
          ) : conversations.length === 0 ? (
            <div className="text-center py-8" style={{ color: currentColors.text.muted }}>
              <div className="text-4xl mb-3">📭</div>
              <p>Nenhuma conversa ainda</p>
              <Link
                to="/chat"
                className="inline-block mt-4 px-4 py-2 rounded-lg"
                style={{
                  backgroundColor: currentColors.accent.primary,
                  color: currentColors.text.inverse
                }}
              >
                Iniciar conversa
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {conversations.map((conv) => (
                <Link
                  key={conv.id}
                  to={`/chat?conversation=${conv.id}`}
                  className="block rounded-lg p-4 border hover:shadow-md transition-all"
                  style={{
                    backgroundColor: currentColors.bg.tertiary,
                    borderColor: currentColors.border.default
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold mb-1" style={{ color: currentColors.text.primary }}>
                        {conv.title || 'Sem título'}
                      </h3>
                      <p className="text-sm" style={{ color: currentColors.text.muted }}>
                        {conv.message_count} mensagens
                      </p>
                    </div>
                    <span className="text-xs whitespace-nowrap ml-4" style={{ color: currentColors.text.muted }}>
                      {formatDate(conv.created_at)}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Dashboards Salvos */}
        <div className="rounded-2xl shadow-xl p-6" style={{
          backgroundColor: currentColors.bg.primary
        }}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold" style={{ color: currentColors.text.primary }}>
              📊 Meus Dashboards
            </h2>
            <Link
              to="/dashboards"
              className="text-sm hover:underline"
              style={{ color: currentColors.accent.primary }}
            >
              Ver todos
            </Link>
          </div>

          {loading ? (
            <div className="text-center py-8" style={{ color: currentColors.text.muted }}>
              Carregando...
            </div>
          ) : dashboards.length === 0 ? (
            <div className="text-center py-8" style={{ color: currentColors.text.muted }}>
              <div className="text-4xl mb-3">📊</div>
              <p>Nenhum dashboard criado</p>
              <Link
                to="/chat"
                className="inline-block mt-4 px-4 py-2 rounded-lg"
                style={{
                  backgroundColor: currentColors.accent.primary,
                  color: currentColors.text.inverse
                }}
              >
                Criar dashboard
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {dashboards.map((dash) => (
                <Link
                  key={dash.id}
                  to={`/dashboard?id=${dash.id}`}
                  className="block rounded-lg p-4 border hover:shadow-md transition-all"
                  style={{
                    backgroundColor: currentColors.bg.tertiary,
                    borderColor: currentColors.border.default
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold mb-1" style={{ color: currentColors.text.primary }}>
                        {dash.title}
                      </h3>
                      <p className="text-sm mb-2" style={{ color: currentColors.text.muted }}>
                        {dash.description || 'Sem descrição'}
                      </p>
                      <div className="flex items-center gap-3 text-xs" style={{ color: currentColors.text.muted }}>
                        <span>{dash.widgets_count || 0} widgets</span>
                        <span>•</span>
                        <span>Atualizado {formatDate(dash.updated_at)}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
