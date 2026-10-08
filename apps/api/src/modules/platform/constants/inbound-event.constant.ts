/**
 * The Inbound Inbox (ADR-0008, follows ADR-0007). Inbound platform webhooks
 * are made durable by creating a Cloud Task on this queue BEFORE the webhook
 * ACK: the task is the durable record. The name doubles as the callback route
 * (`/api/v1/system/tasks/inbound-event`).
 */
export const INBOUND_EVENT_QUEUE = 'inbound-event';

export enum ENUM_INBOUND_EVENT_PROCESS {
    INGEST = 'ingest',
}
