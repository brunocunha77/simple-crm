import { Lead as LeadData } from "@/types/global";

export interface Stage {
  id: string;
  name: string;
  color: string;
}

export interface Lead extends LeadData {
  stage?: string; // ID do estágio no quadro
}

export interface LeadWithStage extends Lead {
  stage: string; // ID do estágio no quadro
}

export interface ColorOption {
  name: string;
  value: string;
}
