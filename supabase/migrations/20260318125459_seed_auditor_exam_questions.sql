/*
  # Seed Initial Auditor Certification Exam Questions

  ## Overview
  Seeds approximately 20 initial exam questions across all five sections:
  - Valuation Principles
  - Regulatory Knowledge
  - Integrity and Ethics
  - Attention to Detail
  - Platform Knowledge

  ## Question Distribution
  - Valuation Principles: 4 questions
  - Regulatory Knowledge: 3 questions
  - Integrity and Ethics: 3 questions
  - Attention to Detail: 2 questions
  - Platform Knowledge: 5 questions
*/

-- Valuation Principles Section
INSERT INTO auditor_exam_questions (section, question_type, difficulty, question_text, options, correct_answer, explanation, points_value, is_active) VALUES
('valuation_principles', 'multiple_choice', 'standard', 'What is the primary objective when determining fair market value for an illiquid private fund interest?', 
  '[{"id": "a", "text": "Maximize reported NAV to attract investors"}, {"id": "b", "text": "Determine the price at which a willing buyer and willing seller would transact"}, {"id": "c", "text": "Use the original purchase price regardless of market changes"}, {"id": "d", "text": "Apply a standard 20% illiquidity discount"}]'::jsonb,
  'b',
  'Fair market value represents the price at which a willing buyer and willing seller, both having reasonable knowledge of relevant facts, would transact in an arm''s length transaction.',
  1,
  true),

('valuation_principles', 'multiple_choice', 'standard', 'When auditing NAV calculations for a fund with multiple share classes, which factor is MOST critical to verify?',
  '[{"id": "a", "text": "All share classes have identical fee structures"}, {"id": "b", "text": "Waterfall allocation methodology correctly reflects economic rights"}, {"id": "c", "text": "Share classes are named alphabetically"}, {"id": "d", "text": "All investors hold the same share class"}]'::jsonb,
  'b',
  'The waterfall allocation methodology must accurately reflect the economic rights and preferences of each share class, as this directly impacts NAV per share calculations.',
  1,
  true),

('valuation_principles', 'multiple_choice', 'advanced', 'A hedge fund holds a concentrated position in an illiquid private equity investment. The fund manager values it using the last funding round price from 18 months ago. As an auditor, what is your PRIMARY concern?',
  '[{"id": "a", "text": "The valuation may not reflect current market conditions and material changes"}, {"id": "b", "text": "All private equity should use cost basis valuation"}, {"id": "c", "text": "The position should be marked to zero due to illiquidity"}, {"id": "d", "text": "18 months is within acceptable timeframes for all valuations"}]'::jsonb,
  'a',
  'Stale valuations may not reflect material changes in the company''s financial condition, market conditions, or industry outlook. Auditors should assess whether the 18-month-old price remains representative of fair value.',
  2,
  true),

('valuation_principles', 'multiple_choice', 'standard', 'What is the correct treatment of management fees when calculating NAV?',
  '[{"id": "a", "text": "Fees are added to the NAV to show gross performance"}, {"id": "b", "text": "Fees are deducted from assets to arrive at net NAV"}, {"id": "c", "text": "Fees are ignored in NAV calculations"}, {"id": "d", "text": "Fees are only applied at year-end"}]'::jsonb,
  'b',
  'Management fees are expenses that reduce the fund''s assets, and must be deducted (typically accrued periodically) to arrive at accurate NAV.',
  1,
  true);

-- Regulatory Knowledge Section
INSERT INTO auditor_exam_questions (section, question_type, difficulty, question_text, options, correct_answer, explanation, points_value, is_active) VALUES
('regulatory_knowledge', 'multiple_choice', 'standard', 'Under SEC regulations, which financial statement standard applies to most private funds?',
  '[{"id": "a", "text": "Tax basis accounting only"}, {"id": "b", "text": "GAAP (Generally Accepted Accounting Principles)"}, {"id": "c", "text": "IFRS for all US-based funds"}, {"id": "d", "text": "No specific standard is required"}]'::jsonb,
  'b',
  'Private funds typically prepare financial statements in accordance with GAAP, which provides standardized accounting principles for valuation, recognition, and disclosure.',
  1,
  true),

('regulatory_knowledge', 'multiple_choice', 'advanced', 'A fund advisor is required to file Form PF. What is the primary purpose of this filing?',
  '[{"id": "a", "text": "To market the fund to retail investors"}, {"id": "b", "text": "To provide systemic risk data to regulators"}, {"id": "c", "text": "To register the fund as a public company"}, {"id": "d", "text": "To eliminate the need for audited financials"}]'::jsonb,
  'b',
  'Form PF collects information about private fund advisors to help regulators monitor systemic risk in the financial system.',
  2,
  true),

('regulatory_knowledge', 'multiple_choice', 'standard', 'Which of the following is a key auditor independence requirement?',
  '[{"id": "a", "text": "Auditors can own unlimited investments in funds they audit"}, {"id": "b", "text": "Auditors must not have financial interests that could impair objectivity"}, {"id": "c", "text": "Auditors can serve as fund directors while performing audits"}, {"id": "d", "text": "Independence rules only apply to public company audits"}]'::jsonb,
  'b',
  'Auditor independence is fundamental to credible auditing. Auditors must be free from financial interests, relationships, or other factors that could impair their objectivity.',
  1,
  true);

-- Integrity and Ethics Section
INSERT INTO auditor_exam_questions (section, question_type, difficulty, question_text, options, correct_answer, explanation, points_value, is_active) VALUES
('integrity_ethics', 'scenario', 'standard', 'You are auditing a listing and discover that the fund manager has significantly overstated the value of an illiquid holding. The manager offers you a 50% increase in your fee to "overlook this minor discrepancy." What should you do?',
  '[{"id": "a", "text": "Accept the fee increase and issue a clean attestation"}, {"id": "b", "text": "Decline the fee increase but issue a clean attestation to maintain the relationship"}, {"id": "c", "text": "Refuse the offer, document the material misstatement, and issue a qualified or adverse opinion"}, {"id": "d", "text": "Withdraw from the engagement without explanation"}]'::jsonb,
  'c',
  'This is a clear attempt to compromise auditor independence. The ethical and regulatory response is to refuse any inducement, document the issue, and issue an appropriate opinion that reflects the material misstatement.',
  2,
  true),

('integrity_ethics', 'scenario', 'standard', 'During an audit, you notice a conflict of interest: you own shares in a company that is a portfolio holding of the fund you are auditing. What is the appropriate action?',
  '[{"id": "a", "text": "Continue the audit but avoid reviewing that specific holding"}, {"id": "b", "text": "Disclose the conflict to the client and proceed if they consent"}, {"id": "c", "text": "Disclose the conflict, divest the personal holding, or decline the engagement"}, {"id": "d", "text": "Keep the information confidential to avoid alarming the client"}]'::jsonb,
  'c',
  'Independence requires either eliminating the conflict (by divesting) or declining the engagement. Proceeding with a known conflict, even with client consent, violates professional standards.',
  2,
  true),

('integrity_ethics', 'scenario', 'advanced', 'You complete an audit and issue an attestation. Two weeks later, you discover evidence that a material valuation was incorrect, making your attestation misleading. What should you do?',
  '[{"id": "a", "text": "Do nothing since the attestation is already issued"}, {"id": "b", "text": "Wait until the next audit cycle to correct it"}, {"id": "c", "text": "Immediately notify the client and platform, withdraw or revise the attestation, and document the error"}, {"id": "d", "text": "Only disclose if someone specifically asks about it"}]'::jsonb,
  'c',
  'Professional ethics require immediate disclosure when an auditor discovers their report contains a material error. The attestation should be withdrawn or revised, and all relevant parties notified.',
  2,
  true);

-- Attention to Detail Section
INSERT INTO auditor_exam_questions (section, question_type, difficulty, question_text, options, correct_answer, explanation, points_value, is_active) VALUES
('attention_to_detail', 'practical', 'standard', 'A fund reports total assets of $50M and liabilities of $5M. Management fees of 2% per annum are calculated on gross assets. Accrued fees for the quarter are listed as $500,000. Is this correct?',
  '[{"id": "a", "text": "Yes, the calculation is correct"}, {"id": "b", "text": "No, quarterly fees should be $250,000"}, {"id": "c", "text": "No, fees should be calculated on net assets"}, {"id": "d", "text": "Unable to determine without more information"}]'::jsonb,
  'b',
  'Annual fee = 2% × $50M = $1M. Quarterly fee = $1M ÷ 4 = $250,000. The reported $500,000 is double the correct amount, indicating an error.',
  2,
  true),

('attention_to_detail', 'practical', 'advanced', 'You are reviewing a NAV calculation. The fund shows: Starting NAV $10.00, Investment gain $1.50, Management fee ($0.10), Performance fee ($0.20), Ending NAV $11.20. The performance fee is 20% of gains above a $10.00 high water mark. Identify the error.',
  '[{"id": "a", "text": "No error, calculation is correct"}, {"id": "b", "text": "Performance fee should be $0.28 based on gain after management fee"}, {"id": "c", "text": "Management fee should be calculated after performance fee"}, {"id": "d", "text": "Investment gain is overstated"}]'::jsonb,
  'b',
  'Gain after management fee = $1.50 - $0.10 = $1.40. NAV before performance fee = $11.40. Gain over high water mark = $11.40 - $10.00 = $1.40. Performance fee = 20% × $1.40 = $0.28, not $0.20 as shown.',
  2,
  true);

-- Platform Knowledge Section
INSERT INTO auditor_exam_questions (section, question_type, difficulty, question_text, options, correct_answer, explanation, points_value, is_active) VALUES
('platform_knowledge', 'multiple_choice', 'standard', 'On the ClearNav exchange, what is the primary purpose of an auditor attestation?',
  '[{"id": "a", "text": "To guarantee investment returns"}, {"id": "b", "text": "To provide independent verification of listing accuracy and valuation"}, {"id": "c", "text": "To market the fund to investors"}, {"id": "d", "text": "To replace the need for due diligence"}]'::jsonb,
  'b',
  'Auditor attestations provide independent, professional verification that key information in an exchange listing (particularly valuations and NAV) has been reviewed and is fairly stated.',
  1,
  true),

('platform_knowledge', 'multiple_choice', 'standard', 'When can a certified auditor decline an assignment offered by a fund?',
  '[{"id": "a", "text": "Never, all assignments must be accepted"}, {"id": "b", "text": "Only if the auditor is on vacation"}, {"id": "c", "text": "For valid reasons such as conflicts of interest, capacity constraints, or specialization mismatch"}, {"id": "d", "text": "Only with platform admin approval"}]'::jsonb,
  'c',
  'Auditors can and should decline assignments when there are legitimate reasons such as independence concerns, lack of relevant expertise, or insufficient capacity.',
  1,
  true),

('platform_knowledge', 'multiple_choice', 'standard', 'What is the annual certification fee for platform auditors?',
  '[{"id": "a", "text": "$1,000 paid annually"}, {"id": "b", "text": "$2,500 billed monthly at approximately $208 per month"}, {"id": "c", "text": "$5,000 paid quarterly"}, {"id": "d", "text": "No certification fee"}]'::jsonb,
  'b',
  'The annual certification fee is $2,500, billed monthly at approximately $208.34 per month for predictable cash flow.',
  1,
  true),

('platform_knowledge', 'multiple_choice', 'standard', 'Can funds choose which certified auditors they prefer to work with?',
  '[{"id": "a", "text": "No, the platform randomly assigns auditors"}, {"id": "b", "text": "Yes, funds can set preferences for specific auditors or block certain auditors"}, {"id": "c", "text": "Only if they pay an additional fee"}, {"id": "d", "text": "Funds must work with all auditors equally"}]'::jsonb,
  'b',
  'The platform allows funds to express preferences for auditors they trust and to block auditors they do not wish to work with, providing fund managers with control over their auditing relationships.',
  1,
  true),

('platform_knowledge', 'multiple_choice', 'standard', 'What ensures the integrity and tamper-evidence of an auditor attestation report?',
  '[{"id": "a", "text": "The auditor signature"}, {"id": "b", "text": "A SHA-256 cryptographic hash of the attestation"}, {"id": "c", "text": "Platform admin approval"}, {"id": "d", "text": "Email confirmation"}]'::jsonb,
  'b',
  'Each attestation generates a SHA-256 hash that serves as a cryptographic fingerprint. Any alteration to the attestation would change the hash, providing tamper evidence.',
  1,
  true);
