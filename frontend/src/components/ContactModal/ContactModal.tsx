import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import "./ContactModal.scss";

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface FormData {
  name: string;
  email: string;
  message: string;
}

interface FormErrors {
  name?: string;
  message?: string;
}

const ContactModal: React.FC<ContactModalProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<FormData>({
    name: "",
    email: "",
    message: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = t("contactModal.validation.nameRequired");
    } else if (formData.name.trim().length < 2) {
      newErrors.name = t("contactModal.validation.nameMinLength");
    } else if (formData.name.trim().length > 100) {
      newErrors.name = t("contactModal.validation.nameMaxLength");
    }

    if (!formData.message.trim()) {
      newErrors.message = t("contactModal.validation.messageRequired");
    } else if (formData.message.trim().length < 10) {
      newErrors.message = t("contactModal.validation.messageMinLength");
    } else if (formData.message.trim().length > 200) {
      newErrors.message = t("contactModal.validation.messageMaxLength");
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus(null);

    try {
      const response = await fetch("/api/v1/contact/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setSubmitStatus({
          type: "success",
          message: t("contactModal.success"),
        });
        setFormData({ name: "", email: "", message: "" });
        setTimeout(() => {
          onClose();
          setSubmitStatus(null);
        }, 2000);
      } else {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage =
          typeof errorData.error === "string"
            ? errorData.error
            : errorData.detail
              ? typeof errorData.detail === "string"
                ? errorData.detail
                : JSON.stringify(errorData.detail)
              : t("contactModal.errorDefault");

        setSubmitStatus({
          type: "error",
          message: errorMessage,
        });
      }
    } catch (error) {
      console.error("Contact form error:", error);
      setSubmitStatus({
        type: "error",
        message: t("contactModal.errorNetwork"),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleClose = () => {
    setFormData({ name: "", email: "", message: "" });
    setErrors({});
    setSubmitStatus(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="modal show d-block contact-modal"
      tabIndex={-1}
      role="dialog"
    >
      <div
        className="modal-dialog modal-dialog-centered modal-dialog-scrollable"
        role="document"
      >
        <div className="modal-content">
          <div className="modal-header py-2">
            <h6 className="modal-title mb-0 fw-bold">
              <i className="bi bi-envelope me-2"></i>
              {t("contactModal.title")}
            </h6>
            <button
              type="button"
              className="btn-close"
              onClick={handleClose}
              aria-label="Close"
            ></button>
          </div>

          <div className="modal-body">
            {submitStatus && (
              <div
                className={`alert ${
                  submitStatus.type === "success"
                    ? "alert-success"
                    : "alert-danger"
                } py-2`}
              >
                <i
                  className={`bi ${
                    submitStatus.type === "success"
                      ? "bi-check-circle"
                      : "bi-exclamation-triangle"
                  } me-2`}
                ></i>
                {submitStatus.message}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              {/* Name Field */}
              <div className="mb-3">
                <label htmlFor="name" className="form-label fw-bold">
                  {t("contactModal.nameLabel")}{" "}
                  <span className="text-danger">
                    {t("contactModal.required")}
                  </span>
                </label>
                <input
                  type="text"
                  className={`form-control ${errors.name ? "is-invalid" : ""}`}
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder={t("contactModal.namePlaceholder")}
                  disabled={isSubmitting}
                />
                {errors.name && (
                  <div className="invalid-feedback">{errors.name}</div>
                )}
              </div>

              {/* Email Field */}
              <div className="mb-3">
                <label htmlFor="email" className="form-label fw-bold">
                  {t("contactModal.emailLabel")}{" "}
                  <span className="text-muted small">
                    {t("contactModal.emailOptional")}
                  </span>
                </label>
                <input
                  type="email"
                  className="form-control"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder={t("contactModal.emailPlaceholder")}
                  disabled={isSubmitting}
                />
                <div className="form-text">{t("contactModal.emailHint")}</div>
              </div>

              {/* Message Field */}
              <div className="mb-3">
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <label htmlFor="message" className="form-label fw-bold mb-0">
                    {t("contactModal.messageLabel")}{" "}
                    <span className="text-danger">
                      {t("contactModal.required")}
                    </span>
                  </label>
                  <small
                    className={`${
                      formData.message.length < 10
                        ? "text-danger"
                        : formData.message.length > 200
                          ? "text-danger"
                          : "text-muted"
                    }`}
                  >
                    {formData.message.length}/200{" "}
                    {t("contactModal.characterCount")}
                    {formData.message.length < 10 &&
                      ` ${t("contactModal.minCharactersHint")}`}
                  </small>
                </div>
                <textarea
                  className={`form-control ${
                    errors.message ? "is-invalid" : ""
                  }`}
                  id="message"
                  name="message"
                  rows={5}
                  value={formData.message}
                  onChange={handleChange}
                  placeholder={t("contactModal.messagePlaceholder")}
                  disabled={isSubmitting}
                  maxLength={200}
                ></textarea>
                {errors.message && (
                  <div className="invalid-feedback">{errors.message}</div>
                )}
              </div>

              {/* Submit Button */}
              <div className="d-grid">
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <span
                        className="spinner-border spinner-border-sm me-2"
                        role="status"
                        aria-hidden="true"
                      ></span>
                      {t("buttons.submitting")}
                    </>
                  ) : (
                    <>
                      <i className="bi bi-send me-2"></i>
                      {t("buttons.submit")}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          <div className="modal-footer py-2">
            <button
              type="button"
              className="btn btn-sm btn-secondary"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              {t("buttons.cancel")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactModal;
