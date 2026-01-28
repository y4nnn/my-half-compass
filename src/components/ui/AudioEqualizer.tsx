import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface AudioEqualizerProps {
  isListening: boolean;
  isSpeaking: boolean;
  isConnecting?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeConfig = {
  sm: { barWidth: 6, barMaxHeight: 32, gap: 4 },
  md: { barWidth: 10, barMaxHeight: 56, gap: 6 },
  lg: { barWidth: 14, barMaxHeight: 80, gap: 8 },
};

export function AudioEqualizer({
  isListening,
  isSpeaking,
  isConnecting = false,
  size = "lg",
  className,
}: AudioEqualizerProps) {
  const config = sizeConfig[size];

  const getState = () => {
    if (isConnecting) return "connecting";
    if (isSpeaking) return "speaking";
    if (isListening) return "listening";
    return "idle";
  };

  const state = getState();

  // Bar heights pattern for vertical symmetry: outer bars shorter, center tallest
  // Pattern: [0.5, 0.75, 1.0, 0.75, 0.5] for symmetry
  const barHeightMultipliers = [0.5, 0.75, 1.0, 0.75, 0.5];

  // Animation delays for wave effect (center starts first, then ripples out)
  const animationDelays = [0.2, 0.1, 0, 0.1, 0.2];

  // Get bar color based on state
  const getBarColor = () => {
    if (state === "speaking") return "bg-primary";
    if (state === "listening") return "bg-primary/70";
    if (state === "connecting") return "bg-muted-foreground/50";
    return "bg-muted-foreground/30";
  };

  // Get animation properties based on state
  const getAnimationProps = (index: number) => {
    const maxHeight = config.barMaxHeight * barHeightMultipliers[index];
    const minHeight = config.barMaxHeight * 0.15;

    if (state === "idle") {
      return {
        animate: { height: minHeight },
        transition: { duration: 0.3 },
      };
    }

    if (state === "connecting") {
      return {
        animate: {
          height: [minHeight, maxHeight * 0.4, minHeight],
          opacity: [0.4, 0.7, 0.4],
        },
        transition: {
          duration: 1.2,
          repeat: Infinity,
          delay: animationDelays[index],
          ease: "easeInOut",
        },
      };
    }

    if (state === "listening") {
      return {
        animate: {
          height: [minHeight, maxHeight * 0.6, minHeight],
        },
        transition: {
          duration: 0.8,
          repeat: Infinity,
          delay: animationDelays[index],
          ease: "easeInOut",
        },
      };
    }

    // Speaking state - more dynamic animation
    return {
      animate: {
        height: [minHeight, maxHeight, minHeight * 1.5, maxHeight * 0.7, minHeight],
      },
      transition: {
        duration: 0.6,
        repeat: Infinity,
        delay: animationDelays[index] * 0.5,
        ease: "easeInOut",
      },
    };
  };

  return (
    <div
      className={cn(
        "flex items-center justify-center",
        className
      )}
      style={{ gap: config.gap }}
    >
      {[0, 1, 2, 3, 4].map((index) => {
        const animProps = getAnimationProps(index);
        return (
          <motion.div
            key={index}
            className={cn(
              "rounded-full",
              getBarColor()
            )}
            style={{
              width: config.barWidth,
            }}
            initial={{ height: config.barMaxHeight * 0.15 }}
            {...animProps}
          />
        );
      })}
    </div>
  );
}
