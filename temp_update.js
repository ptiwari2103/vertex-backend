// Get the deposit date and set it to the first day of the month
const originalDepositDate = new Date(deposit.deposit_date);
const depositDate = new Date(originalDepositDate.getFullYear(), originalDepositDate.getMonth(), 1);
