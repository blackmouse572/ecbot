import { QueryCache, QueryClient } from "@tanstack/react-query";
import { queryKeysFactory } from "./query-factory";
import { isWorkspaceSuspendedError } from "./workspace-suspended";

const queryClient: QueryClient = new QueryClient({
  queryCache: new QueryCache({
    // A suspension can land while the workspace details are still cached as
    // fresh; refetch them so the layout switches to the suspended screen. The
    // details query that already failed is skipped, or it would refetch itself.
    onError: (error) => {
      if (!isWorkspaceSuspendedError(error)) return;
      void queryClient.invalidateQueries({
        queryKey: queryKeysFactory("workspace").details(),
        predicate: (query) => query.state.status !== "error",
      });
    },
  }),
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
