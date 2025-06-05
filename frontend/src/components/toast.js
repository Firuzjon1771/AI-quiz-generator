// toast.js (or wherever you define toasts)
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

/**
 * @param {string} msg - The message to display
 * @param {'success' | 'error' | 'info' | 'warning'} type - The type of toast (optional, defaults to 'success')
 */
export const showToast = (msg, type = "success") => {
  switch (type) {
    case "error":
      toast.error(msg, { position: "top-right" });
      break;
    case "info":
      toast.info(msg, { position: "top-right" });
      break;
    case "warning":
      toast.warn(msg, { position: "top-right" });
      break;
    default:
      toast.success(msg, { position: "top-right" });
      break;
  }
};

export const ToastWrapper = () => <ToastContainer />;
