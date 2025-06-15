"use client";

import { forwardRef, useState } from "react";
import { motion } from "framer-motion";
import { cn } from "../../lib/utils";

export interface AnimatedInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onKeyPress'> {
  onKeyPress?: (char: string) => void;
}

const AnimatedInput = forwardRef<HTMLInputElement, AnimatedInputProps>(
  ({ className, type, onKeyPress, onChange, ...props }, ref) => {
    const [shake, setShake] = useState(false);
    const [glow, setGlow] = useState(false);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      const char = e.key;
      
      // Trigger animations based on character type
      if (char === 'Enter') {
        setGlow(true);
        setTimeout(() => setGlow(false), 200);
      } else if ('.,!?'.includes(char)) {
        setShake(true);
        setTimeout(() => setShake(false), 150);
      }
      
      onKeyPress?.(char);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      // Add a subtle glow effect on typing
      setGlow(true);
      setTimeout(() => setGlow(false), 100);
      onChange?.(e);
    };

    return (
      <motion.div
        animate={{
          x: shake ? [-1, 1, -1, 1, 0] : 0,
        }}
        transition={{
          duration: 0.15,
          ease: "easeInOut"
        }}
        className="relative"
      >
        <input
          type={type}
          className={cn(
            "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200",
            glow && "ring-2 ring-black/20 shadow-lg",
            className
          )}
          ref={ref}
          onKeyDown={handleKeyDown}
          onChange={handleChange}
          {...props}
        />
        
        {/* Subtle particle effect overlay */}
        <motion.div
          className="absolute inset-0 pointer-events-none rounded-md"
          animate={{
            boxShadow: glow 
              ? "0 0 20px rgba(0, 0, 0, 0.1), inset 0 0 20px rgba(0, 0, 0, 0.05)" 
              : "none"
          }}
          transition={{ duration: 0.1 }}
        />
      </motion.div>
    );
  }
);

AnimatedInput.displayName = "AnimatedInput";

export { AnimatedInput };