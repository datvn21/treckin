import { useNavigate } from "react-router-dom";
import { useDocumentTitle } from "@/hooks";

export function NotFoundPage() {
  const navigate = useNavigate();
  useDocumentTitle("Trang không tìm thấy");
  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center p-6">
      <div className="text-center">
        <p className="text-sm font-medium text-ink-3 mb-2">404</p>
        <h1 className="text-2xl font-semibold text-ink-1 mb-2">Trang không tìm thấy</h1>
        <p className="text-sm text-ink-3 max-w-xs mx-auto mb-6">
          Đường dẫn này không tồn tại hoặc bạn không có quyền truy cập.
        </p>
        <div className="flex items-center justify-center gap-2">
          <button type="button" className="btn-default" onClick={() => navigate(-1)}>
            Quay lại
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={() => navigate("/app", { replace: true })}
          >
            Trang chủ
          </button>
        </div>
      </div>
    </div>
  );
}
