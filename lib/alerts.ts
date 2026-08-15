"use client";

// Wrapper único sobre SweetAlert2 — toda la app pasa por acá (nunca alert()/confirm() nativos).
import Swal from "sweetalert2";

export const erpAlert = Swal.mixin({
  confirmButtonColor: "#2e7d32",
  cancelButtonColor: "#6b7280",
  buttonsStyling: true,
  customClass: {
    popup: "rounded-2xl",
    confirmButton: "rounded-xl px-5 py-2.5 font-medium",
    cancelButton: "rounded-xl px-5 py-2.5 font-medium",
  },
});

export const erpToast = Swal.mixin({
  toast: true,
  position: "top-end",
  showConfirmButton: false,
  timer: 2800,
  timerProgressBar: true,
  didOpen: (toastEl) => {
    toastEl.addEventListener("mouseenter", Swal.stopTimer);
    toastEl.addEventListener("mouseleave", Swal.resumeTimer);
  },
  customClass: {
    popup: "rounded-xl",
  },
});

export function successToast(title: string) {
  return erpToast.fire({ icon: "success", title });
}

export function errorToast(title: string) {
  return erpToast.fire({ icon: "error", title });
}
