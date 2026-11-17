export class CostBudget {
  private spentUnits = 0;
  private refused = false;

  constructor(readonly maxUnits: number) {}

  trySpend(): boolean {
    if (this.spentUnits >= this.maxUnits) {
      this.refused = true;
      return false;
    }
    this.spentUnits += 1;
    return true;
  }

  get spent(): number {
    return this.spentUnits;
  }

  get exhausted(): boolean {
    return this.refused;
  }
}
