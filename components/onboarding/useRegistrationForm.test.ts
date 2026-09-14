import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { uploadProfilePhoto } from "./useRegistrationForm";
import * as executeUploadModule from "@/application/files/execute-file-upload";
import { clientFileUploadRepository } from "@/app/files/client-file-upload";
import { useRegistrationForm } from "./useRegistrationForm";
import type { AuthSession } from "@/infrastructure/auth/types";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/application/files/execute-file-upload", () => ({
  executeFileUpload: vi.fn(),
}));

describe("uploadProfilePhoto", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does nothing if no profile photo is attached in formData", async () => {
    const formData = new FormData();
    await uploadProfilePhoto(formData);

    expect(executeUploadModule.executeFileUpload).not.toHaveBeenCalled();
  });

  it("uploads profile photo and updates formData fields", async () => {
    const file = new File(["dummy"], "avatar.png", { type: "image/png" });
    const formData = new FormData();
    formData.append("profilePhoto", file);

    vi.mocked(executeUploadModule.executeFileUpload).mockResolvedValue({
      fileId: "confirmed-id",
      url: "https://cdn.example.com/avatar.png",
      originalName: "avatar.png",
    });

    await uploadProfilePhoto(formData);

    expect(executeUploadModule.executeFileUpload).toHaveBeenCalledWith(
      clientFileUploadRepository,
      {
        file,
        originalName: "avatar.png",
        mimeType: "image/png",
        purpose: "profile_photo",
      }
    );

    expect(formData.get("profilePhoto")).toBeNull();
    expect(formData.get("profilePhotoId")).toBe("confirmed-id");
    expect(formData.get("profilePhotoUrl")).toBe("https://cdn.example.com/avatar.png");
  });

  it("moves to Mercado Pago and preserves the onboarding stage in the URL", () => {
    const providerSession: AuthSession = {
      user: {
        id: "provider-001",
        email: "prestador@loresuelvo.test",
        firstName: "Carlos",
        lastName: "López",
        isOnboarded: true,
        role: "provider",
      },
      accessToken: "mock-access-token",
    };
    const originalPath = window.location.pathname + window.location.search;

    const { result } = renderHook(() =>
      useRegistrationForm(providerSession, "identity"),
    );

    act(() => {
      result.current.goToMercadoPago();
    });

    expect(result.current.step).toBe("mercadoPago");
    expect(window.location.pathname + window.location.search).toBe(
      "/onboarding?stage=mercado-pago",
    );
    expect(mockPush).not.toHaveBeenCalled();

    window.history.replaceState(null, "", originalPath);
  });
});
