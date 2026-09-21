import { QueryClient } from "@tanstack/react-query";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: 0,
    },
  },
});

if (window) {
  (window as A).__TANSTACK_QUERY_CLIENT__ = queryClient;
}

export default queryClient;
