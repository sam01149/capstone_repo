import {
  createContext,
  useContext,
  useState,
  useRef,
  useCallback,
} from "react";
export const Feedback = createContext(null);
export function useAction() {
  const notify = useContext(Feedback);
  const [busy, setBusy] = useState(false);
  const running = useRef(false);
  const run = useCallback(
    async (task) => {
      if (running.current) return;
      running.current = true;
      setBusy(true);
      try {
        return await task();
      } catch (error) {
        notify(error.message, "error");
      } finally {
        running.current = false;
        setBusy(false);
      }
    },
    [notify],
  );
  return { busy, run, notify };
}
