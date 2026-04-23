/*
  # Fix Arkline Australian Rebrand (Re-apply with correct colors)
  
  The original rebrand ran but didn't update site_themes due to timing.
  This migration reapplies the Australian color palette and branding.
*/

-- Update site_themes with Australian Arkline palette
UPDATE site_themes
SET
  colors = jsonb_build_object(
    'primary',       '#1B3A2D',
    'secondary',     '#244D3C',
    'accent',        '#B8934A',
    'accentLight',   '#D4A85C',
    'background',    '#FFFFFF',
    'backgroundAlt', '#F5F2EE',
    'text',          '#1A1A1A',
    'textSecondary', '#4A4A4A',
    'textLight',     '#7A7A7A',
    'border',        '#E0DBD4',
    'success',       '#2D6A4F',
    'white',         '#FFFFFF',
    'overlay',       'rgba(27,58,45,0.92)'
  ),
  typography = jsonb_build_object(
    'headingFont',  '"Cormorant Garamond", "Garamond", Georgia, serif',
    'bodyFont',     '"Nunito Sans", "Inter", system-ui, sans-serif',
    'headingWeight', '600',
    'bodyWeight',    '400',
    'monoFont',      '"JetBrains Mono", monospace'
  )
WHERE tenant_id = '66aa0d61-696b-46e1-b2d3-4efcb8a315af';

-- Update tenant_settings with complete branding
UPDATE tenant_settings
SET branding = jsonb_build_object(
  'company_name',   'Arkline Trust',
  'tagline',        'Institutional Capital Management for the Select Few.',
  'address',        'Sydney, New South Wales, Australia',
  'founded',        '2023',
  'website',        'https://arklinetrust.com',
  'aum_range',      'under_10m',
  'contact_name',   'N Y',
  'contact_email',  'ny@key13.co',
  'contact_phone',  '+61 2 8000 0000',
  'primary_use_case', 'hedge_fund',
  'jurisdiction',   'Australia',
  'regulator',      'ASIC',
  'afsl_number',    'AFSL 000000',
  'investor_type',  'wholesale',
  'site_status',    'live'
)
WHERE tenant_id = '66aa0d61-696b-46e1-b2d3-4efcb8a315af';