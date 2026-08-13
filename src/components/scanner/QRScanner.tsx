import { useEffect, useRef, useState, useCallback } from "react";
import { Html5Qrcode, Html5QrcodeScannerState } from "html5-qrcode";
import { cn } from "@/lib/utils";
import { Camera, CameraOff, Loader2, VideoOff } from "lucide-react";
import { useTranslation } from "react-i18next";

interface QRScannerProps {
  onScan: (decodedText: string) => void;
  isPaused: boolean;
}

type CameraState =
  | "initializing"
  | "ready"
  | "paused"
  | "permission-denied"
  | "no-camera"
  | "error";

const SCANNER_ID = "qr-scanner-viewport";
const DEBOUNCE_MS = 500;

/**
 * QR code scanner using html5-qrcode.
 *
 * Camera viewport is constrained to a 1:1 aspect ratio centered box
 * to match real-world QR code scanning usage.
 */
export function QRScanner({ onScan, isPaused }: QRScannerProps) {
  const { t } = useTranslation();
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const lastScanRef = useRef<number>(0);
  const [cameraState, setCameraState] = useState<CameraState>("initializing");
  const [errorMessage, setErrorMessage] = useState<string>("");

  // Debounced scan callback
  const handleScan = useCallback(
    (decodedText: string) => {
      const now = Date.now();
      if (now - lastScanRef.current < DEBOUNCE_MS) return;
      lastScanRef.current = now;
      onScan(decodedText);
    },
    [onScan],
  );

  // Starts the camera + scanning
  const startScanner = useCallback(
    async (isMounted: { current: boolean }) => {
      try {
        const container = document.getElementById(SCANNER_ID);
        if (container) container.innerHTML = "";

        const scanner = new Html5Qrcode(SCANNER_ID, { verbose: false });
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: "environment" },
          { fps: 20 },
          (decodedText) => {
            if (isMounted.current) handleScan(decodedText);
          },
          () => {
            /* ignore QR detection failures */
          },
        );

        if (isMounted.current) {
          setCameraState("ready");
        } else {
          await scanner.stop().catch(() => { });
          scanner.clear();
          scannerRef.current = null;
        }
      } catch (err) {
        if (!isMounted.current) return;

        const message = err instanceof Error ? err.message : String(err);
        console.error("[QRScanner] Init error:", message);

        if (message.includes("Permission") || message.includes("NotAllowedError")) {
          setCameraState("permission-denied");
          setErrorMessage(t("scanner.camera.permissionDenied"));
        } else if (
          message.includes("NotFoundError") ||
          message.includes("DevicesNotFound") ||
          message.includes("Requested device not found")
        ) {
          setCameraState("no-camera");
          setErrorMessage(t("scanner.camera.noCamera"));
        } else {
          setCameraState("error");
          setErrorMessage(message);
        }
      }
    },
    [handleScan, t],
  );

  // Stops and fully releases the camera hardware
  const stopScanner = useCallback(async () => {
    const scanner = scannerRef.current;
    if (!scanner) return;
    const state = scanner.getState();
    if (state === Html5QrcodeScannerState.SCANNING || state === Html5QrcodeScannerState.PAUSED) {
      await scanner.stop().catch(() => { });
    }
    try {
      scanner.clear();
    } catch {
      /* noop */
    }
    scannerRef.current = null;
  }, []);

  // Mount / unmount lifecycle
  useEffect(() => {
    const isMounted = { current: true };
    void startScanner(isMounted);
    return () => {
      isMounted.current = false;
      void stopScanner();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pause / resume — properly stops and restarts camera
  useEffect(() => {
    if (isPaused) {
      void stopScanner().then(() => {
        setCameraState("paused");
      });
    } else if (cameraState === "paused") {
      setCameraState("initializing");
      const isMounted = { current: true };
      void startScanner(isMounted);
      return () => {
        isMounted.current = false;
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPaused]);

  const isActive = cameraState === "ready";

  return (
    <div className="relative flex-1 flex flex-col items-center justify-center bg-[#1a1714] overflow-hidden">
      {/*
       * html5-qrcode injects inline `style="width: 943px"` on the <video>
       * via JS after React render — Tailwind arbitrary-variant selectors
       * can't reliably override JS-set inline styles.  A proper CSS rule
       * with `!important` always wins.
       */}
      <style>{`
        #${SCANNER_ID} video {
          width: 100% !important;
          height: 100% !important;
          object-fit: cover !important;
          object-position: center !important;
          display: block !important;
        }
        #${SCANNER_ID} img,
        #${SCANNER_ID} canvas,
        #${SCANNER_ID} > div {
          display: none !important;
        }
      `}</style>

      {/* ── Scanner viewport ─────────────────────────────── */}
      <div className="relative w-full h-full flex items-center justify-center">
        {/*
         * Use `invisible` instead of `hidden` so the container keeps its
         * layout dimensions during initialization.  html5-qrcode measures
         * the container's clientWidth/clientHeight at `scanner.start()` —
         * `display:none` gives it 0×0, which produces the black rectangle.
         */}
        <div
          id={SCANNER_ID}
          className={cn(
            "w-full h-full overflow-hidden",
            !isActive && "invisible",
          )}
        />

        {/* QR viewfinder overlay — only visible when camera is active */}
        {isActive && (
          <div className="absolute inset-0 pointer-events-none z-10">
            {/* Dark overlay with transparent center cutout via SVG mask */}
            <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
              <defs>
                <mask id="viewfinder-cutout">
                  <rect width="100%" height="100%" fill="white" />
                  {/* Centered square cutout — calc-based so it's always centered */}
                  <rect
                    x="50%" y="50%" width="220" height="220"
                    rx="16" ry="16" fill="black"
                    transform="translate(-110,-110)"
                  />
                </mask>
              </defs>
              <rect
                width="100%" height="100%"
                fill="rgba(0,0,0,0.55)"
                mask="url(#viewfinder-cutout)"
              />
            </svg>

            {/* Corner brackets — centered square, same size as SVG cutout */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[220px] h-[220px]">
              {/* Top-left */}
              <div className="absolute top-0 left-0 w-10 h-10 border-t-[3px] border-l-[3px] border-[#0061fe] rounded-tl-2xl" />
              {/* Top-right */}
              <div className="absolute top-0 right-0 w-10 h-10 border-t-[3px] border-r-[3px] border-[#0061fe] rounded-tr-2xl" />
              {/* Bottom-left */}
              <div className="absolute bottom-0 left-0 w-10 h-10 border-b-[3px] border-l-[3px] border-[#0061fe] rounded-bl-2xl" />
              {/* Bottom-right */}
              <div className="absolute bottom-0 right-0 w-10 h-10 border-b-[3px] border-r-[3px] border-[#0061fe] rounded-br-2xl" />
            </div>
          </div>
        )}

        {/* ── Paused state ────────────────────────────── */}
        {cameraState === "paused" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[#1a1714] z-20 animate-fade-in">
            <CameraOff className="w-16 h-16 text-[#5e5650]" strokeWidth={1.2} />
            <p className="text-[#c2b9b3] text-base font-semibold">{t("scanner.camera.paused")}</p>
            <p className="text-[#5e5650] text-xs">{t("scanner.camera.pausedHint")}</p>
          </div>
        )}

        {/* ── Initializing state ────────────────────── */}
        {cameraState === "initializing" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[#1a1714] z-20">
            <Loader2 className="w-12 h-12 text-[#0061fe] animate-spin" />
            <p className="text-[#5e5650] text-sm">{t("scanner.camera.initializing")}</p>
          </div>
        )}

        {/* ── Permission denied ───────────────────────── */}
        {cameraState === "permission-denied" && (
          <ScannerEmptyState
            icon={<CameraOff className="w-16 h-16 text-[#e4a020]" strokeWidth={1.2} />}
            title={t("scanner.camera.permissionTitle")}
            description={errorMessage}
            hint={t("scanner.camera.permissionHint")}
          />
        )}

        {/* ── No camera ──────────────────────────────── */}
        {cameraState === "no-camera" && (
          <ScannerEmptyState
            icon={<VideoOff className="w-16 h-16 text-[#f87171]" strokeWidth={1.2} />}
            title={t("scanner.camera.noCameraTitle")}
            description={errorMessage}
          />
        )}

        {/* ── Generic error ─────────────────────────── */}
        {cameraState === "error" && (
          <ScannerEmptyState
            icon={<Camera className="w-16 h-16 text-[#f87171]" strokeWidth={1.2} />}
            title={t("scanner.camera.errorTitle")}
            description={errorMessage}
            hint={t("scanner.camera.errorHint")}
          />
        )}
      </div>

      {/* ── Instruction text — pinned to bottom of viewport ── */}
      {isActive && (
        <p className="absolute bottom-4 left-0 right-0 text-[#8f857f] text-xs text-center px-8 z-10">
          {t("scanner.scanHint")}
        </p>
      )}
    </div>
  );
}

/* ─── Scanner-specific empty/error state ─── */
function ScannerEmptyState({
  icon,
  title,
  description,
  hint,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  hint?: string;
}) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center z-20">
      <div className="text-[#5e5650]">{icon}</div>
      <h3 className="font-semibold text-xl text-[#f0ebe6]">{title}</h3>
      <p className="text-sm text-[#8f857f] max-w-xs">{description}</p>
      {hint && <p className="text-xs text-[#5e5650] max-w-xs">{hint}</p>}
    </div>
  );
}
