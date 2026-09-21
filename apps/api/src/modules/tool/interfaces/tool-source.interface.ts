export type ToolSource =
    | {
          kind: 'COMPOSIO';
          toolkit: string;
          connectedAccountId: string | null;
          authConfigId: string | null;
      }
    | { kind: 'OPERATOR'; serverUrl: string }
    | { kind: 'ECCHO'; service: string }
    | { kind: 'HTTP' };
