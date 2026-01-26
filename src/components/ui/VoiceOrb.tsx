import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface VoiceOrbProps {
  isListening: boolean;
  isSpeaking: boolean;
  isConnecting?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeMap = {
  sm: "w-20 h-20",
  md: "w-32 h-32",
  lg: "w-48 h-48",
};

export function VoiceOrb({ 
  isListening, 
  isSpeaking, 
  isConnecting = false,
  size = "lg",
  className 
}: VoiceOrbProps) {
  const getOrbState = () => {
    if (isConnecting) return "connecting";
    if (isSpeaking) return "speaking";
    if (isListening) return "listening";
    return "idle";
  };

  const state = getOrbState();

  return (
    <div className={cn("relative flex items-center justify-center", className)}>
      {/* Outer ripple rings */}
      {(isListening || isSpeaking) && (
        <>
          <motion.div
            className={cn(
              "absolute rounded-full border-2",
              isSpeaking ? "border-primary/30" : "border-accent/40"
            )}
            initial={{ width: "100%", height: "100%", opacity: 1 }}
            animate={{ 
              width: "180%", 
              height: "180%", 
              opacity: 0 
            }}
            transition={{ 
              duration: 2, 
              repeat: Infinity, 
              ease: "easeOut" 
            }}
          />
          <motion.div
            className={cn(
              "absolute rounded-full border-2",
              isSpeaking ? "border-primary/20" : "border-accent/30"
            )}
            initial={{ width: "100%", height: "100%", opacity: 1 }}
            animate={{ 
              width: "200%", 
              height: "200%", 
              opacity: 0 
            }}
            transition={{ 
              duration: 2, 
              repeat: Infinity, 
              ease: "easeOut",
              delay: 0.5 
            }}
          />
        </>
      )}

      {/* Main orb */}
      <motion.div
        className={cn(
          "relative rounded-full flex items-center justify-center",
          sizeMap[size],
          state === "idle" && "bg-muted",
          state === "connecting" && "bg-secondary",
          state === "listening" && "bg-accent",
          state === "speaking" && "bg-primary"
        )}
        animate={
          state === "speaking" 
            ? { scale: [1, 1.08, 1] }
            : state === "listening"
            ? { scale: [1, 1.04, 1] }
            : state === "connecting"
            ? { scale: [1, 1.02, 1] }
            : { scale: 1 }
        }
        transition={{
          duration: state === "speaking" ? 0.8 : state === "listening" ? 1.5 : 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        style={{
          boxShadow: state === "speaking" 
            ? "0 0 60px hsl(var(--primary) / 0.4)"
            : state === "listening"
            ? "0 0 40px hsl(var(--accent) / 0.3)"
            : "0 0 20px hsl(var(--muted) / 0.2)",
        }}
      >
        {/* Inner glow */}
        <motion.div
          className={cn(
            "absolute inset-4 rounded-full opacity-50",
            state === "speaking" && "bg-primary-foreground/20",
            state === "listening" && "bg-accent-foreground/10",
            state === "connecting" && "bg-secondary-foreground/10"
          )}
          animate={
            state !== "idle" 
              ? { opacity: [0.3, 0.6, 0.3] }
              : { opacity: 0.2 }
          }
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        {/* Status indicator */}
        <div className="relative z-10 flex flex-col items-center gap-2">
          {state === "connecting" && (
            <motion.div
              className="flex gap-1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-2 h-2 rounded-full bg-foreground/40"
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{
                    duration: 1,
                    repeat: Infinity,
                    delay: i * 0.2,
                  }}
                />
              ))}
            </motion.div>
          )}
          
          {state === "listening" && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex gap-1"
            >
              {[0, 1, 2, 3, 4].map((i) => (
                <motion.div
                  key={i}
                  className="w-1.5 rounded-full bg-accent-foreground/60"
                  animate={{ height: ["12px", "24px", "12px"] }}
                  transition={{
                    duration: 0.6,
                    repeat: Infinity,
                    delay: i * 0.1,
                    ease: "easeInOut",
                  }}
                />
              ))}
            </motion.div>
          )}

          {state === "speaking" && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex gap-1.5"
            >
              {[0, 1, 2, 3].map((i) => (
                <motion.div
                  key={i}
                  className="w-2 rounded-full bg-primary-foreground/80"
                  animate={{ height: ["8px", "32px", "8px"] }}
                  transition={{
                    duration: 0.5,
                    repeat: Infinity,
                    delay: i * 0.15,
                    ease: "easeInOut",
                  }}
                />
              ))}
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
