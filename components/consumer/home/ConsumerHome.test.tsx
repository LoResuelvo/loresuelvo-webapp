import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";
import ConsumerHome from "@/components/consumer/home/ConsumerHome";
import { getServiceProposalsAction } from "@/app/consumidor/mensajes/actions";
import * as NotificationContextModule from "@/infrastructure/notifications/NotificationContext";
import type { ResourceListener } from "@/infrastructure/notifications/NotificationContext";
import { t } from "@/infrastructure/i18n/translations";
import { ClockProvider } from "@/infrastructure/clock/ClockContext";

vi.mock("@/app/consumidor/mensajes/actions", () => ({
  getServiceProposalsAction: vi.fn(),
}));

const mockUser = {
  id: "1",
  email: "andres@pro.com",
  firstName: "Andres",
  lastName: "Colina",
};

const mockSession = {
  user: mockUser,
};

describe('ConsumerHome', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        vi.mocked(getServiceProposalsAction).mockReset();
    });

    it("renders the 'LoResuelvo' brand title in sidebar", () => {
        render(<ConsumerHome session={mockSession} categories={[]} />);
        expect(screen.getByText("LoResuelvo")).toBeInTheDocument();
    });

    it("renders the user's initials on the avatar button", () => {
        render(<ConsumerHome session={mockSession} categories={[]} />);
        expect(screen.getByText("A")).toBeInTheDocument();
    });

    it("opens the dropdown menu and displays user details and logout option on click", () => {
        render(<ConsumerHome session={mockSession} categories={[]} />);
        
        expect(screen.queryByText("Andres Colina")).not.toBeInTheDocument();

        const avatarButton = screen.getByRole("button", { name: "A" });
        fireEvent.click(avatarButton);

        expect(screen.getByText("Andres Colina")).toBeInTheDocument();
        expect(screen.getByText("andres@pro.com")).toBeInTheDocument();
        expect(screen.getByText("Cerrar sesión")).toBeInTheDocument();
    });

    it("renders the categories list", () => {
        const mockCategories = [
            { id: 1, name: "Plomería" },
            { id: 2, name: "Electricidad" }
        ];
        render(<ConsumerHome session={mockSession} categories={mockCategories} />);
        expect(screen.getByText("Plomería")).toBeInTheDocument();
        expect(screen.getByText("Electricidad")).toBeInTheDocument();
    });

    it("offers a diagnosis when no categories are available", () => {
        render(<ConsumerHome session={mockSession} categories={[]} />);
        expect(screen.getByText(t.consumerShell.categoriesEmpty)).toBeInTheDocument();
        expect(screen.getByRole("link", { name: t.consumerShell.startDiagnosis })).toHaveAttribute("href", "/consumidor/mensajes-ia");
    });

    it("recovers from an initial proposals load failure without presenting it as an empty list", async () => {
        vi.mocked(getServiceProposalsAction).mockResolvedValue([]);
        render(<ConsumerHome session={mockSession} initialProposalsError />);
        expect(screen.getByRole("alert")).toHaveTextContent(t.notifications.refreshError.message);
        expect(screen.queryByText(t.serviceProposals.consumerHome.emptyPending)).not.toBeInTheDocument();
        await userEvent.setup().click(screen.getByRole("button", { name: t.notifications.refreshError.retry }));
        expect(await screen.findByText(t.serviceProposals.consumerHome.emptyPending)).toBeInTheDocument();
        expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });

    it("opens accessible navigation and restores focus after closing it", async () => {
        const user = userEvent.setup();
        render(<ConsumerHome session={mockSession} />);
        const trigger = screen.getByRole("button", { name: t.consumerShell.menu });
        await user.click(trigger);
        const dialog = screen.getByRole("dialog", { name: t.consumerShell.menuTitle });
        expect(dialog).toHaveTextContent(t.sidebar.messages);
        await user.keyboard("{Escape}");
        await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
        expect(trigger).toHaveFocus();
    });

    it("renders pending proposals when provided", () => {
        const mockPending = [
            {
                id: 1,
                conversationId: 2,
                amountCents: 1500000,
                scheduledOn: "2026-07-05T09:30:00-03:00",
                description: "Reparación",
                estimatedDurationMinutes: 60,
                status: "pending" as const,
                createdOn: "2026-07-04T10:00:00-03:00",
                counterpart: { id: 1, role: "provider" as const, name: "Juan", surname: "Gómez", categoryName: "Plomería" }
            }
        ];
        render(<ConsumerHome session={mockSession} pendingProposals={mockPending} />);
        expect(screen.getByText("Propuestas Pendientes")).toBeInTheDocument();
        expect(screen.getByText("Juan Gómez")).toBeInTheDocument();
    });

    it("renders accepted proposals when provided", () => {
        const mockAccepted = [
            {
                id: 2,
                conversationId: 3,
                amountCents: 1000000,
                scheduledOn: "2026-08-05T09:30:00-03:00",
                description: "Pintura",
                estimatedDurationMinutes: 60,
                status: "accepted" as const,
                createdOn: "2026-07-04T10:00:00-03:00",
                counterpart: { id: 2, role: "provider" as const, name: "Ana", surname: "Pérez", categoryName: "Pintor" }
            }
        ];
        render(<ClockProvider initialDate="2026-08-01T12:00:00-03:00"><ConsumerHome session={mockSession} acceptedProposals={mockAccepted} /></ClockProvider>);
        expect(screen.getByText("Servicios Próximos")).toBeInTheDocument();
        expect(screen.getByText("Ana Pérez")).toBeInTheDocument();
    });

    it("shows only upcoming accepted services, ordered by their scheduled time", () => {
        const proposal = {
            id: 1, conversationId: 1, amountCents: 1000000,
            scheduledOn: "2026-10-25T09:00:00-03:00",
            description: "Servicio siguiente", estimatedDurationMinutes: 60,
            status: "accepted" as const, createdOn: "2026-10-20T12:00:00-03:00",
            counterpart: { id: 1, role: "provider" as const, name: "Próximo", surname: "Prestador" },
        };
        render(
            <ClockProvider initialDate="2026-10-24T12:00:00-03:00">
                <ConsumerHome session={mockSession} acceptedProposals={[
                    { ...proposal, id: 2, scheduledOn: "2026-10-26T09:00:00-03:00", counterpart: { ...proposal.counterpart, name: "Posterior" } },
                    { ...proposal, id: 3, scheduledOn: "2026-10-24T11:59:00-03:00", counterpart: { ...proposal.counterpart, name: "Pasado" } },
                    { ...proposal, id: 4, scheduledOn: "invalid", counterpart: { ...proposal.counterpart, name: "Sin fecha" } },
                    proposal,
                ]} />
            </ClockProvider>
        );
        expect(screen.getByText("Próximo Prestador")).toBeInTheDocument();
        expect(screen.queryByText("Pasado Prestador")).not.toBeInTheDocument();
        expect(screen.queryByText("Sin fecha Prestador")).not.toBeInTheDocument();
    });

    it("refreshes mounted proposals after a realtime update", async () => {
        let capturedCallback: ResourceListener | undefined;
        vi.spyOn(NotificationContextModule, "useResourceUpdate").mockImplementation(
            (_type, _id, callback: ResourceListener) => {
                capturedCallback = callback;
            }
        );
        const newProposal = {
            id: 3,
            conversationId: 4,
            amountCents: 3000000,
            scheduledOn: "2026-07-07T10:00:00-03:00",
            description: "Nueva reparación",
            estimatedDurationMinutes: 120,
            status: "pending" as const,
            createdOn: "2026-07-06T10:00:00-03:00",
            counterpart: { id: 3, role: "provider" as const, name: "Mario", surname: "Rossi" },
        };
        vi.mocked(getServiceProposalsAction).mockResolvedValue([newProposal]);

        render(<ConsumerHome session={mockSession} pendingProposals={[]} />);
        expect(screen.queryByText("Mario Rossi")).not.toBeInTheDocument();

        await act(async () => {
            capturedCallback?.({
                id: 20,
                userId: 1,
                type: "service_proposal_received",
                resourceType: "service_proposal",
                resourceId: newProposal.id,
                createdAt: "2026-07-06T10:00:00-03:00",
            });
        });

        expect(await screen.findByText("Mario Rossi")).toBeInTheDocument();
        expect(getServiceProposalsAction).toHaveBeenCalledTimes(1);
    });

    it("preserves visible proposals and recovers after a failed refresh", async () => {
        let capturedCallback: ResourceListener | undefined;
        vi.spyOn(NotificationContextModule, "useResourceUpdate").mockImplementation(
            (_type, _id, callback: ResourceListener) => {
                capturedCallback = callback;
            }
        );
        const initialProposal = {
            id: 1,
            conversationId: 2,
            amountCents: 1500000,
            scheduledOn: "2026-07-05T09:30:00-03:00",
            description: "Reparación",
            estimatedDurationMinutes: 60,
            status: "pending" as const,
            createdOn: "2026-07-04T10:00:00-03:00",
            counterpart: { id: 1, role: "provider" as const, name: "Juan", surname: "Gómez", categoryName: "Plomería" },
        };
        const refreshedProposal = {
            ...initialProposal,
            id: 2,
            conversationId: 3,
            description: "Reparación recuperada",
            counterpart: { ...initialProposal.counterpart, id: 2, name: "Ana", surname: "Pérez" },
        };
        vi.mocked(getServiceProposalsAction)
            .mockRejectedValueOnce(new Error("Network failed"))
            .mockResolvedValueOnce([refreshedProposal]);

        render(<ConsumerHome session={mockSession} pendingProposals={[initialProposal]} />);
        expect(screen.getByText("Juan Gómez")).toBeInTheDocument();

        await act(async () => {
            capturedCallback?.({
                id: 21,
                userId: 1,
                type: "service_proposal_received",
                resourceType: "service_proposal",
                resourceId: 2,
                createdAt: "2026-07-06T10:00:00-03:00",
            });
        });

        expect(screen.getByText("Juan Gómez")).toBeInTheDocument();
        expect(await screen.findByRole("alert")).toHaveTextContent(t.notifications.refreshError.message);

        await userEvent.setup().click(screen.getByRole("button", { name: "Reintentar" }));
        expect(await screen.findByText("Ana Pérez")).toBeInTheDocument();
        await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());
    });
});
