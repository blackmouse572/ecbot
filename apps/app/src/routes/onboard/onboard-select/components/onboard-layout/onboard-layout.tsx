import type { ReactNode } from "react";

export const OnboardLayout = ({ children }: { children: ReactNode }) => {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen">
      {children}
    </main>
  );
};
