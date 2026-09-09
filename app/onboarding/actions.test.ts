import { beforeEach, describe, expect, it, vi } from "vitest";
import { registerUser } from "@/application/onboarding/register-user";
import { ApiClientError } from "@/infrastructure/api/base-client";
import { submitRegistration } from "./actions";

vi.mock("@/application/onboarding/register-user", () => ({
  registerUser: vi.fn(),
}));

vi.mock("@/infrastructure/repositories/onboarding/api-user-repository", () => ({
  ApiUserRepository: class MockApiUserRepository {},
}));

vi.mock("@/infrastructure/auth", () => ({
  getAuthService: vi.fn().mockReturnValue({}),
}));

describe("submitRegistration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("passes the consumer address from FormData to the registration use case", async () => {
    vi.mocked(registerUser).mockResolvedValue({ redirectTo: "/consumidor/home" });

    const formData = new FormData();
    formData.set("firstName", "Ana");
    formData.set("lastName", "Pérez");
    formData.set("role", "consumer");
    formData.set("street", "Av. Rivadavia");
    formData.set("streetNumber", "5100");

    await submitRegistration(formData);

    const command = vi.mocked(registerUser).mock.calls[0]?.[2];
    expect(command).toMatchObject({
      firstName: "Ana",
      lastName: "Pérez",
      role: "consumer",
      address: {
        street: "Av. Rivadavia",
        streetNumber: "5100",
      },
    });
  });

  it("passes optional floor and unit fields from FormData", async () => {
    vi.mocked(registerUser).mockResolvedValue({ redirectTo: "/consumidor/home" });

    const formData = new FormData();
    formData.set("firstName", "Ana");
    formData.set("lastName", "Pérez");
    formData.set("role", "consumer");
    formData.set("street", "Av. Rivadavia");
    formData.set("streetNumber", "5100");
    formData.set("floor", "4");
    formData.set("unit", "B");

    await submitRegistration(formData);

    const command = vi.mocked(registerUser).mock.calls[0]?.[2];
    expect(command?.address).toEqual({
      street: "Av. Rivadavia",
      streetNumber: "5100",
      floor: "4",
      unit: "B",
    });
  });

  it("returns a safe translated message for an unvalidated consumer address", async () => {
    vi.mocked(registerUser).mockRejectedValue(
      new ApiClientError(400, "Bad Request", "Address could not be validated")
    );

    const formData = new FormData();
    formData.set("firstName", "Ana");
    formData.set("lastName", "Pérez");
    formData.set("role", "consumer");
    formData.set("street", "Calle Inexistente");
    formData.set("streetNumber", "99999");

    await expect(submitRegistration(formData)).resolves.toEqual({
      success: false,
      error: "No se pudo validar la dirección ingresada",
    });
  });

  it("returns a safe translated message for an out-of-service consumer address", async () => {
    vi.mocked(registerUser).mockRejectedValue(
      new ApiClientError(400, "Bad Request", "Services are not available in this location")
    );

    const formData = new FormData();
    formData.set("firstName", "Ana");
    formData.set("lastName", "Pérez");
    formData.set("role", "consumer");
    formData.set("street", "Ruta Nacional 5");
    formData.set("streetNumber", "100");

    await expect(submitRegistration(formData)).resolves.toEqual({
      success: false,
      error: "Todavía no ofrecemos servicios en esa ubicación",
    });
  });
});
