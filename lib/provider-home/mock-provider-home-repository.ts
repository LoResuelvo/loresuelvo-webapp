import { ProviderHomeDashboard, ProviderHomeRepository } from "./types";

const mockDashboard: ProviderHomeDashboard = {
  workRequests: [
    {
      id: "request-1",
      clientName: "María Fernández",
      problemTitle: "Pérdida de agua en cocina",
      summary: "Necesita reparar una pérdida debajo de la bacha.",
      location: "Palermo, CABA",
      publishedAtLabel: "Hace 20 min",
    },
    {
      id: "request-2",
      clientName: "Javier Torres",
      problemTitle: "Instalación de luminarias",
      summary: "Busca instalar tres luces nuevas en el living.",
      location: "Caballito, CABA",
      publishedAtLabel: "Hace 1 h",
    },
  ],
};

export class MockProviderHomeRepository implements ProviderHomeRepository {
  async getDashboard(_providerId: string): Promise<ProviderHomeDashboard> {
    return mockDashboard;
  }
}
