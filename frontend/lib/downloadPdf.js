import api from "./api";

/**
 * /api/payslips/:id/pdf requires Authorization: Bearer <token> — a plain <a href>
 * never sends that header, so a normal link click 401s instead of downloading.
 * Fetch it through the authenticated axios instance instead, then open the blob.
 */
export async function openPayslipPdf(id) {
  const res = await api.get(`/api/payslips/${id}/pdf`, { responseType: "blob" });
  const url = URL.createObjectURL(res.data);
  window.open(url, "_blank");
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
