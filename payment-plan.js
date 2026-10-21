const MONTHLY_FINANCING_SURCHARGE_RATE = 0.045455;
const LATE_INSTALLMENT_SURCHARGE_RATE = 0.05;

function roundCurrency(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function localDateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function calculatePaymentPlan(basePrice, months) {
  const price = Number(basePrice);
  const term = Number(months);
  const isSupportedTerm = term === 1 || term === 3 || term === 6 || (term >= 7 && term <= 15);
  if (!Number.isFinite(price) || price <= 0 || !Number.isInteger(term) || !isSupportedTerm) {
    throw new RangeError('El precio debe ser positivo y el plazo debe ser 1, 3, 6 o de 7 a 15 meses.');
  }

  const surchargeRate = term > 6
    ? (term - 6) * MONTHLY_FINANCING_SURCHARGE_RATE
    : 0;
  const normalizedPrice = roundCurrency(price);
  const surchargePercent = Math.round((surchargeRate * 100 + Number.EPSILON) * 10000) / 10000;
  const totalPrice = roundCurrency(normalizedPrice * (1 + surchargeRate));
  return {
    basePrice: normalizedPrice,
    months: term,
    surchargePercent: roundCurrency(surchargePercent),
    surchargeAmount: roundCurrency(totalPrice - normalizedPrice),
    totalPrice,
    monthlyPayment: roundCurrency(totalPrice / term)
  };
}

export function buildMonthlyPaymentSchedule({ basePrice, months, startDate, chargeDay, previousSchedule = [] }) {
  const plan = calculatePaymentPlan(basePrice, months);
  const firstDate = new Date(`${startDate}T12:00:00`);
  const paymentDay = Number(chargeDay);
  if (Number.isNaN(firstDate.getTime()) || !Number.isInteger(paymentDay) || paymentDay < 1 || paymentDay > 31) {
    throw new RangeError('La fecha de inicio y el día de cobro deben ser válidos.');
  }

  const totalCents = Math.round(plan.totalPrice * 100);
  const regularQuotaCents = Math.floor(totalCents / plan.months);
  let assignedCents = 0;
  return Array.from({ length: plan.months }, (_, index) => {
    const date = new Date(firstDate.getFullYear(), firstDate.getMonth() + index, 1);
    const lastDayOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    date.setDate(Math.min(paymentDay, lastDayOfMonth));
    const quotaCents = index === plan.months - 1
      ? totalCents - assignedCents
      : regularQuotaCents;
    assignedCents += quotaCents;
    const previousQuota = previousSchedule[index];
    const state = previousQuota?.estado === 'pagado' || previousQuota?.status === 'pagado'
      ? 'pagado'
      : 'pendiente';

    return {
      index: index + 1,
      label: `Mensualidad ${index + 1}`,
      fecha: localDateString(date),
      monto: quotaCents / 100,
      estado: state,
      status: state,
      cargoMora: roundCurrency(Number(previousQuota?.cargoMora) || 0)
    };
  });
}

export function getInstallmentLateFee(basePrice, installment, now = new Date()) {
  const recordedCharge = Number(installment?.cargoMora);
  if (Number.isFinite(recordedCharge) && recordedCharge > 0) return roundCurrency(recordedCharge);
  if (!installment || installment.estado === 'pagado' || installment.status === 'pagado') return 0;

  const dueDate = installment.fecha?.toDate
    ? installment.fecha.toDate()
    : new Date(`${String(installment.fecha || '').slice(0, 10)}T00:00:00`);
  if (Number.isNaN(dueDate.getTime())) return 0;
  const dueDay = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (dueDay >= today) return 0;

  const price = Number(basePrice);
  return Number.isFinite(price) && price > 0
    ? roundCurrency(price * LATE_INSTALLMENT_SURCHARGE_RATE)
    : 0;
}
