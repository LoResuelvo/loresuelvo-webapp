import { ProviderHomeDashboard, ProviderHomeRepository } from "./types";

const mockDashboard: ProviderHomeDashboard = {
  workRequests: [
    {
      id: "request-1",
      conversationId: "1",
      clientName: "María Fernández",
      problemTitle: "Cortocircuito en cocina",
      category: "Electricidad",
      description: "Se saltó la térmica al encender el horno eléctrico. Necesito que alguien lo revise urgente.",
      location: "Palermo, CABA",
      publishedAtLabel: "Hace 20 min",
      unreadMessagesCount: 1,
    },
    {
      id: "request-2",
      conversationId: "2",
      clientName: "Javier Torres",
      problemTitle: "Instalación de luminarias",
      category: "Electricidad",
      description: "Busco instalar tres luces nuevas en el living.",
      location: "Caballito, CABA",
      publishedAtLabel: "Hace 1 h",
      unreadMessagesCount: 3,
    },
  ],
  scheduledJobs: [
    {
      id: "job-1",
      jobTitle: "Reparación de grifería",
      clientName: "Carlos Méndez",
      scheduledAtLabel: "Mañana, 10:00",
      location: "Belgrano, CABA",
      priceLabel: "$45.000",
    },
  ],
  metrics: {
    incomeLabel: "$125.000",
    jobsCompletedCount: 12,
    ratingLabel: "4.8",
  },
};

export class MockProviderHomeRepository implements ProviderHomeRepository {
  async getDashboard(_providerId: string): Promise<ProviderHomeDashboard> {
    return mockDashboard;
  }
}
