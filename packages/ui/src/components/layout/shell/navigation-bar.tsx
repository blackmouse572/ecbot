import { AnimatePresence } from "motion/react";
import { useEffect, useState } from "react";
import { ProgressBar } from "../../common/progress-bar";

export const NavigationBar = ({ loading }: { loading: boolean }) => {
  const [showBar, setShowBar] = useState(false);

  /**
   * If the loading state is true, we want to show the bar after a short delay.
   * The delay is used to prevent the bar from flashing on quick navigations.
   */
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;

    if (loading) {
      timeout = setTimeout(() => {
        setShowBar(true);
      }, 200);
    } else {
      setShowBar(false);
    }

    return () => {
      clearTimeout(timeout);
    };
  }, [loading]);

  return (
    <div className="fixed inset-x-0 top-0 z-50 h-1">
      <AnimatePresence>{showBar ? <ProgressBar /> : null}</AnimatePresence>
    </div>
  );
};
