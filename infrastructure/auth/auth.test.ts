import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MockAuthAdapter, MOCK_SESSION_COOKIE } from "./mock-adapter";
import { Auth0Adapter } from "./auth0-adapter";
import { DevAuthAdapter } from "./dev-adapter";
import { getAuthService } from "./index";
import { AuthSession } from "./types";

// Declare mock stores inside vi.hoisted so they are initialized before mocks are executed
const { mockCookiesStore, mockAuth0 } = vi.hoisted(() => {
  return {
    mockCookiesStore: {
      get: vi.fn(),
      set: vi.fn(),
      has: vi.fn(),
    },
    mockAuth0: {
      getSession: vi.fn(),
      updateSession: vi.fn(),
    },
  };
});

vi.mock("next/headers", () => ({
  cookies: async () => mockCookiesStore,
}));

vi.mock("@/lib/auth0", () => ({
  auth0: mockAuth0,
}));

describe("MockAuthAdapter", () => {
  let adapter: MockAuthAdapter;

  beforeEach(() => {
    vi.clearAllMocks();
    adapter = new MockAuthAdapter();
  });

  it("should return null if mock session cookie is missing", async () => {
    mockCookiesStore.get.mockReturnValue(undefined);
    const session = await adapter.getSession();
    expect(session).toBeNull();
    expect(mockCookiesStore.get).toHaveBeenCalledWith(MOCK_SESSION_COOKIE);
  });

  it("should return parsed session if mock cookie is present", async () => {
    const mockSession: AuthSession = {
      user: { id: "mock-123", email: "mock@test.com", firstName: "Mock", lastName: "User", isOnboarded: false },
      accessToken: "token-123",
    };
    mockCookiesStore.get.mockReturnValue({ value: encodeURIComponent(JSON.stringify(mockSession)) });

    const session = await adapter.getSession();
    expect(session).toEqual(mockSession);
  });

  it("should return null if mock cookie contains invalid JSON", async () => {
    mockCookiesStore.get.mockReturnValue({ value: "invalid-json" });
    const session = await adapter.getSession();
    expect(session).toBeNull();
  });

  it("should update and set updated session in cookies", async () => {
    const originalSession: AuthSession = {
      user: { id: "mock-123", email: "mock@test.com", firstName: "", lastName: "", isOnboarded: false },
    };
    mockCookiesStore.get.mockReturnValue({ value: encodeURIComponent(JSON.stringify(originalSession)) });

    await adapter.updateSession({
      firstName: "Andres",
      lastName: "Colina",
      isOnboarded: true,
    });

    expect(mockCookiesStore.set).toHaveBeenCalled();
    const [cookieName, cookieValue] = mockCookiesStore.set.mock.calls[0];
    expect(cookieName).toBe(MOCK_SESSION_COOKIE);
    
    const savedSession = JSON.parse(decodeURIComponent(cookieValue)) as AuthSession;
    expect(savedSession.user.firstName).toBe("Andres");
    expect(savedSession.user.lastName).toBe("Colina");
    expect(savedSession.user.isOnboarded).toBe(true);
  });
});

describe("Auth0Adapter", () => {
  let adapter: Auth0Adapter;

  beforeEach(() => {
    vi.clearAllMocks();
    adapter = new Auth0Adapter();
  });

  it("should return null if there is no active Auth0 session", async () => {
    mockAuth0.getSession.mockResolvedValue(null);
    const session = await adapter.getSession();
    expect(session).toBeNull();
  });

  it("should map Auth0 claims to unifed AuthSession layout", async () => {
    const mockAuth0Session = {
      user: {
        sub: "auth0|600",
        email: "test@auth0.com",
        given_name: "Andres",
        family_name: "Colina",
        isOnboarded: true,
      },
      tokenSet: { accessToken: "access-token-999" },
    };
    mockAuth0.getSession.mockResolvedValue(mockAuth0Session);

    const session = await adapter.getSession();
    expect(session).toEqual({
      user: {
        id: "auth0|600",
        email: "test@auth0.com",
        firstName: "Andres",
        lastName: "Colina",
        isOnboarded: true,
      },
      accessToken: "access-token-999",
    });
  });

  it("should call auth0.updateSession with correctly mapped OIDC properties", async () => {
    const originalAuth0Session = {
      user: {
        sub: "auth0|600",
        email: "test@auth0.com",
        given_name: "",
        family_name: "",
        isOnboarded: false,
      },
    };
    mockAuth0.getSession.mockResolvedValue(originalAuth0Session);

    await adapter.updateSession({
      firstName: "Andres",
      lastName: "Colina",
      isOnboarded: true,
    });

    expect(mockAuth0.updateSession).toHaveBeenCalledWith({
      ...originalAuth0Session,
      user: {
        ...originalAuth0Session.user,
        given_name: "Andres",
        family_name: "Colina",
        isOnboarded: true,
      },
    });
  });
});

describe("DevAuthAdapter", () => {
  let adapter: DevAuthAdapter;

  beforeEach(() => {
    vi.clearAllMocks();
    adapter = new DevAuthAdapter();
  });

  it("should delegate getSession to MockAuthAdapter if e2e session cookie is present", async () => {
    mockCookiesStore.has.mockImplementation((name) => name === MOCK_SESSION_COOKIE);
    const mockSession = { user: { id: "mock" } };
    mockCookiesStore.get.mockReturnValue({ value: encodeURIComponent(JSON.stringify(mockSession)) });

    const session = await adapter.getSession();
    expect(session?.user.id).toBe("mock");
    expect(mockAuth0.getSession).not.toHaveBeenCalled();
  });

  it("should delegate getSession to Auth0Adapter if e2e session cookie is missing", async () => {
    mockCookiesStore.has.mockReturnValue(false);
    mockAuth0.getSession.mockResolvedValue(null);

    const session = await adapter.getSession();
    expect(session).toBeNull();
    expect(mockAuth0.getSession).toHaveBeenCalled();
  });

  it("should delegate updateSession to MockAuthAdapter if e2e cookie is present", async () => {
    mockCookiesStore.has.mockImplementation((name) => name === MOCK_SESSION_COOKIE);
    const mockSession = { user: { id: "mock" } };
    mockCookiesStore.get.mockReturnValue({ value: encodeURIComponent(JSON.stringify(mockSession)) });

    await adapter.updateSession({ firstName: "Test" });
    expect(mockCookiesStore.set).toHaveBeenCalled();
    expect(mockAuth0.updateSession).not.toHaveBeenCalled();
  });

  it("should delegate updateSession to Auth0Adapter if e2e cookie is missing", async () => {
    mockCookiesStore.has.mockReturnValue(false);
    const originalAuth0Session = { user: { sub: "123" } };
    mockAuth0.getSession.mockResolvedValue(originalAuth0Session);

    await adapter.updateSession({ firstName: "Test" });
    expect(mockAuth0.updateSession).toHaveBeenCalled();
    expect(mockCookiesStore.set).not.toHaveBeenCalled();
  });
});

describe("getAuthService factory", () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  it("should return Auth0Adapter in production", () => {
    process.env.NODE_ENV = "production";
    const service = getAuthService();
    expect(service).toBeInstanceOf(Auth0Adapter);
  });

  it("should return DevAuthAdapter in test or development", () => {
    process.env.NODE_ENV = "test";
    const service = getAuthService();
    expect(service).toBeInstanceOf(DevAuthAdapter);
  });
});
