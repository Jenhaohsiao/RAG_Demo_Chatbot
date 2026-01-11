/**
 * API Key Input Component
 * T032: Allow users to input Gemini API key if not configured or invalid
 *
 * ?¨æ–¼?•ç? API Key å¤±æ??–æœª?ç½®?„æ?æ³?
 * - æª¢æŸ¥å¾Œç«¯??API Key ?€??
 * - ?è¨±ä½¿ç”¨?…è¼¸?¥è‡ªå·±ç? API Key
 * - é©—è? API Key ?‰æ???
 */
import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  checkApiKeyStatus,
  validateUserApiKey,
} from "../../services/apiKeyService";
import "./ApiKeyInput.scss";

interface ApiKeyInputProps {
  onApiKeyValidated?: (apiKey: string) => void;
  onSkip?: () => void;
  allowSkip?: boolean;
}

const ApiKeyInput: React.FC<ApiKeyInputProps> = ({
  onApiKeyValidated,
  onSkip,
  allowSkip = false,
}) => {
  const { t } = useTranslation();
  const [apiKey, setApiKey] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [keyStatus, setKeyStatus] = useState<{
    status: "valid" | "missing" | "invalid";
    source: "env" | "user" | "none";
    has_valid_api_key: boolean;
  } | null>(null);

  // ?¨ç?ä»¶è??¥æ?æª¢æŸ¥ API Key ?€??
  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    try {
      const status = await checkApiKeyStatus();
      setKeyStatus(status);

      // å¦‚æ??‰æ??ˆç? API Key (ä¾†è‡ª?°å?è®Šæ•¸)ï¼Œç›´?¥å???
      if (status.has_valid_api_key && status.source === "env") {
        onApiKeyValidated?.("");
      }
    } catch (err) {
      setKeyStatus({
        status: "missing",
        source: "none",
        has_valid_api_key: false,
      });
    }
  };

  const handleValidate = async () => {
    if (!apiKey.trim()) {
      setError(t("apiKey.error.empty"));
      return;
    }

    setIsValidating(true);
    setError(null);

    try {
      const result = await validateUserApiKey(apiKey);

      if (result.valid) {
        // é©—è??å?ï¼Œä?å­˜åˆ° session storage (å®‰å…¨?ƒæ…®)
        sessionStorage.setItem("user_gemini_api_key", apiKey);
        onApiKeyValidated?.(apiKey);
      } else {
        setError(result.message || t("apiKey.error.invalid"));
      }
    } catch (err: any) {
      setError(err.message || t("apiKey.error.validation_failed"));
    } finally {
      setIsValidating(false);
    }
  };

  const handleSkip = () => {
    if (allowSkip) {
      onSkip?.();
    }
  };

  // å¦‚æ??‰æ??ˆç??°å?è®Šæ•¸ API Keyï¼Œä?é¡¯ç¤ºæ­¤ç?ä»?
  if (keyStatus?.has_valid_api_key && keyStatus?.source === "env") {
    return null;
  }

  return (
    <div className="api-key-input-container">
      <div className="api-key-card">
        <div className="api-key-header">
          <i className="bi bi-key-fill text-warning"></i>
          <h3>{t("apiKey.title")}</h3>
        </div>

        <div className="api-key-body">
          {/* ?€?‹èªª??*/}
          <div className="status-message">
            {keyStatus?.status === "missing" && (
              <div className="alert alert-warning">
                <i className="bi bi-exclamation-triangle-fill me-2"></i>
                {t("apiKey.status.missing")}
              </div>
            )}
            {keyStatus?.status === "invalid" && (
              <div className="alert alert-danger">
                <i className="bi bi-x-circle-fill me-2"></i>
                {t("apiKey.status.invalid")}
              </div>
            )}
          </div>

          {/* API Key èªªæ? */}
          <div className="info-section mb-4">
            <h5>{t("apiKey.what_is_it")}</h5>
            <p className="text-muted">{t("apiKey.description")}</p>
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-link btn-sm p-0"
            >
              <i className="bi bi-box-arrow-up-right me-1"></i>
              {t("apiKey.get_key_link")}
            </a>
          </div>

          {/* API Key è¼¸å…¥ */}
          <div className="input-section">
            <label htmlFor="apiKey" className="form-label">
              {t("apiKey.input_label")}
            </label>
            <div className="input-group">
              <input
                type={showKey ? "text" : "password"}
                id="apiKey"
                className="form-control"
                placeholder="AIzaSy..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleValidate()}
                disabled={isValidating}
              />
              <button
                className="btn btn-outline-secondary"
                type="button"
                onClick={() => setShowKey(!showKey)}
                disabled={isValidating}
              >
                <i className={`bi bi-eye${showKey ? "-slash" : ""}-fill`}></i>
              </button>
            </div>
            {error && (
              <div className="text-danger mt-2">
                <i className="bi bi-exclamation-circle me-1"></i>
                {error}
              </div>
            )}
          </div>

          {/* å®‰å…¨?ç¤º */}
          <div className="security-note mt-3">
            <i className="bi bi-shield-check text-success me-2"></i>
            <small className="text-muted">{t("apiKey.security_note")}</small>
          </div>

          {/* ?‰é? */}
          <div className="button-section mt-4">
            <button
              className="btn btn-primary w-100"
              onClick={handleValidate}
              disabled={isValidating || !apiKey.trim()}
            >
              {isValidating ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2"></span>
                  {t("apiKey.validating")}
                </>
              ) : (
                <>
                  <i className="bi bi-check-circle me-2"></i>
                  {t("apiKey.validate")}
                </>
              )}
            </button>

            {allowSkip && (
              <button
                className="btn btn-link w-100 mt-2"
                onClick={handleSkip}
                disabled={isValidating}
              >
                {t("apiKey.skip")}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApiKeyInput;
