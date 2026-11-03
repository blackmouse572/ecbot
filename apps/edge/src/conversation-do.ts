import { postToServer } from "./server-client";

const DEBOUNCE_MS = 1500; // mirror MESSAGE_DEBOUNCE_MS in apps/api
// apps/api lets /poc/reply run a full agent turn for up to 300s; wait a little
// longer, then give up and log, so a hung server does not hold the alarm.
export const REPLY_POST_TIMEOUT_MS = 310_000;

interface Meta {
  conversationId: string;
  senderId: string;
  customerId: string;
  contactPointId: string;
}

/**
 * One conversation's burst buffer. Messages are coalesced for DEBOUNCE_MS,
 * then one reply turn runs. A message that arrives while that reply runs is
 * held: the running turn may steer it in (apps/ai), and whatever the turn did
 * not take gets a follow-up reply right after.
 */
export class ConversationDebounceDO {
  // In memory on purpose: if the isolate restarts mid-reply, that reply's
  // request is gone too, so nothing must stay held behind it.
  private replying = false;

  constructor(private state: DurableObjectState) {}

  async fetch(req: Request): Promise<Response> {
    const body = await req.json<Meta & { text: string; messageId?: string }>();
    const texts = (await this.state.storage.get<string[]>("texts")) ?? [];
    texts.push(body.text);
    await this.state.storage.put("texts", texts);
    // Each text's saved row (or null), so a steered one can be dropped.
    const textIds =
      (await this.state.storage.get<(string | null)[]>("textIds")) ?? [];
    textIds.push(body.messageId ?? null);
    await this.state.storage.put("textIds", textIds);
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
    // While a reply runs, the alarm waits for it (see followUp).
    if (!this.replying)
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
    this.replying = true;
    let steered: string[] = [];
    try {
      steered = await this.reply({ ...meta, texts, messageIds });
    } finally {
      this.replying = false;
    }
    await this.followUp(steered);
  }

  /** Run one reply turn. Returns the held messages the turn steered in. */
  private async reply(
    body: Meta & { texts: string[]; messageIds: string[] },
  ): Promise<string[]> {
    // Log, never retry: the reply may already be partly delivered to the
    // customer, so a second run could answer them twice.
    const tag = `[reply] conversation ${body.conversationId}`;
    try {
      const res = await postToServer(
        "/api/v1/system/poc/reply",
        body,
        AbortSignal.timeout(REPLY_POST_TIMEOUT_MS),
      );
      if (!res.ok) {
        console.error(`${tag} -> ${res.status}: ${await res.text()}`);
        return [];
      }
      const outcome = await res
        .json<{ steeredMessageIds?: string[] }>()
        .catch(() => ({}) as { steeredMessageIds?: string[] });
      return outcome.steeredMessageIds ?? [];
    } catch (err) {
      console.error(`${tag} threw (${(err as Error).message})`);
      return [];
    }
  }

  /** Answer what arrived during the reply and was not steered into it. */
  private async followUp(steered: string[]): Promise<void> {
    const texts = (await this.state.storage.get<string[]>("texts")) ?? [];
    if (texts.length === 0) return;
    const textIds =
      (await this.state.storage.get<(string | null)[]>("textIds")) ?? [];
    const keep = texts.map((_, i) => {
      const id = textIds[i];
      return !id || !steered.includes(id);
    });
    if (!keep.includes(true)) {
      await this.state.storage.deleteAll();
      return;
    }
    const kept = <T>(list: T[]) => list.filter((_, i) => keep[i]);
    await this.state.storage.put("texts", kept(texts));
    await this.state.storage.put("textIds", kept(textIds));
    const messageIds =
      (await this.state.storage.get<string[]>("messageIds")) ?? [];
    await this.state.storage.put(
      "messageIds",
      messageIds.filter((id) => !steered.includes(id)),
    );
    await this.state.storage.setAlarm(Date.now() + DEBOUNCE_MS);
  }
}
