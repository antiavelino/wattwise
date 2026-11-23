import React from 'react';

interface PasswordStrengthMeterProps {
  password: string;
}

export const PasswordStrengthMeter: React.FC<PasswordStrengthMeterProps> = ({ password }) => {
  if (!password) return null;

  let score = 0;
  if (password.length >= 6) score += 1;
  if (password.length >= 10) score += 1;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
  if (/[0-9]/.test(password) || /[^A-Za-z0-9]/.test(password)) score += 1;

  const strengthLabels = ['Muito fraca', 'Fraca', 'Média', 'Boa', 'Forte'];
  const colors = ['#ef4444', '#f59e0b', '#38bdf8', '#10b981', '#24B47E'];

  const label = strengthLabels[score];
  const color = colors[score];

  return (
    <div className="pwd-strength-container" aria-live="polite">
      <div className="pwd-strength-bars">
        {[1, 2, 3, 4].map((step) => (
          <div
            key={step}
            className="pwd-strength-bar"
            style={{
              backgroundColor: step <= score ? color : 'var(--border-subtle)',
            }}
          />
        ))}
      </div>
      <div className="pwd-strength-meta">
        <span className="pwd-strength-label" style={{ color }}>
          Força da senha: <strong>{label}</strong>
        </span>
        <span className="pwd-strength-hint">Mínimo 6 caracteres (recomendado: 10+ com letras e números)</span>
      </div>
    </div>
  );
};
