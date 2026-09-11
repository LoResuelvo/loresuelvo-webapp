import { describe, expect, it } from "vitest";
import type { ApiStub } from "./types";
import {
  createE2EStubCookies,
  parseE2EStubsFromCookies,
} from "./e2e-stubs-utils";

describe("E2E stub cookies", () => {
  it("round-trips unicode payloads split across multiple cookies", () => {
    const stubs: ApiStub[] = [
      {
        method: "POST",
        endpoint: "/chatbot/conversations/1/messages",
        status: 201,
        body: {
          content: "Entonces podría ser la manguera de desagüe. ¿Podrías revisarla?".repeat(30),
        },
      },
    ];

    const cookies = createE2EStubCookies(stubs).filter((cookie) => !cookie.expires);
    const cookiesDecodedByServer = cookies.map((cookie) => ({
      ...cookie,
      value: decodeURIComponent(cookie.value),
    }));

    expect(cookies.length).toBeGreaterThan(1);
    expect(parseE2EStubsFromCookies(cookiesDecodedByServer)).toEqual(stubs);
  });

  it("continues to read legacy URI-encoded cookies", () => {
    const stubs: ApiStub[] = [
      {
        method: "GET",
        endpoint: "/legacy",
        status: 200,
        body: { message: "Información" },
      },
    ];

    expect(
      parseE2EStubsFromCookies([
        {
          name: "__e2e_api_stubs_0",
          value: encodeURIComponent(JSON.stringify(stubs)),
        },
      ]),
    ).toEqual(stubs);
  });
});
