import { type PropsWithChildren } from "react";

export const Gutter = ({ children }: PropsWithChildren) => {
  return (
    <div className="flex w-full flex-col gap-y-2 p-3 has-[aside]:p-0">
      {children}
    </div>
  );
};
