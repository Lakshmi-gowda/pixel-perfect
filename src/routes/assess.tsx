import { createFileRoute } from "@tanstack/react-router";
import { pageHead } from "@/config/brand";
import { AssessmentForm } from "@/components/form/AssessmentForm";
export const Route = createFileRoute("/assess")({ head: () => pageHead("Assess", "Enter model-defined patient measurements for an educational heart risk estimate."), component: AssessmentForm });