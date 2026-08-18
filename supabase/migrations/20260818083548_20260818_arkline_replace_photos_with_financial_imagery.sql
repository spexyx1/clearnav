/*
  # Arkline Trust — Replace photos with financial/wealth-management imagery

  1. Purpose
     Replace the generic yacht hero background, stock office photos, and
     random team portraits with imagery that matches a professional Australian
     wealth management / trust company.

  2. Changes
     Hero backgrounds (home, about, contact, strategies, team pages):
       → Sydney skyline at twilight (Australian financial hub)
     About section image (about page):
       → Modern office interior with glass partitions
     About section image (home page):
       → Financial trading charts on screen (investment focus)
     Team member photos (5 members):
       → Professional corporate portraits (suit, neutral background)

  3. Scope
     Only the Arkline Trust tenant (id 66aa0d61-696b-46e1-b2d3-4efcb8a315af).
     No structural schema changes; no data loss.
*/

-- 1. Hero backgrounds: all pages → Sydney skyline at twilight
UPDATE website_content
SET content = jsonb_set(content, '{background_image}', '"https://images.pexels.com/photos/30808415/pexels-photo-30808415.jpeg?auto=compress&cs=tinysrgb&w=1920"')
WHERE tenant_id = '66aa0d61-696b-46e1-b2d3-4efcb8a315af'
  AND section_type = 'hero'
  AND content->>'background_image' LIKE '%sailing-yacht%';

-- 2. About page section image → modern office interior
UPDATE website_content
SET content = jsonb_set(content, '{image}', '"https://images.pexels.com/photos/35736048/pexels-photo-35736048.jpeg?auto=compress&cs=tinysrgb&w=1200"')
WHERE tenant_id = '66aa0d61-696b-46e1-b2d3-4efcb8a315af'
  AND page_slug = 'about'
  AND section_type = 'about'
  AND content->>'image' = 'https://images.pexels.com/photos/1370295/pexels-photo-1370295.jpeg?auto=compress&cs=tinysrgb&w=1200';

-- 3. Home page about section image → financial charts / investment data
UPDATE website_content
SET content = jsonb_set(content, '{image}', '"https://images.pexels.com/photos/5784807/pexels-photo-5784807.jpeg?auto=compress&cs=tinysrgb&w=1200"')
WHERE tenant_id = '66aa0d61-696b-46e1-b2d3-4efcb8a315af'
  AND page_slug = 'home'
  AND section_type = 'about'
  AND content->>'image' = 'https://images.pexels.com/photos/3184292/pexels-photo-3184292.jpeg?auto=compress&cs=tinysrgb&w=1200';

-- 4. Team member photos → professional corporate portraits
UPDATE website_content
SET content = jsonb_set(content, '{members,0,image}', '"https://images.pexels.com/photos/27798105/pexels-photo-27798105.jpeg?auto=compress&cs=tinysrgb&w=400"')
WHERE tenant_id = '66aa0d61-696b-46e1-b2d3-4efcb8a315af'
  AND page_slug = 'team'
  AND section_type = 'team';

UPDATE website_content
SET content = jsonb_set(content, '{members,1,image}', '"https://images.pexels.com/photos/17362827/pexels-photo-17362827.jpeg?auto=compress&cs=tinysrgb&w=400"')
WHERE tenant_id = '66aa0d61-696b-46e1-b2d3-4efcb8a315af'
  AND page_slug = 'team'
  AND section_type = 'team';

UPDATE website_content
SET content = jsonb_set(content, '{members,2,image}', '"https://images.pexels.com/photos/756484/pexels-photo-756484.jpeg?auto=compress&cs=tinysrgb&w=400"')
WHERE tenant_id = '66aa0d61-696b-46e1-b2d3-4efcb8a315af'
  AND page_slug = 'team'
  AND section_type = 'team';

UPDATE website_content
SET content = jsonb_set(content, '{members,3,image}', '"https://images.pexels.com/photos/16970459/pexels-photo-16970459.jpeg?auto=compress&cs=tinysrgb&w=400"')
WHERE tenant_id = '66aa0d61-696b-46e1-b2d3-4efcb8a315af'
  AND page_slug = 'team'
  AND section_type = 'team';

UPDATE website_content
SET content = jsonb_set(content, '{members,4,image}', '"https://images.pexels.com/photos/38319085/pexels-photo-38319085.jpeg?auto=compress&cs=tinysrgb&w=400"')
WHERE tenant_id = '66aa0d61-696b-46e1-b2d3-4efcb8a315af'
  AND page_slug = 'team'
  AND section_type = 'team';
