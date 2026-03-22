/*
  # Seed Default Legal Documents

  Seeds platform default Terms of Service and Privacy Policy with comprehensive
  legal protections and bank-grade privacy standards.

  1. Changes
    - Insert default Terms of Service (v1.0)
    - Insert default Privacy Policy (v1.0)

  2. Content Structure
    - Terms: Strong indemnification and liability limitations
    - Privacy: Bank-grade data protection standards
*/

-- Insert comprehensive Terms of Service
INSERT INTO legal_documents (
  tenant_id,
  document_type,
  title,
  content,
  version,
  effective_date,
  is_active
) VALUES (
  NULL,
  'terms',
  'ClearNav Platform Terms of Service',
  '{
    "sections": [
      {
        "title": "1. Acceptance of Terms",
        "content": "By accessing or using the ClearNav platform (\"Service\"), you agree to be bound by these Terms of Service (\"Terms\"). If you do not agree to these Terms, you may not access or use the Service. These Terms constitute a legally binding agreement between you and ClearNav and its owners, operators, and affiliates (collectively, \"ClearNav,\" \"we,\" \"us,\" or \"our\")."
      },
      {
        "title": "2. Description of Service",
        "content": "ClearNav provides a software-as-a-service platform for investment fund management, investor relations, portfolio management, and related financial services. The Service is provided on an \"AS-IS\" and \"AS-AVAILABLE\" basis without warranties of any kind."
      },
      {
        "title": "3. No Warranties",
        "content": "THE SERVICE IS PROVIDED \"AS IS\" WITHOUT WARRANTY OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. CLEARNAV DOES NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, SECURE, OR FREE FROM VIRUSES OR OTHER HARMFUL COMPONENTS. CLEARNAV DOES NOT WARRANT THE ACCURACY, COMPLETENESS, OR RELIABILITY OF ANY INFORMATION, CONTENT, OR DATA PROVIDED THROUGH THE SERVICE."
      },
      {
        "title": "4. Limitation of Liability",
        "content": "TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL CLEARNAV, ITS OWNERS, CREATORS, OPERATORS, OFFICERS, DIRECTORS, EMPLOYEES, AGENTS, AFFILIATES, OR LICENSORS BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING WITHOUT LIMITATION, LOSS OF PROFITS, DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES, RESULTING FROM: (A) YOUR ACCESS TO OR USE OF OR INABILITY TO ACCESS OR USE THE SERVICE; (B) ANY CONDUCT OR CONTENT OF ANY THIRD PARTY ON THE SERVICE; (C) ANY CONTENT OBTAINED FROM THE SERVICE; (D) UNAUTHORIZED ACCESS, USE, OR ALTERATION OF YOUR TRANSMISSIONS OR CONTENT; OR (E) ANY INVESTMENT DECISIONS OR FINANCIAL LOSSES ARISING FROM OR RELATED TO YOUR USE OF THE SERVICE, WHETHER BASED ON WARRANTY, CONTRACT, TORT (INCLUDING NEGLIGENCE), OR ANY OTHER LEGAL THEORY, WHETHER OR NOT CLEARNAV HAS BEEN INFORMED OF THE POSSIBILITY OF SUCH DAMAGE. IN NO EVENT SHALL CLEARNAV''S TOTAL LIABILITY TO YOU FOR ALL DAMAGES, LOSSES, OR CAUSES OF ACTION EXCEED THE AMOUNT YOU HAVE PAID CLEARNAV IN THE TWELVE (12) MONTHS PRIOR TO THE EVENT GIVING RISE TO LIABILITY, OR ONE HUNDRED DOLLARS ($100), WHICHEVER IS GREATER."
      },
      {
        "title": "5. Indemnification",
        "content": "You agree to defend, indemnify, and hold harmless ClearNav, its owners, creators, operators, officers, directors, employees, agents, affiliates, and licensors from and against any and all claims, damages, obligations, losses, liabilities, costs, debts, and expenses (including but not limited to attorney''s fees) arising from: (A) your use of and access to the Service; (B) your violation of any term of these Terms; (C) your violation of any third party right, including without limitation any copyright, property, or privacy right; (D) any claim that your use of the Service caused damage to a third party; (E) any investment decisions made based on information or tools provided through the Service; or (F) any content or data you submit, post, or transmit through the Service. This indemnification obligation will survive the termination of these Terms and your use of the Service."
      },
      {
        "title": "6. Not Financial, Investment, or Legal Advice",
        "content": "THE SERVICE AND ALL CONTENT, INFORMATION, TOOLS, AND CALCULATIONS PROVIDED THROUGH THE SERVICE ARE FOR INFORMATIONAL PURPOSES ONLY AND DO NOT CONSTITUTE FINANCIAL, INVESTMENT, TAX, OR LEGAL ADVICE. CLEARNAV IS NOT A REGISTERED INVESTMENT ADVISOR, BROKER-DEALER, OR FINANCIAL PLANNER. YOU ARE SOLELY RESPONSIBLE FOR EVALUATING THE ACCURACY, COMPLETENESS, AND USEFULNESS OF ALL INFORMATION PROVIDED. YOU SHOULD CONSULT WITH YOUR OWN PROFESSIONAL ADVISORS BEFORE MAKING ANY INVESTMENT, FINANCIAL, TAX, OR LEGAL DECISIONS. CLEARNAV ASSUMES NO RESPONSIBILITY FOR ANY INVESTMENT DECISIONS OR FINANCIAL OUTCOMES RESULTING FROM YOUR USE OF THE SERVICE."
      },
      {
        "title": "7. Third-Party Data and Integrations",
        "content": "The Service may integrate with or display data from third-party sources, including but not limited to market data providers, brokerage platforms, accounting systems, and other financial services. ClearNav does not guarantee the accuracy, completeness, timeliness, or reliability of any third-party data. ClearNav is not responsible for any errors, omissions, delays, or interruptions in third-party data or integrations. Your use of third-party integrations is subject to the terms and conditions of those third parties."
      },
      {
        "title": "8. Data Accuracy and User Responsibility",
        "content": "While ClearNav strives to provide accurate calculations and data processing, you are solely responsible for verifying the accuracy of all data, calculations, reports, and statements generated by the Service. ClearNav is not liable for any errors, inaccuracies, or omissions in data, calculations, or reports, whether caused by user input errors, system errors, or third-party data issues. You should independently verify all financial information and calculations before relying on them for any purpose."
      },
      {
        "title": "9. Service Availability",
        "content": "ClearNav does not guarantee that the Service will be available at all times or that it will be uninterrupted or error-free. The Service may be unavailable due to maintenance, upgrades, technical issues, force majeure events, or other circumstances beyond our control. ClearNav reserves the right to suspend, modify, or discontinue the Service (or any part thereof) at any time with or without notice. ClearNav shall not be liable for any suspension, modification, or discontinuance of the Service."
      },
      {
        "title": "10. User Conduct and Prohibited Uses",
        "content": "You agree not to use the Service for any unlawful purpose or in any way that could damage, disable, overburden, or impair the Service. Prohibited uses include but are not limited to: (A) violating any applicable laws or regulations; (B) infringing on intellectual property rights; (C) transmitting harmful code, viruses, or malware; (D) attempting unauthorized access to systems or data; (E) interfering with other users'' access to the Service; (F) using automated systems to access the Service without authorization; (G) reverse engineering or attempting to extract source code; (H) using the Service for fraudulent purposes; or (I) violating securities laws or regulations."
      },
      {
        "title": "11. Intellectual Property",
        "content": "The Service and its entire contents, features, and functionality (including but not limited to all information, software, text, displays, images, video, and audio, and the design, selection, and arrangement thereof) are owned by ClearNav, its licensors, or other providers of such material and are protected by copyright, trademark, patent, trade secret, and other intellectual property or proprietary rights laws. You are granted a limited, non-exclusive, non-transferable, revocable license to access and use the Service for its intended purpose in accordance with these Terms."
      },
      {
        "title": "12. Termination",
        "content": "ClearNav may terminate or suspend your access to the Service immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach these Terms. Upon termination, your right to use the Service will immediately cease. All provisions of these Terms which by their nature should survive termination shall survive termination, including but not limited to ownership provisions, warranty disclaimers, indemnification, and limitations of liability."
      },
      {
        "title": "13. Modifications to Terms",
        "content": "ClearNav reserves the right to modify or replace these Terms at any time at its sole discretion. If a revision is material, we will provide at least 30 days'' notice prior to any new terms taking effect. What constitutes a material change will be determined at our sole discretion. By continuing to access or use the Service after revisions become effective, you agree to be bound by the revised terms."
      },
      {
        "title": "14. Governing Law and Dispute Resolution",
        "content": "These Terms shall be governed by and construed in accordance with the laws of the State of Delaware, United States, without regard to its conflict of law provisions. Any dispute arising from or relating to these Terms or the Service shall be resolved through binding arbitration in accordance with the Commercial Arbitration Rules of the American Arbitration Association. The arbitration shall take place in Delaware, and judgment on the arbitration award may be entered in any court having jurisdiction. You waive any right to a jury trial or to participate in a class action."
      },
      {
        "title": "15. Force Majeure",
        "content": "ClearNav shall not be liable for any failure or delay in performance due to circumstances beyond its reasonable control, including but not limited to acts of God, war, terrorism, riots, embargoes, acts of civil or military authorities, fire, floods, accidents, pandemics, strikes, or shortages of transportation facilities, fuel, energy, labor, or materials."
      },
      {
        "title": "16. Entire Agreement",
        "content": "These Terms, together with our Privacy Policy and any other legal notices or agreements published by ClearNav on the Service, constitute the entire agreement between you and ClearNav regarding the Service and supersede all prior or contemporaneous understandings and agreements, whether written or oral, regarding the Service."
      },
      {
        "title": "17. Severability",
        "content": "If any provision of these Terms is held to be invalid or unenforceable by a court of competent jurisdiction, the remaining provisions will continue in full force and effect. The invalid or unenforceable provision will be deemed modified to the extent necessary to make it valid and enforceable while preserving its intent to the maximum extent possible."
      },
      {
        "title": "18. Contact Information",
        "content": "If you have any questions about these Terms, please contact us at: legal@clearnav.com"
      }
    ]
  }'::jsonb,
  '1.0',
  now(),
  true
);

-- Insert comprehensive Privacy Policy
INSERT INTO legal_documents (
  tenant_id,
  document_type,
  title,
  content,
  version,
  effective_date,
  is_active
) VALUES (
  NULL,
  'privacy',
  'ClearNav Platform Privacy Policy',
  '{
    "sections": [
      {
        "title": "1. Introduction",
        "content": "This Privacy Policy describes how ClearNav (\"we,\" \"us,\" or \"our\") collects, uses, shares, and protects personal information in connection with the ClearNav platform (\"Service\"). We are committed to protecting your privacy and maintaining the security of your personal information in accordance with applicable data protection laws and regulations, including the General Data Protection Regulation (GDPR) and California Consumer Privacy Act (CCPA). By using the Service, you consent to the data practices described in this Privacy Policy."
      },
      {
        "title": "2. Information We Collect",
        "content": "We collect several types of information: (A) Account Information: Name, email address, phone number, business information, and authentication credentials. (B) Financial Information: Investment account details, portfolio holdings, transaction history, tax identification numbers, and other financial data necessary to provide the Service. (C) Usage Information: Log data, IP addresses, browser type, device information, pages visited, features used, and interaction patterns. (D) Communications: Messages, support requests, feedback, and other communications with us. (E) Third-Party Data: Information received from integrated services such as brokerage platforms, accounting systems, market data providers, and identity verification services. (F) Cookies and Tracking Technologies: Information collected through cookies, web beacons, and similar technologies."
      },
      {
        "title": "3. How We Use Your Information",
        "content": "We use collected information for the following purposes: (A) Providing and maintaining the Service; (B) Processing transactions and managing accounts; (C) Calculating net asset values, performance metrics, and generating reports; (D) Authenticating users and preventing fraud; (E) Communicating with you about your account and the Service; (F) Improving and personalizing the Service; (G) Conducting analytics and research; (H) Complying with legal obligations and regulatory requirements; (I) Enforcing our Terms of Service; and (J) Protecting the rights, property, and safety of ClearNav, our users, and the public."
      },
      {
        "title": "4. Legal Basis for Processing (GDPR)",
        "content": "For users in the European Economic Area (EEA), we process personal data based on the following legal grounds: (A) Contractual Necessity: Processing is necessary to perform our contract with you; (B) Legitimate Interests: Processing is necessary for our legitimate business interests, such as fraud prevention and service improvement; (C) Legal Compliance: Processing is necessary to comply with legal obligations; and (D) Consent: You have given explicit consent for specific processing activities, which you may withdraw at any time."
      },
      {
        "title": "5. Information Sharing and Disclosure",
        "content": "We share information in the following circumstances: (A) Service Providers: We share information with third-party vendors who perform services on our behalf, including cloud hosting, data analytics, customer support, and payment processing, under strict confidentiality agreements. (B) Business Transfers: In connection with mergers, acquisitions, or sale of assets, your information may be transferred to the acquiring entity. (C) Legal Requirements: We may disclose information to comply with legal obligations, court orders, subpoenas, or regulatory requests. (D) Protection of Rights: We may disclose information to protect our rights, property, safety, or the rights of users or others. (E) With Your Consent: We may share information for other purposes with your explicit consent. We do not sell your personal information to third parties."
      },
      {
        "title": "6. Data Security",
        "content": "We implement bank-grade security measures to protect your information: (A) Encryption: All data is encrypted in transit using TLS 1.3 or higher and at rest using AES-256 encryption. (B) Access Controls: Strict access controls limit who can access personal information based on role and necessity. (C) Authentication: Multi-factor authentication and strong password requirements. (D) Monitoring: Continuous security monitoring and intrusion detection systems. (E) Audits: Regular security audits and penetration testing. (F) Incident Response: Comprehensive incident response and breach notification procedures. (G) Employee Training: All employees receive security and privacy training. However, no method of transmission or storage is 100% secure, and we cannot guarantee absolute security."
      },
      {
        "title": "7. Data Retention",
        "content": "We retain personal information for as long as necessary to provide the Service, comply with legal obligations, resolve disputes, and enforce our agreements. Specific retention periods include: (A) Account Information: Retained while your account is active and for 7 years after account closure for legal and regulatory compliance; (B) Financial Records: Retained for 7 years in accordance with financial recordkeeping requirements; (C) Transaction Data: Retained for 7 years for tax and audit purposes; (D) Communications: Retained for 3 years; (E) Usage Logs: Retained for 2 years. When information is no longer needed, we securely delete or anonymize it."
      },
      {
        "title": "8. Your Rights and Choices",
        "content": "You have the following rights regarding your personal information: (A) Access: Request access to your personal information. (B) Correction: Request correction of inaccurate or incomplete information. (C) Deletion: Request deletion of your information, subject to legal retention requirements. (D) Portability: Request a copy of your information in a structured, machine-readable format. (E) Objection: Object to processing of your information based on legitimate interests. (F) Restriction: Request restriction of processing in certain circumstances. (G) Withdraw Consent: Withdraw consent for processing based on consent. (H) Opt-Out: Opt-out of marketing communications. To exercise these rights, contact us at privacy@clearnav.com. We will respond within 30 days. You also have the right to lodge a complaint with a supervisory authority."
      },
      {
        "title": "9. Cookies and Tracking Technologies",
        "content": "We use cookies and similar technologies for: (A) Authentication and security; (B) Remembering preferences and settings; (C) Analytics and performance monitoring; (D) Personalizing content and features. You can control cookies through your browser settings, but disabling cookies may limit functionality. We use both first-party and third-party cookies, including: (A) Essential Cookies: Required for basic functionality; (B) Performance Cookies: Collect anonymous usage statistics; (C) Functional Cookies: Remember preferences and settings; (D) Analytics Cookies: Understand how users interact with the Service."
      },
      {
        "title": "10. Third-Party Services and Links",
        "content": "The Service may integrate with or contain links to third-party services, including brokerage platforms, accounting systems, and market data providers. These third parties have their own privacy policies, and we are not responsible for their practices. We encourage you to review the privacy policies of any third-party services you access through the Service. When you use third-party integrations, you authorize us to access and process information from those services as necessary to provide the Service."
      },
      {
        "title": "11. International Data Transfers",
        "content": "Your information may be transferred to and processed in countries other than your country of residence, including the United States. These countries may have different data protection laws. When we transfer information internationally, we implement appropriate safeguards, including: (A) Standard Contractual Clauses approved by the European Commission; (B) Adequacy decisions; (C) Privacy Shield certification (where applicable); and (D) Other legally approved transfer mechanisms. By using the Service, you consent to the transfer of your information to countries outside your jurisdiction."
      },
      {
        "title": "12. Children''s Privacy",
        "content": "The Service is not intended for use by individuals under the age of 18. We do not knowingly collect personal information from children under 18. If we become aware that we have collected information from a child under 18, we will take steps to delete such information promptly. If you believe we have collected information from a child under 18, please contact us at privacy@clearnav.com."
      },
      {
        "title": "13. California Privacy Rights (CCPA)",
        "content": "California residents have additional rights under the California Consumer Privacy Act (CCPA): (A) Right to Know: Request information about the categories and specific pieces of personal information we collect, use, and disclose. (B) Right to Delete: Request deletion of personal information, subject to exceptions. (C) Right to Opt-Out: Opt-out of the sale of personal information (we do not sell personal information). (D) Right to Non-Discrimination: You will not be discriminated against for exercising your CCPA rights. To exercise these rights, contact us at privacy@clearnav.com or call 1-800-CLEARNAV. We will verify your identity before responding to requests. You may designate an authorized agent to make requests on your behalf."
      },
      {
        "title": "14. Data Breach Notification",
        "content": "In the event of a data breach that affects your personal information, we will notify you and applicable regulatory authorities in accordance with legal requirements. Notification will be provided without unreasonable delay and include: (A) The nature of the breach; (B) The types of information involved; (C) The steps we have taken to address the breach; (D) Recommendations for protecting your information; and (E) Contact information for further inquiries."
      },
      {
        "title": "15. Regulatory Compliance",
        "content": "We comply with applicable financial services regulations, including: (A) Securities and Exchange Commission (SEC) rules; (B) Financial Industry Regulatory Authority (FINRA) requirements; (C) Bank Secrecy Act (BSA) and anti-money laundering (AML) regulations; (D) Know Your Customer (KYC) requirements; and (E) Other applicable federal and state financial regulations. We may share information with regulatory authorities as required or permitted by law."
      },
      {
        "title": "16. Changes to This Privacy Policy",
        "content": "We may update this Privacy Policy from time to time. We will notify you of material changes by posting the new Privacy Policy on the Service and updating the \"Last Updated\" date. For significant changes, we will provide additional notice, such as email notification. Your continued use of the Service after changes become effective constitutes acceptance of the revised Privacy Policy. We encourage you to review this Privacy Policy periodically."
      },
      {
        "title": "17. Contact Us",
        "content": "If you have questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us at: Email: privacy@clearnav.com, Mail: ClearNav Privacy Officer, 123 Financial Plaza, Wilmington, DE 19801, Phone: 1-800-CLEARNAV. We will respond to your inquiry within 30 days."
      },
      {
        "title": "18. Data Protection Officer",
        "content": "For users in the European Economic Area (EEA), you may contact our Data Protection Officer at: dpo@clearnav.com"
      }
    ],
    "lastUpdated": "2026-03-22"
  }'::jsonb,
  '1.0',
  now(),
  true
);
