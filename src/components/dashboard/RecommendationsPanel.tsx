import React from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Flame,
  Info,
  Lightbulb,
} from 'lucide-react';
import { useWattWise } from '../../context/WattWiseContext';
import { RecommendationPriority } from '../../types/energy';
import { Badge } from '../common/Badge';

const PRIORITY_META: Record<
  RecommendationPriority,
  { label: string; tone: 'red' | 'amber' | 'sky' | 'emerald' }
> = {
  high: { label: 'Prioridade alta', tone: 'red' },
  medium: { label: 'Atenção', tone: 'amber' },
  info: { label: 'Análise', tone: 'sky' },
  positive: { label: 'Estável', tone: 'emerald' },
};

export const RecommendationsPanel: React.FC = () => {
  const { analysis, setActiveSection } = useWattWise();

  return (
    <section className="panel" aria-label="Recomendações inteligentes">
      <div className="panel-header">
        <div>
          <h2 className="panel-title">Recomendações Locais</h2>
          <p className="panel-subtitle">
            Regras determinísticas geradas a partir do histórico, tarifa e equipamentos ativos
          </p>
        </div>
      </div>

      <ul className="recommendations-list">
        {analysis.recommendations.map((rec) => {
          const priorityInfo = PRIORITY_META[rec.priority];
          return (
            <li key={rec.id} className={`recommendation-item recommendation-item--${rec.priority}`}>
              <div className="recommendation-top">
                <div className="recommendation-badges">
                  <span className="recommendation-icon" aria-hidden="true">
                    {rec.priority === 'high' && <Flame size={15} />}
                    {rec.priority === 'medium' && <Lightbulb size={15} />}
                    {rec.priority === 'info' && <Info size={15} />}
                    {rec.priority === 'positive' && <CheckCircle2 size={15} />}
                  </span>
                  <Badge tone={priorityInfo.tone}>{rec.category}</Badge>
                </div>

                {rec.metricBadge && (
                  <span className="recommendation-metric tabular-nums">{rec.metricBadge}</span>
                )}
              </div>

              <h3 className="recommendation-title">{rec.title}</h3>
              <p className="recommendation-desc">{rec.description}</p>

              {rec.actionTarget && rec.actionLabel && (
                <button
                  type="button"
                  className="recommendation-link"
                  onClick={() => setActiveSection(rec.actionTarget!)}
                >
                  <span>{rec.actionLabel}</span>
                  <ArrowRight size={14} />
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
};
