export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';

export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Ticket {
  id: string;               // e.g. "TICK-001"
  title: string;            // Required, 1-100 characters
  description: string;      // Required, non-empty
  status: TicketStatus;     // Defaults to 'open'
  priority: TicketPriority; // Defaults to 'medium'
  tags: string[];           // Array of string tags (e.g., ["bug", "auth"])
  createdAt: string;        // ISO 8601 string
  updatedAt: string;        // ISO 8601 string
}

export interface CreateTicketDTO {
  title: string;
  description: string;
  priority?: TicketPriority;
  tags?: string[];
}

export interface UpdateTicketDTO {
  title?: string;
  description?: string;
  status?: TicketStatus;
  priority?: TicketPriority;
  tags?: string[];
}

export interface TicketFilter {
  status?: TicketStatus;
  priority?: TicketPriority;
  tag?: string;
}

export interface StorageData {
  version: number;
  updatedAt: string;
  tickets: Ticket[];
}
