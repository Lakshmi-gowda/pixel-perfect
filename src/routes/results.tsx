import { createFileRoute } from "@tanstack/react-router";
import { pageHead } from "@/config/brand";
import { ResultsDashboard } from "@/components/dashboard/ResultsDashboard";
export const Route = createFileRoute("/results")({ head: () => pageHead("Results", "Explore the overall model estimate, schematic coronary artery probabilities and feature contributions."), component: ResultsDashboard });