import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export const showToast = (msg) => {
  toast.success(msg, { position: "top-right" });
};

export const ToastWrapper = () => <ToastContainer />;
