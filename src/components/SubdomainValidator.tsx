import React, { useState, useEffect } from 'react';
import { Check, X, Loader2 } from 'lucide-react';
import { validateSlug } from '../lib/tenantProvisioning';

interface SubdomainValidatorProps {
  value: string;
  onChange: (value: string) => void;
  onValidationChange: (isValid: boolean) => void;
}

export default function SubdomainValidator({
  value,
  onChange,
  onValidationChange,
}: SubdomainValidatorProps) {
  const [isChecking, setIsChecking] = useState(false);
  const [validationMessage, setValidationMessage] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  useEffect(() => {
    const checkAvailability = async () => {
      if (!value) {
        setValidationMessage(null);
        onValidationChange(false);
        return;
      }

      if (value.length < 3) {
        setValidationMessage({
          type: 'info',
          message: 'Enter at least 3 characters',
        });
        onValidationChange(false);
        return;
      }

      setIsChecking(true);

      const timeoutId = setTimeout(async () => {
        const result = await validateSlug(value);

        if (result.available) {
          setValidationMessage({
            type: 'success',
            message: 'This subdomain is available!',
          });
          onValidationChange(true);
        } else {
          setValidationMessage({
            type: 'error',
            message: result.error || 'This subdomain is not available',
          });
          onValidationChange(false);
        }

        setIsChecking(false);
      }, 500);

      return () => clearTimeout(timeoutId);
    };

    checkAvailability();
  }, [value, onValidationChange]);

  const hostname = window.location.hostname;
  const parts = hostname.split('.');
  const baseDomain = parts.length >= 2 ? parts.slice(-2).join('.') : 'clearnav.cv';

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '')
      .replace(/^-+|-+$/g, '');
    onChange(newValue);
  };

  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-2">
        Choose Your Subdomain
      </label>
      <div className="flex items-center space-x-2">
        <div className="flex-1 relative">
          <input
            type="text"
            value={value}
            onChange={handleChange}
            placeholder="your-company"
            className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
            required
            minLength={3}
            maxLength={63}
            pattern="[a-z0-9-]+"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {isChecking && <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />}
            {!isChecking && validationMessage?.type === 'success' && (
              <Check className="w-5 h-5 text-green-600" />
            )}
            {!isChecking && validationMessage?.type === 'error' && (
              <X className="w-5 h-5 text-red-600" />
            )}
          </div>
        </div>
        <span className="text-slate-600 font-medium whitespace-nowrap">.{baseDomain}</span>
      </div>

      {validationMessage && (
        <div
          className={`mt-2 text-sm ${
            validationMessage.type === 'success'
              ? 'text-green-700'
              : validationMessage.type === 'error'
              ? 'text-red-700'
              : 'text-slate-600'
          }`}
        >
          {validationMessage.message}
        </div>
      )}

      {value && !isChecking && validationMessage?.type === 'success' && (
        <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            Your portal will be available at:{' '}
            <span className="font-mono font-semibold">
              https://{value}.{baseDomain}
            </span>
          </p>
        </div>
      )}
    </div>
  );
}
