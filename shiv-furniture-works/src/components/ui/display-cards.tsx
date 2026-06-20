"use client";

import { cn } from "@/lib/utils";
import { Sparkles } from "lucide-react";
import { motion } from "framer-motion";

interface DisplayCardProps {
  className?: string;
  icon?: React.ReactNode;
  title?: string;
  description?: string;
  date?: string;
  iconClassName?: string;
  titleClassName?: string;
}

function DisplayCard({
  className,
  icon = <Sparkles className="size-4 text-blue-300" />,
  title = "Featured",
  description = "Discover amazing content",
  date = "Just now",
  titleClassName = "text-zinc-900",
}: DisplayCardProps) {
  return (
    <div
      className={cn(
        "relative flex h-36 w-full max-w-[24rem] select-none flex-col justify-between rounded-xl border border-zinc-200/80 bg-white px-6 py-5 shadow-[0_10px_25px_rgba(0,0,0,0.04)] hover:shadow-[0_20px_35px_rgba(0,0,0,0.12)] transition-all duration-300 hover:border-primary/30",
        className
      )}
    >
      <div className="flex items-center gap-3">
        <span className="relative inline-flex items-center justify-center h-8 w-8 rounded-full bg-zinc-50 border border-zinc-200/60 p-1.5 shrink-0 text-zinc-700">
          {icon}
        </span>
        <p className={cn("text-sm font-bold tracking-tight", titleClassName)}>{title}</p>
      </div>
      <p className="text-base text-zinc-800 font-medium leading-snug pr-2">{description}</p>
      <p className="text-zinc-400 text-[11px] font-medium">{date}</p>
    </div>
  );
}

interface DisplayCardsProps {
  cards?: DisplayCardProps[];
}

const containerVariants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.08,
    },
  },
} as const;

const cardVariants = {
  hidden: { opacity: 0, y: 15 },
  show: { 
    opacity: 1, 
    y: 0, 
    transition: { 
      type: "tween" as const, 
      ease: "easeOut" as const,
      duration: 0.35 
    } 
  },
} as const;

export default function DisplayCards({ cards = [] }: DisplayCardsProps) {
  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-100px" }}
      className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 w-full max-w-5xl mx-auto px-4"
    >
      {cards.map((cardProps, index) => (
        <motion.div key={index} variants={cardVariants} className="w-full flex justify-center">
          <DisplayCard {...cardProps} />
        </motion.div>
      ))}
    </motion.div>
  );
}
