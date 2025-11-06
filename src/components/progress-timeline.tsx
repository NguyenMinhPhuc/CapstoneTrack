
'use client';

import { cn } from "@/lib/utils";
import { Check, Dot } from "lucide-react";
import { format } from "date-fns";

type StepStatus = 'completed' | 'current' | 'pending';

interface Step {
    name: string;
    status: StepStatus;
    date?: Date | null;
    description?: string;
}

interface ProgressTimelineProps {
    steps: Step[];
}

export function ProgressTimeline({ steps }: ProgressTimelineProps) {
    return (
        <ol className="relative border-l border-border dark:border-gray-700">
            {steps.map((step, index) => {
                const isCompleted = step.status === 'completed';
                const isCurrent = step.status === 'current';
                
                return (
                    <li key={index} className="mb-8 ml-6">
                        <span className={cn(
                            "absolute -left-3 flex h-6 w-6 items-center justify-center rounded-full ring-8 ring-background dark:ring-gray-900",
                            isCompleted ? "bg-primary text-primary-foreground" : 
                            isCurrent ? "bg-blue-500 text-white" : 
                            "bg-muted border border-border"
                        )}>
                            {isCompleted ? <Check className="h-4 w-4" /> : <Dot className="h-4 w-4" />}
                        </span>
                        <h3 className={cn(
                            "text-base font-semibold",
                             isCompleted ? "text-primary dark:text-white" : 
                             isCurrent ? "text-blue-600 dark:text-blue-400" :
                             "text-muted-foreground"
                        )}>
                            {step.name}
                        </h3>
                        {step.date && (
                             <time className="block mb-2 text-sm font-normal leading-none text-muted-foreground">
                                {step.description ? `${step.description}: ` : ''}{format(step.date, 'dd/MM/yyyy')}
                            </time>
                        )}
                    </li>
                );
            })}
        </ol>
    );
}
