import { ModelBattleDashboard } from "@/components/model-battle/ModelBattleDashboard";
import { listProviderAvailability } from "@/lib/model-battle/providers";

export default function ModelBattlePage() {
  return <ModelBattleDashboard providers={listProviderAvailability()} />;
}

