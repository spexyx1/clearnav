/*
  # Arkline Trust — Update team: full names with last initials, remove Jerusalem, professional titles, photos

  1. Team page — update all 6 members:
     - Names: Noah F., Nisan Y., Aryeh F., Francois S., Benjy K., Chaim T.
     - Nisan bio: remove Jerusalem reference
     - Noah bio: remove "Noah and Nisan share..." cross-reference
     - Benjy title: "Bookkeeping" → "Fund Accountant"
     - Add professional headshot photos for all members
*/

UPDATE website_content
SET content = jsonb_set(
  content,
  '{members}',
  jsonb_build_array(
    jsonb_build_object(
      'name', 'Noah F.',
      'title', 'Founder & Co-Chief Investment Officer',
      'bio', 'Noah F. established Arkline Trust and brings a rare combination of institutional-scale operating experience and private capital management. He previously served on the board of a multi-billion dollar retail chain and went on to establish a $200M+ investment office, which he continues to oversee. His grounding in large-scale business environments directly shapes how Arkline Trust evaluates risk and allocates capital.',
      'image', 'https://images.pexels.com/photos/8500398/pexels-photo-8500398.jpeg?auto=compress&cs=tinysrgb&w=400'
    ),
    jsonb_build_object(
      'name', 'Nisan Y.',
      'title', 'Co-Chief Investment Officer',
      'bio', 'Nisan Y. brings decades of business experience across multiple industries, with a strong background as an operator who has run and scaled real enterprises. His cross-sector perspective informs how Arkline Trust assesses the underlying economics of businesses, management quality, and capital allocation decisions.',
      'image', 'https://images.pexels.com/photos/8090137/pexels-photo-8090137.jpeg?auto=compress&cs=tinysrgb&w=400'
    ),
    jsonb_build_object(
      'name', 'Aryeh F.',
      'title', 'Senior Portfolio Manager & Quantitative Analyst',
      'bio', 'Aryeh F. is an analytically rigorous professional who develops and manages the fund''s systematic strategies. Applying statistical methods to portfolio construction, he works at the intersection of quantitative research and fundamental analysis. He is also pursuing a second degree in medicine, driven by intellectual curiosity as much as discipline.',
      'image', 'https://images.pexels.com/photos/6476808/pexels-photo-6476808.jpeg?auto=compress&cs=tinysrgb&w=400'
    ),
    jsonb_build_object(
      'name', 'Francois S.',
      'title', 'Advisor — Finance & Governance',
      'bio', 'Francois S. brings decades of executive-level financial expertise, having served as CFO of a $100M+ private equity firm and held senior roles at leading accounting and audit firms in Australia. His institutional finance background and governance experience provide Arkline Trust with deep structural rigour in financial oversight and reporting.',
      'image', 'https://images.pexels.com/photos/8090287/pexels-photo-8090287.jpeg?auto=compress&cs=tinysrgb&w=400'
    ),
    jsonb_build_object(
      'name', 'Benjy K.',
      'title', 'Fund Accountant',
      'bio', 'Benjy K. manages the day-to-day financial records and accounting for Arkline Trust, ensuring accurate and timely financial reporting across all fund operations.',
      'image', 'https://images.pexels.com/photos/3760263/pexels-photo-3760263.jpeg?auto=compress&cs=tinysrgb&w=400'
    ),
    jsonb_build_object(
      'name', 'Chaim T.',
      'title', 'Associate',
      'bio', 'Chaim T. is an associate working across research, operations, and deal support at Arkline Trust, contributing to the firm''s investment activities and ongoing business operations.',
      'image', 'https://images.pexels.com/photos/3762973/pexels-photo-3762973.jpeg?auto=compress&cs=tinysrgb&w=400'
    )
  )
)
WHERE tenant_id = '66aa0d61-696b-46e1-b2d3-4efcb8a315af'
  AND page_slug = 'team'
  AND section_type = 'team';
