import { DamageEstimateWizard } from "@/components/damage-estimate/DamageEstimateWizard";

export const metadata = {
  title: "AI Damage Estimate | Cars Compound",
  description: "VIN decode, photo damage assessment, and OEM/aftermarket repair estimate range.",
};

export default function DamageEstimatePage() {
  return <DamageEstimateWizard />;
}
