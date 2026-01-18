import React, { useState } from "react";
import { Modal, Form, Button, Alert } from "react-bootstrap";
import { useTranslation } from "react-i18next";
import "./QuotaExceededModal.scss";

interface QuotaExceededModalProps {
  show: boolean;
  onApiKeyProvided: (apiKey: string) => void;
  onCancel: () => void;
  retryAfter?: number; // 秒數
}

/**
 * 配額超限對話框
 *
 * 當系統 API Key 達到每日限制時顯示，允許用戶輸入自己的 API Key
 * 用戶的 Key 僅用於當前 session，不會被存儲到資料庫
 */
const QuotaExceededModal: React.FC<QuotaExceededModalProps> = ({
  show,
  onApiKeyProvided,
  onCancel,
  retryAfter = 86400, // 預設 24 小時
}) => {
  const { t } = useTranslation();
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!apiKey.trim()) {
      setError(t("apiKey.errors.empty"));
      return;
    }

    // 簡單的格式驗證
    if (apiKey.length < 20) {
      setError(t("apiKey.errors.invalid"));
      return;
    }

    setIsValidating(true);
    setError(null);

    try {
      // 調用父組件的回調，傳遞 API Key
      onApiKeyProvided(apiKey);

      // 清空輸入框（安全起見）
      setApiKey("");
      setShowKey(false);
    } catch (err) {
      setError(t("apiKey.errors.validationFailed"));
    } finally {
      setIsValidating(false);
    }
  };

  const handleCancel = () => {
    setApiKey("");
    setShowKey(false);
    setError(null);
    onCancel();
  };

  // 計算重試時間（小時）
  const retryHours = Math.ceil(retryAfter / 3600);

  return (
    <Modal
      show={show}
      onHide={handleCancel}
      backdrop="static"
      keyboard={false}
      centered
      className="quota-exceeded-modal"
    >
      <Modal.Header className="bg-warning">
        <Modal.Title>
          <i className="bi bi-exclamation-triangle-fill me-2"></i>
          {t("quota.exceeded.title")}
        </Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {/* 配額超限說明 */}
        <Alert variant="warning" className="mb-3">
          <Alert.Heading className="h6">
            {t("quota.exceeded.heading")}
          </Alert.Heading>
          <p className="mb-1">{t("quota.exceeded.description")}</p>
          <small className="text-muted">
            {t("quota.exceeded.retryInfo", { hours: retryHours })}
          </small>
        </Alert>

        {/* 解決方案說明 */}
        <div className="mb-3">
          <h6>{t("quota.exceeded.solution.title")}</h6>
          <p className="text-muted small">
            {t("quota.exceeded.solution.description")}
          </p>
        </div>

        {/* API Key 輸入 */}
        <Form.Group className="mb-3">
          <Form.Label className="fw-bold">
            {t("apiKey.label")}
            <span className="text-danger">*</span>
          </Form.Label>

          <div className="input-group">
            <Form.Control
              type={showKey ? "text" : "password"}
              placeholder={t("apiKey.placeholder")}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              isInvalid={!!error}
              disabled={isValidating}
              onKeyPress={(e) => {
                if (e.key === "Enter") {
                  handleSubmit();
                }
              }}
            />
            <Button
              variant="outline-secondary"
              onClick={() => setShowKey(!showKey)}
              disabled={isValidating}
            >
              <i className={`bi bi-eye${showKey ? "-slash" : ""}`}></i>
            </Button>
          </div>

          {error && (
            <Form.Control.Feedback type="invalid" className="d-block">
              {error}
            </Form.Control.Feedback>
          )}

          <Form.Text className="text-muted">
            {t("quota.exceeded.apiKeyHelp")}
          </Form.Text>
        </Form.Group>

        {/* 安全保證 */}
        <Alert variant="info" className="mb-0 small">
          <i className="bi bi-shield-check me-2"></i>
          {t("quota.exceeded.securityNote")}
        </Alert>

        {/* 如何獲取 API Key 連結 */}
        <div className="mt-3 text-center">
          <small>
            {t("quota.exceeded.needKey")}{" "}
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="text-decoration-none"
            >
              {t("quota.exceeded.getKeyLink")}
              <i className="bi bi-box-arrow-up-right ms-1"></i>
            </a>
          </small>
        </div>
      </Modal.Body>

      <Modal.Footer>
        <Button
          variant="secondary"
          onClick={handleCancel}
          disabled={isValidating}
        >
          {t("buttons.cancel")}
        </Button>
        <Button
          variant="primary"
          onClick={handleSubmit}
          disabled={isValidating || !apiKey.trim()}
        >
          {isValidating ? (
            <>
              <span
                className="spinner-border spinner-border-sm me-2"
                role="status"
                aria-hidden="true"
              ></span>
              {t("buttons.validating")}
            </>
          ) : (
            <>
              <i className="bi bi-key me-2"></i>
              {t("buttons.useMyKey")}
            </>
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default QuotaExceededModal;
