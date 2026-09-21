import { Spinner } from "@medusajs/icons";
import { Navigate } from "react-router-dom";
import { useWorkspaceList } from "./hooks/api/workspace";

function Entry() {
  const { workspaces, isLoading } = useWorkspaceList();
  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center">
        <Spinner className="animate-spin" />
      </div>
    );
  }
  if (!workspaces || workspaces.length === 0) {
    // TODO: handle onboard
    throw new Error("No workspaces found");
  }
  return <Navigate to={`/${workspaces?.[0]?.slug}`} replace />;
}

export default Entry;
