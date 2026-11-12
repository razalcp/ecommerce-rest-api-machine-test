const PAISE_PER_RUPEE = 100;

export const rupeesToPaise = (amount: number): number => {
  if (!Number.isFinite(amount)) {
    throw new RangeError('Amount must be a finite number');
  }

  if (amount < 0) {
    throw new RangeError('Amount cannot be negative');
  }

  const paise = Math.round(amount * PAISE_PER_RUPEE);

  if (!Number.isSafeInteger(paise)) {
    throw new RangeError('Amount exceeds the safe integer range');
  }

  if (Number(paise / PAISE_PER_RUPEE) !== amount) {
    throw new RangeError('Amount must have at most two decimal places');
  }

  return paise;
};

export const paiseToRupees = (paise: number): number => {
  if (!Number.isSafeInteger(paise)) {
    throw new RangeError('Paise must be a safe integer');
  }

  if (paise < 0) {
    throw new RangeError('Paise cannot be negative');
  }

  return Number((paise / PAISE_PER_RUPEE).toFixed(2));
};

export const multiplyPaise = (unitPaise: number, quantity: number): number => {
  if (!Number.isSafeInteger(unitPaise) || unitPaise < 0) {
    throw new RangeError('Unit price must be a non-negative safe integer');
  }

  if (!Number.isSafeInteger(quantity) || quantity <= 0) {
    throw new RangeError('Quantity must be a positive safe integer');
  }

  if (unitPaise > Math.floor(Number.MAX_SAFE_INTEGER / quantity)) {
    throw new RangeError('Line total exceeds the safe integer range');
  }

  return unitPaise * quantity;
};

export const sumPaise = (values: readonly number[]): number => {
  let total = 0;

  for (const value of values) {
    if (!Number.isSafeInteger(value) || value < 0) {
      throw new RangeError('Paise values must be non-negative safe integers');
    }

    if (total > Number.MAX_SAFE_INTEGER - value) {
      throw new RangeError('Paise total exceeds the safe integer range');
    }

    total += value;
  }

  return total;
};
