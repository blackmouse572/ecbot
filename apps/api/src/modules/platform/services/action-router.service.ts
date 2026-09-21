import { Injectable } from '@nestjs/common';

export interface ActionContext {
    conversationId: string;
    senderId: string;
    value?: string;
}

@Injectable()
export class ActionRouter {
    private readonly handlers = new Map<
        string,
        (ctx: ActionContext) => Promise<void>
    >();

    register(
        actionId: string,
        handler: (ctx: ActionContext) => Promise<void>
    ): void {
        this.handlers.set(actionId, handler);
    }

    async dispatch(actionId: string, ctx: ActionContext): Promise<boolean> {
        const handler = this.handlers.get(actionId);
        if (!handler) return false;
        await handler(ctx);
        return true;
    }
}
