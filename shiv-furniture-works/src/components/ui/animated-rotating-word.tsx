import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function RotatingWord({
  words,
  intervalMs = 2200,
  className = "",
}: {
  words: string[];
  intervalMs?: number;
  className?: string;
}) {
  const items = useMemo(() => words, [words]);
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setI((p) => (p + 1) % items.length), intervalMs);
    return () => clearTimeout(t);
  }, [i, items, intervalMs]);

  return (
    <span
      className={`relative inline-flex overflow-hidden align-bottom ${className}`}
      style={{ minWidth: "8ch" }}
    >
      <AnimatePresence mode="wait">
        <motion.span
          key={items[i]}
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "-100%", opacity: 0 }}
          transition={{ type: "spring", stiffness: 80, damping: 14 }}
          className="text-gradient-primary inline-block"
        >
          {items[i]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}