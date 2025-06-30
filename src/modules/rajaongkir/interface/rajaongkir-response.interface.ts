export interface RajaOngkirCostResponse {
  code: string;
  name: string;
  costs: Array<{
    service: string;
    description: string;
    cost: Array<{
      value: number;
      etd: string;
      note: string;
    }>;
  }>;
}
