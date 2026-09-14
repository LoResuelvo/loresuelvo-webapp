import { Given, When, Then } from "@cucumber/cucumber";
import { CustomWorld, APP_URL, attachedTimeout, visibleTimeout } from "../support/world";
import {
  aCategory,
  aConfirmedFile,
  aCoverageZone,
  aCurrentUser,
  aPresignedUpload,
  aProvider,
} from "../support/factories";
import { ROUTES } from "../../lib/routes";
import { t } from "../../infrastructure/i18n/translations";
import assert from "assert";

async function prepareProviderProfile(world: CustomWorld): Promise<void> {
  await world.setSession("consumer", {
    id: "mock-001",
    email: "prestador@example.com",
    firstName: "",
    lastName: "",
    isOnboarded: false,
  });
  await world.stubGet("/categories", [aCategory({ id: 1, name: "Plomería" })]);
  await world.stubGet("/coverage-zones", [
    aCoverageZone({ id: 6, name: "Comuna 6" }),
    aCoverageZone({ id: 14, name: "Comuna 14" }),
  ]);
  await world.stubPost("/files/presign", 200, aPresignedUpload());
  await world.stubPost("/files/test-file-id/confirm", 200, aConfirmedFile());
  await world.page.route("**/mock-s3-upload", async (route, request) => {
    if (request.method() === "PUT") {
      await route.fulfill({ status: 200 });
      return;
    }
    await route.continue();
  });

  world.selectedRole = "provider";
  await world.page.goto(APP_URL + ROUTES.onboarding);
  const providerButton = world.page.locator("#role-provider-btn").first();
  await providerButton.waitFor(visibleTimeout);
  await providerButton.click();
  const continueButton = world.page.getByRole("button", { name: /continuar/i }).first();
  await continueButton.waitFor(visibleTimeout);
  await continueButton.click();

  await world.page.getByLabel("Nombre").waitFor(visibleTimeout);
  await world.page.getByLabel("Nombre").fill("Carlos");
  await world.page.getByLabel("Apellido").fill("López");
  await world.page.getByLabel("Rubro").selectOption("1");

  const fileInput = world.page.locator('input[type="file"]');
  await fileInput.waitFor(attachedTimeout);
  await fileInput.setInputFiles({
    name: "avatar.png",
    mimeType: "image/png",
    buffer: Buffer.alloc(1024, "a"),
  });

  const zoneCheckbox = world.page.locator('input[name="coverageZones"][value="6"]');
  await zoneCheckbox.waitFor(attachedTimeout);
  await zoneCheckbox.check();
}

async function stubProviderRegistration(world: CustomWorld): Promise<void> {
  await world.stubPost(
    "/providers",
    201,
    aProvider({
      id: 1,
      name: "Carlos",
      surname: "López",
      profile_photo_url: "http://localhost:3001/mock-s3-url/avatar.png",
      coverage_zone_ids: [6],
    })
  );
}

async function submitProviderProfile(world: CustomWorld): Promise<void> {
  const submitButton = world.page.getByRole("button", { name: "Finalizar Registro" }).first();
  await submitButton.waitFor(visibleTimeout);
  await submitButton.click();
}

async function showProviderIdentityInvitation(world: CustomWorld): Promise<void> {
  await prepareProviderProfile(world);
  await stubProviderRegistration(world);
  await submitProviderProfile(world);
  await world.page.getByTestId("identity-verification-step").waitFor(visibleTimeout);
}

async function clickVerifyNow(world: CustomWorld): Promise<void> {
  const button = world.page.getByRole("button", { name: "Verificar ahora" }).first();
  await button.waitFor(visibleTimeout);
  await button.click();
}

async function stubUnavailableIdentityService(world: CustomWorld): Promise<void> {
  await world.stubPost(
    "/providers/me/identity-verification-sessions",
    503,
    { error: "Identity verification service unavailable" },
  );
}

async function waitForTemporaryIdentityError(world: CustomWorld): Promise<void> {
  const error = world.page
    .getByRole("alert")
    .filter({ hasText: t.onboarding.identityVerification.errorTemporary })
    .first();
  await error.waitFor(visibleTimeout);
  assert.equal(
    await error.textContent(),
    t.onboarding.identityVerification.errorTemporary,
  );
}

Given(
  "completé los datos, la foto, el rubro y las zonas obligatorios del prestador",
  async function (this: CustomWorld) {
    await prepareProviderProfile(this);
  }
);

Given("la API puede crear mi cuenta correctamente", async function (this: CustomWorld) {
  await stubProviderRegistration(this);
});

When("confirmo el registro como prestador", async function (this: CustomWorld) {
  await submitProviderProfile(this);
  const invitation = this.page.getByTestId("identity-verification-step");
  await invitation.waitFor({ state: "visible", timeout: 10000 });
});

Then("veo la invitación opcional para verificar mi identidad", async function (this: CustomWorld) {
  const invitation = this.page.getByTestId("identity-verification-step");
  await invitation.waitFor({ state: "visible", timeout: 10000 });
  assert.ok(await invitation.isVisible(), "No se muestra la invitación opcional de identidad");
});

Then("la pantalla informa que mi cuenta ya fue creada", async function (this: CustomWorld) {
  const accountCreated = this.page.getByText(t.onboarding.identityVerification.accountCreated).first();
  await accountCreated.waitFor({ state: "visible", timeout: 10000 });
  assert.ok(await accountCreated.isVisible(), "No se informa que la cuenta ya fue creada");
});

Then(
  "veo las acciones {string} y {string}",
  async function (this: CustomWorld, firstAction: string, secondAction: string) {
    for (const action of [firstAction, secondAction]) {
      const button = this.page.getByRole("button", { name: action }).first();
      await button.waitFor({ state: "visible", timeout: 10000 });
      assert.ok(await button.isVisible(), `No se muestra la acción "${action}"`);
    }
  }
);

Then("veo el paso de conexión con Mercado Pago", async function (this: CustomWorld) {
  const title = this.page.getByText("Conectá tu cuenta de Mercado Pago").first();
  await title.waitFor({ state: "visible", timeout: 10000 });
  assert.ok(await title.isVisible(), "No se muestra el paso de conexión con Mercado Pago");
});

Given(
  "mi cuenta de prestador ya fue creada y veo la invitación de identidad",
  async function (this: CustomWorld) {
    await showProviderIdentityInvitation(this);
  }
);

When('elijo "Más tarde"', async function (this: CustomWorld) {
  const button = this.page.getByRole("button", { name: "Más tarde" }).first();
  await button.waitFor({ state: "visible", timeout: 10000 });
  await button.click();
});

async function stubRegisteredProviderIdentity(
  world: CustomWorld,
  status: string,
  verifiedOn: string | null = null,
): Promise<void> {
  await world.setSession("provider", {
    id: "provider-001",
    email: "prestador@example.com",
    firstName: "Carlos",
    lastName: "López",
    isOnboarded: true,
  });
  await world.stubGet("/categories", [aCategory({ id: 1, name: "Plomería" })]);
  await world.stubGet(
    "/me",
    aCurrentUser("provider", {
      identity_verification_status: status,
      identity_verified_on: verifiedOn,
    }),
  );
}

Given(
  "soy un prestador registrado sin sesiones previas y veo la invitación de identidad",
  async function (this: CustomWorld) {
    await stubRegisteredProviderIdentity(this, "unverified");
    await this.page.goto(`${APP_URL}${ROUTES.onboarding}?stage=identity`);
    await this.page.getByTestId("identity-verification-step").waitFor(visibleTimeout);
  },
);

Given(
  "soy un prestador registrado cuya identidad está aprobada en la API",
  async function (this: CustomWorld) {
    await stubRegisteredProviderIdentity(this, "approved", "2026-09-13T12:00:00Z");
  },
);

Given("veo mi verificación pendiente", async function (this: CustomWorld) {
  await stubRegisteredProviderIdentity(this, "in_review");
  await this.page.goto(`${APP_URL}${ROUTES.onboarding}?stage=identity`);
  await this.page.getByTestId("identity-verification-result").waitFor(visibleTimeout);
});

Given(
  "la API ahora informa mi identidad aprobada",
  async function (this: CustomWorld) {
    await this.stubGet(
      "/me",
      aCurrentUser("provider", {
        identity_verification_status: "approved",
        identity_verified_on: "2026-09-13T12:00:00Z",
      }),
    );
  },
);

Given(
  "veo el resultado {word} de mi verificación",
  async function (this: CustomWorld, status: string) {
    await stubRegisteredProviderIdentity(
      this,
      status,
      status === "approved" ? "2026-09-13T12:00:00Z" : null,
    );
    await this.page.goto(`${APP_URL}${ROUTES.onboarding}?stage=identity`);
    await this.page
      .getByTestId("identity-verification-step")
      .or(this.page.getByTestId("identity-verification-result"))
      .first()
      .waitFor(visibleTimeout);
  },
);

When(
  "ingreso al paso de identidad del onboarding",
  async function (this: CustomWorld) {
    await this.page.goto(`${APP_URL}${ROUTES.onboarding}?stage=identity`);
    await this.page.getByTestId("identity-verification-step").waitFor(visibleTimeout);
  },
);

When("elijo actualizar el estado", async function (this: CustomWorld) {
  const button = this.page
    .getByRole("button", { name: t.onboarding.identityVerification.refresh })
    .first();
  await button.waitFor(visibleTimeout);
  await button.click();
});

When(
  "elijo continuar con el onboarding",
  async function (this: CustomWorld) {
    const continueButton = this.page
      .getByRole("button", {
        name: t.onboarding.identityVerification.continueOnboarding,
      })
      .first();

    if ((await continueButton.count()) > 0) {
      await continueButton.waitFor(visibleTimeout);
      await continueButton.click();
      return;
    }

    const laterButton = this.page
      .getByRole("button", { name: t.onboarding.identityVerification.later })
      .first();
    await laterButton.waitFor(visibleTimeout);
    await laterButton.click();
  },
);

Given(
  "el servicio de verificación no está disponible",
  async function (this: CustomWorld) {
    await stubUnavailableIdentityService(this);
  },
);

Then("veo un error de verificación controlado", async function (this: CustomWorld) {
  await waitForTemporaryIdentityError(this);
});

Then(
  "veo opciones para reintentar o continuar más tarde",
  async function (this: CustomWorld) {
    for (const action of [
      t.onboarding.identityVerification.verifyNow,
      t.onboarding.identityVerification.later,
    ]) {
      const button = this.page.getByRole("button", { name: action }).first();
      await button.waitFor(visibleTimeout);
      assert.ok(await button.isVisible(), `No se muestra la opción "${action}"`);
    }
  },
);

Then(
  "no se me solicita completar nuevamente el perfil",
  async function (this: CustomWorld) {
    assert.equal(
      await this.page.getByRole("heading", { name: t.onboarding.profileForm.title }).count(),
      0,
      "Se volvió a mostrar el formulario de perfil",
    );
  },
);

Given("la API puede iniciar mi verificación", async function (this: CustomWorld) {
  await this.stubPost("/providers/me/identity-verification-sessions", 200, {
    session_id: "identity-session-1",
    session_token: "temporary-session-token",
    verification_url: "https://verify.example/session-1",
    status: "not_started",
  });
  await this.page.route("https://verify.example/**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "text/html",
      body: "<html><body>Didit hosted verification</body></html>",
    });
  });
});

Given(
  "el inicio anterior falló sin crear una sesión y veo el error",
  async function (this: CustomWorld) {
    await showProviderIdentityInvitation(this);
    await stubUnavailableIdentityService(this);
    await clickVerifyNow(this);
    await waitForTemporaryIdentityError(this);
  },
);

When("reintento iniciar la verificación", async function (this: CustomWorld) {
  await clickVerifyNow(this);
});

When('elijo "Verificar ahora"', async function (this: CustomWorld) {
  await clickVerifyNow(this);
});

Then("soy dirigido al flujo alojado de Didit", async function (this: CustomWorld) {
  await this.page.waitForURL("https://verify.example/session-1", { timeout: 10000 });
  assert.equal(new URL(this.page.url()).origin, "https://verify.example");
  assert.match(this.page.url(), /\/session-1$/);
});

Then("veo la confirmación de identidad verificada", async function (this: CustomWorld) {
  const confirmation = this.page
    .getByText(t.onboarding.identityVerification.verifiedDescription)
    .first();
  await confirmation.waitFor({ state: "visible", timeout: 10000 });
  assert.ok(await confirmation.isVisible(), "No se confirma la identidad verificada");
});

Then("no veo una acción para iniciar otra sesión", async function (this: CustomWorld) {
  const startAction = this.page.getByRole("button", {
    name: t.onboarding.identityVerification.verifyNow,
  });
  assert.equal(
    await startAction.count(),
    0,
    "Se muestra una acción para iniciar otra sesión de verificación",
  );
});

Given(
  "la API informa mi identidad en estado {word}",
  async function (this: CustomWorld, status: string) {
    await stubRegisteredProviderIdentity(this, status);
  },
);

When(
  "regreso a la página de resultado de identidad",
  async function (this: CustomWorld) {
    await this.page.goto(
      `${APP_URL}${ROUTES.onboardingIdentityVerificationReturn}?status=approved&session_token=ignored-token`,
    );
    await this.page.getByTestId("identity-verification-result").waitFor(visibleTimeout);
  },
);

Then(
  /^veo el mensaje correspondiente a (.+)$/,
  async function (this: CustomWorld, result: string) {
    const titles: Record<string, string> = {
      "identidad verificada": t.onboarding.identityVerification.verifiedTitle,
      "verificación pendiente": t.onboarding.identityVerification.pendingTitle,
      "verificación rechazada": t.onboarding.identityVerification.declinedTitle,
      "verificación abandonada": t.onboarding.identityVerification.abandonedTitle,
      "sesión vencida": t.onboarding.identityVerification.expiredTitle,
    };
    const title = titles[result];
    assert.ok(title, `No hay un resultado de identidad configurado para "${result}"`);
    const heading = this.page.getByRole("heading", { name: title, exact: true });
    await heading.waitFor({ state: "visible", timeout: 10000 });
    assert.ok(await heading.isVisible(), `No se muestra el resultado "${result}"`);
  },
);
