import React, { useState } from "react";
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
      newErrors.name = "請輸入您的名字";
    } else if (formData.name.trim().length < 2) {
      newErrors.name = "名字至少需要2個字元";
    } else if (formData.name.trim().length > 100) {
      newErrors.name = "名字不可超過100個字元";
    }

    if (!formData.message.trim()) {
      newErrors.message = "請輸入留言內容";
    } else if (formData.message.trim().length < 10) {
      newErrors.message = "留言至少需要10個字元";
    } else if (formData.message.trim().length > 200) {
      newErrors.message = "留言不可超過200個字元";
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
          message: "留言已成功送出！感謝您的聯絡。",
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
              : "送出失敗，請稍後再試。";

        setSubmitStatus({
          type: "error",
          message: errorMessage,
        });
      }
    } catch (error) {
      console.error("Contact form error:", error);
      setSubmitStatus({
        type: "error",
        message: "網路錯誤，請檢查您的連線。",
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
              與我聯絡
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
                  您的名字 <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  className={`form-control ${errors.name ? "is-invalid" : ""}`}
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="請輸入您的名字"
                  disabled={isSubmitting}
                />
                {errors.name && (
                  <div className="invalid-feedback">{errors.name}</div>
                )}
              </div>

              {/* Email Field */}
              <div className="mb-3">
                <label htmlFor="email" className="form-label fw-bold">
                  電子信箱 <span className="text-muted small">(選填)</span>
                </label>
                <input
                  type="email"
                  className="form-control"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="your.email@example.com"
                  disabled={isSubmitting}
                />
                <div className="form-text">
                  若希望收到回覆，請提供您的電子信箱
                </div>
              </div>

              {/* Message Field */}
              <div className="mb-3">
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <label htmlFor="message" className="form-label fw-bold mb-0">
                    留言內容 <span className="text-danger">*</span>
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
                    {formData.message.length}/200 字元
                    {formData.message.length < 10 && " (至少10字元)"}
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
                  placeholder="請輸入您的留言或問題... (10-200字元)"
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
                      送出中...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-send me-2"></i>
                      送出留言
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
              取消
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactModal;
