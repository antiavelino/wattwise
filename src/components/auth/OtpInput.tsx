import React, { useEffect, useRef, useState } from 'react';
import { RotateCw } from 'lucide-react';

interface OtpInputProps {
  length?: number;
  value: string;
  onChange: (otp: string) => void;
  onComplete?: (otp: string) => void;
  disabled?: boolean;
  onResend?: () => void;
  resendCooldownSeconds?: number;
}

export const OtpInput: React.FC<OtpInputProps> = ({
  length = 6,
  value,
  onChange,
  onComplete,
  disabled = false,
  onResend,
  resendCooldownSeconds = 60,
}) => {
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const [cooldown, setCooldown] = useState(resendCooldownSeconds);

  // Timer de reenviar código
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const digits = Array.from({ length }, (_, i) => value[i] || '');

  const handleChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    const cleanDigit = rawVal.replace(/\D/g, '').slice(-1);

    const nextDigits = [...digits];
    nextDigits[index] = cleanDigit;
    const nextOtp = nextDigits.join('');
    onChange(nextOtp);

    if (cleanDigit && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    if (nextOtp.length === length && onComplete) {
      onComplete(nextOtp);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
      } else {
        const nextDigits = [...digits];
        nextDigits[index] = '';
        onChange(nextDigits.join(''));
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text');
    const numeric = pasted.replace(/\D/g, '').slice(0, length);
    if (!numeric) return;

    onChange(numeric);
    const targetFocus = Math.min(numeric.length, length - 1);
    inputRefs.current[targetFocus]?.focus();

    if (numeric.length === length && onComplete) {
      onComplete(numeric);
    }
  };

  const handleResendClick = () => {
    if (cooldown > 0 || !onResend) return;
    setCooldown(resendCooldownSeconds);
    onResend();
  };

  return (
    <div className="otp-wrapper">
      <div className="otp-cells-group" role="group" aria-label="Código de verificação de 6 dígitos">
        {Array.from({ length }).map((_, i) => (
          <input
            key={i}
            ref={(el) => {
              inputRefs.current[i] = el;
            }}
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]*"
            maxLength={1}
            disabled={disabled}
            value={digits[i] || ''}
            onChange={(e) => handleChange(i, e)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onPaste={handlePaste}
            className={`otp-cell ${digits[i] ? 'otp-cell--filled' : ''}`}
            aria-label={`Dígito ${i + 1} de ${length}`}
          />
        ))}
      </div>

      {onResend && (
        <div className="otp-resend-row">
          <button
            type="button"
            className="otp-resend-btn"
            onClick={handleResendClick}
            disabled={cooldown > 0 || disabled}
          >
            <RotateCw size={14} className={cooldown > 0 ? 'spin-subtle' : ''} />
            <span>
              {cooldown > 0 ? `Reenviar código em ${cooldown}s` : 'Reenviar código'}
            </span>
          </button>
        </div>
      )}
    </div>
  );
};
