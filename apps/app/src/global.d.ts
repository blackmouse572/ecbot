declare global {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type A = any;
}

interface Window {
  __TANSTACK_QUERY_CLIENT__: import("@tanstack/query-core").QueryClient;
}

export {};
