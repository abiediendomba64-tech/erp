export type QuantityRate = { volume: number; harga_satuan: number };
export type SalesLine = { jumlah: number; harga: number };
export type MaterialCostLine = { jumlah: number; harga_pokok: number };

const nonNegative = (value: number): number =>
  Number.isFinite(Number(value)) ? Math.max(0, Number(value)) : 0;

export function calculateLineTotal(quantity: number, unitPrice: number): number {
  return nonNegative(quantity) * nonNegative(unitPrice);
}

export function calculateRABItem(item: QuantityRate): number {
  return calculateLineTotal(item.volume, item.harga_satuan);
}

export function calculateRABTotal(items: QuantityRate[]): number {
  return items.reduce((sum, item) => sum + calculateRABItem(item), 0);
}

export function calculateStockBalance(opening: number, incoming: number, outgoing: number): number {
  return nonNegative(opening) + nonNegative(incoming) - nonNegative(outgoing);
}

export function calculateInventoryValue(endingQuantity: number, unitCost: number): number {
  return calculateLineTotal(endingQuantity, unitCost);
}

export function calculateSalesSubtotal(items: SalesLine[]): number {
  return items.reduce((sum, item) => sum + calculateLineTotal(item.jumlah, item.harga), 0);
}

export function calculateSalesTotal(items: SalesLine[], discount: number, vat: number): number {
  const subtotal = calculateSalesSubtotal(items);
  const safeDiscount = nonNegative(discount);
  const safeVat = nonNegative(vat);
  return Math.max(0, subtotal - Math.min(subtotal, safeDiscount) + safeVat);
}

export function calculatePurchaseTotal(items: SalesLine[], vat: number): number {
  return calculateSalesSubtotal(items) + nonNegative(vat);
}

export function calculateProductionCosts(
  materials: MaterialCostLine[],
  labor: number,
  overhead: number,
  outputQuantity: number
): { material: number; labor: number; overhead: number; total: number; unitCost: number } {
  const material = materials.reduce((sum, line) => sum + calculateLineTotal(line.jumlah, line.harga_pokok), 0);
  const safeLabor = nonNegative(labor);
  const safeOverhead = nonNegative(overhead);
  const total = material + safeLabor + safeOverhead;
  const output = nonNegative(outputQuantity);
  return { material, labor: safeLabor, overhead: safeOverhead, total, unitCost: output > 0 ? total / output : 0 };
}

export function calculatePayrollNet(input: {
  gaji_pokok: number;
  tunjangan: number;
  lembur: number;
  potongan: number;
  pph21: number;
}): number {
  return nonNegative(input.gaji_pokok) + nonNegative(input.tunjangan) + nonNegative(input.lembur) -
    nonNegative(input.potongan) - nonNegative(input.pph21);
}

export function calculateBudgetVariance(budget: number, realization: number): {
  balance: number;
  percent: number | null;
  overBudget: boolean;
} {
  const planned = nonNegative(budget);
  const actual = nonNegative(realization);
  return {
    balance: planned - actual,
    percent: planned > 0 ? actual / planned * 100 : null,
    overBudget: actual > planned
  };
}
