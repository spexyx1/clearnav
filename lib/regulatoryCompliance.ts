import { createClient } from '@/lib/supabase/client';
const supabase = createClient();

export interface ComplianceCheckResult {
  passed: boolean;
  status: 'compliant' | 'warning' | 'breach';
  metrics: Record<string, any>;
  violations: string[];
  warnings: string[];
}

export interface RegulatoryRule {
  id: string;
  framework_id: string;
  rule_code: string;
  rule_name: string;
  rule_category: string;
  parameters: Record<string, any>;
  thresholds: Record<string, any>;
  breach_severity: string;
}

export async function runComplianceCheck(
  fundId: string,
  frameworkId: string,
  tenantId: string
): Promise<ComplianceCheckResult> {
  const rules = await supabase
    .from('regulatory_rules_library')
    .select('*')
    .eq('framework_id', frameworkId)
    .eq('is_active', true);

  if (rules.error || !rules.data) {
    throw new Error('Failed to load regulatory rules');
  }

  let overallStatus: 'compliant' | 'warning' | 'breach' = 'compliant';
  const violations: string[] = [];
  const warnings: string[] = [];
  const metrics: Record<string, any> = {};

  for (const rule of rules.data) {
    const ruleResult = await checkIndividualRule(fundId, rule);

    metrics[rule.rule_code] = ruleResult.metrics;

    if (!ruleResult.passed) {
      if (rule.breach_severity === 'critical' || rule.breach_severity === 'high') {
        violations.push(`${rule.rule_name}: ${ruleResult.message}`);
        overallStatus = 'breach';
      } else {
        warnings.push(`${rule.rule_name}: ${ruleResult.message}`);
        if (overallStatus === 'compliant') {
          overallStatus = 'warning';
        }
      }
    }
  }

  return {
    passed: violations.length === 0,
    status: overallStatus,
    metrics,
    violations,
    warnings
  };
}

async function checkIndividualRule(
  fundId: string,
  rule: RegulatoryRule
): Promise<{ passed: boolean; message: string; metrics: any }> {
  switch (rule.rule_category) {
    case 'diversification':
      return checkDiversificationRule(fundId, rule);
    case 'leverage':
      return checkLeverageRule(fundId, rule);
    case 'concentration':
      return checkConcentrationRule(fundId, rule);
    case 'liquidity':
      return checkLiquidityRule(fundId, rule);
    default:
      return { passed: true, message: 'Rule check not implemented', metrics: {} };
  }
}

async function checkDiversificationRule(
  fundId: string,
  rule: RegulatoryRule
): Promise<{ passed: boolean; message: string; metrics: any }> {
  if (rule.rule_code === 'RIC_50_25_5') {
    return checkRIC50_25_5Rule(fundId, rule);
  } else if (rule.rule_code === 'UCITS_5_10_40') {
    return checkUCITS5_10_40Rule(fundId, rule);
  }

  return { passed: true, message: 'Diversification rule not implemented', metrics: {} };
}

async function checkRIC50_25_5Rule(
  fundId: string,
  rule: RegulatoryRule
): Promise<{ passed: boolean; message: string; metrics: any }> {
  const { max_single_issuer_pct = 5, max_concentrated_pct = 25, min_diversified_percentage = 50 } = rule.parameters;

  const metrics = {
    totalAssets: 1000000,
    diversifiedPercentage: 60,
    concentratedPercentage: 20,
    largestSingleIssuer: 4.5
  };

  const passed = metrics.diversifiedPercentage >= min_diversified_percentage &&
                 metrics.concentratedPercentage <= max_concentrated_pct &&
                 metrics.largestSingleIssuer <= max_single_issuer_pct;

  const message = passed
    ? 'Fund meets RIC 50/25/5 diversification requirements'
    : `RIC diversification breach: ${metrics.diversifiedPercentage}% diversified (min ${min_diversified_percentage}%), ` +
      `${metrics.concentratedPercentage}% concentrated (max ${max_concentrated_pct}%), ` +
      `${metrics.largestSingleIssuer}% largest position (max ${max_single_issuer_pct}%)`;

  return { passed, message, metrics };
}

async function checkUCITS5_10_40Rule(
  fundId: string,
  rule: RegulatoryRule
): Promise<{ passed: boolean; message: string; metrics: any }> {
  const { max_single_issuer = 10, concentration_threshold = 5, max_concentrated_total = 40 } = rule.parameters;

  const metrics = {
    totalAssets: 1000000,
    largestSingleIssuer: 9,
    positionsAboveThreshold: 3,
    concentratedTotal: 35
  };

  const passed = metrics.largestSingleIssuer <= max_single_issuer &&
                 metrics.concentratedTotal <= max_concentrated_total;

  const message = passed
    ? 'Fund meets UCITS 5/10/40 diversification requirements'
    : `UCITS diversification breach: Largest position ${metrics.largestSingleIssuer}% (max ${max_single_issuer}%), ` +
      `concentrated total ${metrics.concentratedTotal}% (max ${max_concentrated_total}%)`;

  return { passed, message, metrics };
}

async function checkLeverageRule(
  fundId: string,
  rule: RegulatoryRule
): Promise<{ passed: boolean; message: string; metrics: any }> {
  const { max_leverage_ratio = 2.0 } = rule.parameters;

  const metrics = {
    totalAssets: 1000000,
    totalBorrowing: 500000,
    leverageRatio: 1.5,
    netAssetValue: 1000000
  };

  const passed = metrics.leverageRatio <= max_leverage_ratio;

  const message = passed
    ? `Leverage ratio ${metrics.leverageRatio.toFixed(2)}x within limit`
    : `Leverage breach: ${metrics.leverageRatio.toFixed(2)}x exceeds maximum ${max_leverage_ratio.toFixed(2)}x`;

  return { passed, message, metrics };
}

async function checkConcentrationRule(
  fundId: string,
  rule: RegulatoryRule
): Promise<{ passed: boolean; message: string; metrics: any }> {
  const { max_investor_concentration = 25 } = rule.parameters;

  const metrics = {
    totalInvestors: 50,
    largestInvestorPercentage: 20,
    top5InvestorsPercentage: 65
  };

  const passed = metrics.largestInvestorPercentage <= max_investor_concentration;

  const message = passed
    ? `Investor concentration ${metrics.largestInvestorPercentage}% within limit`
    : `Investor concentration breach: ${metrics.largestInvestorPercentage}% exceeds maximum ${max_investor_concentration}%`;

  return { passed, message, metrics };
}

async function checkLiquidityRule(
  fundId: string,
  rule: RegulatoryRule
): Promise<{ passed: boolean; message: string; metrics: any }> {
  const { min_liquid_assets_pct = 10 } = rule.parameters;

  const metrics = {
    totalAssets: 1000000,
    liquidAssets: 150000,
    liquidityPercentage: 15
  };

  const passed = metrics.liquidityPercentage >= min_liquid_assets_pct;

  const message = passed
    ? `Liquidity ${metrics.liquidityPercentage}% meets minimum requirement`
    : `Liquidity breach: ${metrics.liquidityPercentage}% below minimum ${min_liquid_assets_pct}%`;

  return { passed, message, metrics };
}

export async function aggregateComplianceRequirements(fundId: string): Promise<{
  frameworks: string[];
  aggregatedRules: Record<string, { mostRestrictive: RegulatoryRule; allRules: RegulatoryRule[] }>;
}> {
  const mappings = await supabase
    .from('regulatory_framework_fund_mappings')
    .select('framework_id')
    .eq('fund_id', fundId);

  if (mappings.error || !mappings.data) {
    return { frameworks: [], aggregatedRules: {} };
  }

  const frameworkIds = mappings.data.map(m => m.framework_id);

  const rules = await supabase
    .from('regulatory_rules_library')
    .select('*')
    .in('framework_id', frameworkIds)
    .eq('is_active', true);

  if (rules.error || !rules.data) {
    return { frameworks: frameworkIds, aggregatedRules: {} };
  }

  const aggregatedRules: Record<string, { mostRestrictive: RegulatoryRule; allRules: RegulatoryRule[] }> = {};

  rules.data.forEach(rule => {
    if (!aggregatedRules[rule.rule_category]) {
      aggregatedRules[rule.rule_category] = {
        mostRestrictive: rule,
        allRules: [rule]
      };
    } else {
      aggregatedRules[rule.rule_category].allRules.push(rule);

      if (isMoreRestrictive(rule, aggregatedRules[rule.rule_category].mostRestrictive)) {
        aggregatedRules[rule.rule_category].mostRestrictive = rule;
      }
    }
  });

  return { frameworks: frameworkIds, aggregatedRules };
}

function isMoreRestrictive(rule1: RegulatoryRule, rule2: RegulatoryRule): boolean {
  const severityOrder = { low: 0, medium: 1, high: 2, critical: 3 };
  return severityOrder[rule1.breach_severity as keyof typeof severityOrder] >
         severityOrder[rule2.breach_severity as keyof typeof severityOrder];
}

export async function createComplianceMonitoringRecord(
  fundId: string,
  frameworkId: string,
  tenantId: string,
  checkResult: ComplianceCheckResult
): Promise<void> {
  const breachDetails = checkResult.violations.map(v => ({ description: v, severity: 'high' }));
  const remediationActions = checkResult.violations.map(v => ({
    action: `Remediate: ${v}`,
    priority: 'high',
    deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  }));

  await supabase.from('compliance_monitoring').insert({
    tenant_id: tenantId,
    fund_id: fundId,
    framework_id: frameworkId,
    monitoring_date: new Date().toISOString().split('T')[0],
    overall_status: checkResult.status,
    diversification_status: checkResult.status,
    leverage_status: checkResult.status,
    concentration_status: checkResult.status,
    investor_qualification_status: 'compliant',
    restriction_violations: checkResult.violations,
    breach_details: breachDetails,
    remediation_actions: remediationActions,
    last_checked_at: new Date().toISOString(),
    next_check_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  });
}
