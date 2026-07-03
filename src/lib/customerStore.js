import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.join(__dirname, '..', 'data', 'customers.json');

const { customers } = JSON.parse(readFileSync(DATA_FILE, 'utf-8'));

function normalizeName(name) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

// Catches a model calling verify_identity with a guessed/placeholder year
// instead of one the user actually typed - a real, observed failure mode on
// smaller models that treat the tool's required dobYear field as something
// to fill in rather than a reason to hold off calling the tool at all.
export function isPlausibleDobYear(dobYear) {
  const currentYear = new Date().getFullYear();
  return Number.isInteger(dobYear) && dobYear >= 1900 && dobYear <= currentYear - 16;
}

// Requires both full name and birth year to match - this is the identity
// check itself, so it must fail closed (no partial match, no fuzzy guessing
// on the DOB year) even though the name match is whitespace/case-insensitive.
export function findCustomer({ fullName, dobYear }) {
  const target = normalizeName(fullName);
  const year = Number(dobYear);

  return (
    customers.find(
      (customer) => normalizeName(customer.fullName) === target && customer.dobYear === year,
    ) || null
  );
}

// The subset of a customer record the agent is allowed to see/repeat back,
// shared by both the voice and chat tools so verified data looks identical
// on either channel.
export function toPublicLoanRecord(customer) {
  return {
    firstName: customer.firstName,
    loanNumber: customer.loan.loanNumber,
    loanType: customer.loan.loanType,
    propertyAddress: customer.loan.propertyAddress,
    currentBalance: customer.loan.currentBalance,
    interestRate: customer.loan.interestRate,
    monthlyPayment: customer.loan.monthlyPayment,
    status: customer.loan.status,
    daysDelinquent: customer.loan.daysDelinquent ?? null,
    nextPaymentDueDate: customer.loan.nextPaymentDueDate,
    lastPaymentDate: customer.loan.lastPaymentDate,
    lastPaymentAmount: customer.loan.lastPaymentAmount,
    escrowBalance: customer.loan.escrowBalance,
    maturityDate: customer.loan.maturityDate,
    armAdjustmentDate: customer.loan.armAdjustmentDate ?? null,
    pmiMonthly: customer.loan.pmiMonthly ?? null,
  };
}
