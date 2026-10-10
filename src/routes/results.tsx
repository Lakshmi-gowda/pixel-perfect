import { createFileRoute } from "@tanstack/react-router";
import { pageHead } from "@/config/brand";
import { ResultsDashboard } from "@/components/dashboard/ResultsDashboard";
export const Route = createFileRoute("/results")({ head: () => pageHead("Results", "Explore the overall CAD and Normal model probabilities alongside schematic coronary anatomy for educational decision support."), component: ResultsDashboard });