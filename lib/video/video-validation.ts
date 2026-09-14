export const VIDEO_ALLOWED_MIME_TYPES = ["video/mp4"] as const;
export const VIDEO_MAX_BYTES = 50 * 1024 * 1024; // 52,428,800 bytes
export const VIDEO_MAX_DURATION_SECONDS = 120;
export const VIDEO_MAX_DIMENSION_PX = 1920;

export type VideoFileValidationError = "invalidFormat" | "emptyFile" | "tooLarge";
export type VideoMetadataValidationError =
  | "corruptedOrUnreadable"
  | "durationTooLong"
  | "dimensionsTooLarge";

export type VideoValidationError = VideoFileValidationError | VideoMetadataValidationError;

export function isSupportedVideoFile(file: Pick<File, "type" | "name">): boolean {
  if (file.type && VIDEO_ALLOWED_MIME_TYPES.includes(file.type as (typeof VIDEO_ALLOWED_MIME_TYPES)[number])) {
    return true;
  }
  return file.name.toLowerCase().endsWith(".mp4");
}

export function validateVideoFile(
  file: Pick<File, "type" | "size" | "name">
): VideoFileValidationError | null {
  if (!isSupportedVideoFile(file)) return "invalidFormat";
  if (file.size === 0) return "emptyFile";
  if (file.size > VIDEO_MAX_BYTES) return "tooLarge";
  return null;
}

export function validateVideoMetadata(meta: {
  duration: number;
  width: number;
  height: number;
}): VideoMetadataValidationError | null {
  if (
    !Number.isFinite(meta.duration) ||
    meta.duration <= 0 ||
    !Number.isFinite(meta.width) ||
    meta.width <= 0 ||
    !Number.isFinite(meta.height) ||
    meta.height <= 0
  ) {
    return "corruptedOrUnreadable";
  }

  if (meta.duration > VIDEO_MAX_DURATION_SECONDS) {
    return "durationTooLong";
  }

  if (meta.width > VIDEO_MAX_DIMENSION_PX || meta.height > VIDEO_MAX_DIMENSION_PX) {
    return "dimensionsTooLarge";
  }

  return null;
}

export interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
}

export function readVideoMetadata(file: File): Promise<VideoMetadata> {
  if (
    typeof window !== "undefined" &&
    (window as unknown as { __e2eVideoMetadata?: Record<string, VideoMetadata & { shouldFail?: boolean }> })
      .__e2eVideoMetadata?.[file.name]
  ) {
    const meta = (
      window as unknown as { __e2eVideoMetadata: Record<string, VideoMetadata & { shouldFail?: boolean }> }
    ).__e2eVideoMetadata[file.name];
    if (meta.shouldFail) {
      return Promise.reject(new Error("corruptedOrUnreadable"));
    }
    return Promise.resolve({
      duration: meta.duration,
      width: meta.width,
      height: meta.height,
    });
  }

  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    const objectUrl = URL.createObjectURL(file);
    video.src = objectUrl;

    const cleanup = () => {
      URL.revokeObjectURL(objectUrl);
      video.removeAttribute("src");
      video.load();
    };

    video.onloadedmetadata = () => {
      const duration = video.duration;
      const width = video.videoWidth;
      const height = video.videoHeight;
      cleanup();
      resolve({ duration, width, height });
    };

    video.onerror = () => {
      cleanup();
      reject(new Error("corruptedOrUnreadable"));
    };
  });
}
