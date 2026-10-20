/*
# Tighten correction rules for manual charges

## Change
Only class charges can be corrected with a negative amount, which acts as a credit to the class. Refunding an investor fee is a fee rebate that Arkline pays, so it is recorded as a manager rebate rather than a negative investor fee.

## Notes
1. The table has no rows yet, so no data is affected.
*/
ALTER TABLE fund_manual_charges DROP CONSTRAINT IF EXISTS fmc_amount_sign;
ALTER TABLE fund_manual_charges ADD CONSTRAINT fmc_amount_sign CHECK (amount > 0 OR (amount < 0 AND corrects_id IS NOT NULL AND kind = 'class_charge'));
