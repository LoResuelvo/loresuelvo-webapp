import { Given, When, Then } from "@cucumber/cucumber";
import { page } from "./landing_page_visualization_steps";
import { addApiStub } from "./stubs-helper";
import assert from "assert";

Given('existen los rubros Plomería, Electricista y Gasista', async () => {
  await addApiStub({
    method: "GET",
    endpoint: "/categories",
    status: 200,
    body: [
      { id: 1, name: "Plomería", description: "" },
      { id: 2, name: "Electricista", description: "" },
      { id: 3, name: "Gasista", description: "" }
    ]
  });
});

Given('existen los siguientes prestadores registrados:', async (dataTable) => {
  const providers = dataTable.hashes();

  const providersByCategory: Record<string, any[]> = {};

  for (const provider of providers) {
    const categoryId = provider.category_id;
    if (!providersByCategory[categoryId]) {
      providersByCategory[categoryId] = [];
    }
    
    providersByCategory[categoryId].push({
      id: parseInt(provider.id.replace("prov-", "")),
      name: provider.name,
      surname: provider.surname,
      category_name: provider.category_name
    });
  }

  for (const [categoryId, providersList] of Object.entries(providersByCategory)) {
    await addApiStub({
      method: "GET",
      endpoint: `/providers?category_id=${categoryId}`,
      status: 200,
      body: providersList
    });
  }

});

Given('que no existen prestadores registrados para el rubro {string}', async (categoryName: string) => {
  const categoryMap: Record<string, number> = {
    "Plomería": 1,
    "Electricista": 2,
    "Gas": 3
  };
  
  const categoryId = categoryMap[categoryName];
  if (!categoryId) {
    throw new Error(`Category ID not found for: ${categoryName}`);
  }

  await addApiStub({
    method: "GET",
    endpoint: `/providers?category_id=${categoryId}`,
    status: 200,
    body: []
  });
});

When('hago clic en la tarjeta del rubro {string}', async (categoryName: string) => {
  const card = page.getByRole('button', { name: categoryName, exact: true })
    .or(page.getByRole('link', { name: categoryName, exact: true }))
    .or(page.getByText(categoryName, { exact: true }))
    .first();
    
  await card.waitFor({ state: "visible" });
  await card.click();
});

Then('soy redirigido al listado de técnicos del rubro {string}', async (categoryName: string) => {
  await page.waitForURL(url => !url.toString().endsWith('/consumer/home'), { timeout: 5000 }).catch(() => {
  });
});

Then('veo la tarjeta del técnico {string} con el rubro {string}', async (providerName: string, categoryName: string) => {
  const providerText = page.getByText(providerName, { exact: false }).first();
  await providerText.waitFor({ state: "visible" });
  assert.ok(await providerText.isVisible(), `There is no provider "${providerName}"`);
  
  const categoryText = page.getByText(categoryName, { exact: false }).first();
  assert.ok(await categoryText.isVisible(), `There is no category "${categoryName}"`);
});

Then('veo el mensaje {string}', async (mensaje: string) => {
  const messageElement = page.getByText(mensaje, { exact: false }).first();
  await messageElement.waitFor({ state: "visible" });
  assert.ok(await messageElement.isVisible(), `There is no message: "${mensaje}"`);
});
