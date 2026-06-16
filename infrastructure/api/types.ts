import { Category } from "@/domain/shared/types";
import { Provider } from "@/domain/provider/types";

export type { Category, Provider };

export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

export interface ApiStub {
  method: HttpMethod;
  endpoint: string;
  status: number;
  body: unknown;
}

export interface ApiConversation {
  id: number;
  status: string;
  counterpart: {
    id: number;
    role: string;
    name: string;
    surname: string;
    category_name: string;
  };
  last_message?: {
    id: number;
    sender_role: string;
    content: string;
    created_on: string;
  };
  updated_on: string;
}
