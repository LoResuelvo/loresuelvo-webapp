import type { Message, ServiceProposalSummary } from "@/domain/messaging/types";

export type ChatTimelineItem =
  | {
      type: "message";
      id: string;
      timestamp: string;
      data: Message;
    }
  | {
      type: "proposal";
      id: string;
      timestamp: string;
      data: ServiceProposalSummary;
    };

/**
 * Merges messages and service proposals into a unified chronological chat timeline.
 */
export function buildChatTimeline(
  messages: Message[] = [],
  proposals: ServiceProposalSummary[] = [],
): ChatTimelineItem[] {
  const messageItems: ChatTimelineItem[] = messages.map((msg) => ({
    type: "message",
    id: `msg-${msg.id}`,
    timestamp: msg.createdOn ?? msg.sentAt,
    data: msg,
  }));

  const proposalItems: ChatTimelineItem[] = proposals.map((proposal) => ({
    type: "proposal",
    id: `prop-${proposal.id}`,
    timestamp: proposal.createdOn,
    data: proposal,
  }));

  return [...messageItems, ...proposalItems].sort((a, b) => {
    const timeA = new Date(a.timestamp).getTime();
    const timeB = new Date(b.timestamp).getTime();
    if (isNaN(timeA) || isNaN(timeB)) return 0;
    return timeA - timeB;
  });
}
