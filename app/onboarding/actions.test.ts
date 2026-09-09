import { beforeEach, describe, expect, it, vi } from "vitest";
import { registerUser } from "@/application/onboarding/register-user";
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
});
