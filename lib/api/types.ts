export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

export interface ApiStub {
  method: HttpMethod;
  endpoint: string;
  status: number;
  body: unknown;
}

export interface Category {
  id: number;
  name: string;
}

export interface Provider {
  id: number;
  name: string;
  surname: string;
  category_name: string;
  category_id?: number;
  description?: string;
  rating?: number;
  reviews?: number;
  jobs?: number;
}

