import { lazy, Suspense, type FC } from "react";
import type { FeatureHintProps } from "./feature-hint";

const FeatureHint = lazy(() =>
  import("./feature-hint").then((module) => ({ default: module.FeatureHint })),
);

/** The sidebar hint, loaded the first time someone rests on a link. */
export const LazyFeatureHint: FC<FeatureHintProps> = (props) => (
  <Suspense
    fallback={<div className="bg-ui-bg-component h-40 animate-pulse" />}
  >
    <FeatureHint {...props} />
  </Suspense>
);
