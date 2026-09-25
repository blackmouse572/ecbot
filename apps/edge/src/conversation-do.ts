import { postToServer } from "./server-client";

const DEBOUNCE_MS = 4000; // mirror MESSAGE_DEBOUNCE_MS; tune in POC

interface Meta {
  conversationId: string;
  senderId: string;
  customerId: string;
  contactPointId: string;
}

export class ConversationDebounceDO {
  constructor(private state: DurableObjectState) {}

  async fetch(req: Request): Promise<Response> {
    const body = await req.json<Meta & { text: string; messageId?: string }>();
    const texts = (await this.state.storage.get<string[]>("texts")) ?? [];
    texts.push(body.text);
    await this.state.storage.put("texts", texts);
    // The saved rows of the burst, so apps/api finds them by id.
    if (body.messageId) {
      const ids = (await this.state.storage.get<string[]>("messageIds")) ?? [];
      ids.push(body.messageId);
      await this.state.storage.put("messageIds", ids);
    }
    await this.state.storage.put("meta", {
      conversationId: body.conversationId,
      senderId: body.senderId,
      customerId: body.customerId,
      contactPointId: body.contactPointId,
    } satisfies Meta);
    // (Re)set the alarm — each new message pushes the debounce window out.
    await this.state.storage.setAlarm(Date.now() + DEBOUNCE_MS);
    return new Response("scheduled");
  }

  async alarm(): Promise<void> {
    const texts = (await this.state.storage.get<string[]>("texts")) ?? [];
    const messageIds =
      (await this.state.storage.get<string[]>("messageIds")) ?? [];
    const meta = await this.state.storage.get<Meta>("meta");
    await this.state.storage.deleteAll();
    if (!meta || texts.length === 0) return;
    await postToServer("/api/v1/system/poc/reply", {
      ...meta,
      texts,
      messageIds,
    });
  }
}
