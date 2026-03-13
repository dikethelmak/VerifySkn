"use client";

import { motion } from "framer-motion";

export default function Loading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 0.85, repeat: Infinity, ease: "linear" }}
        className="h-10 w-10 rounded-full border-[3px] border-primary border-t-transparent"
        aria-label="Loading"
      />
    </div>
  );
}
