/*
  # Arkline Trust — Unify typography to Cormorant Garamond

  1. Purpose
     Replace the secondary body font ("Nunito Sans") with the same elegant
     heading font ("Cormorant Garamond") so all text on arklinetrust.com uses
     one sophisticated serif typeface, adjusted by size/weight for hierarchy.

  2. Changes
     - site_themes.typography.bodyFont → '"Cormorant Garamond", "Garamond", Georgia, serif'
     - site_themes.typography.bodyWeight → '400'
     - site_themes.custom_css: remove Nunito Sans @import and .at-body rule;
       set .at-body to Cormorant Garamond so any legacy references stay consistent.

  3. Scope
     Only the Arkline Trust tenant (id 66aa0d61-696b-46e1-b2d3-4efcb8a315af).
     No structural schema changes; no data loss.
*/

UPDATE site_themes
SET
  typography = jsonb_set(
    jsonb_set(
      typography,
      '{bodyFont}',
      '"\"Cormorant Garamond\", \"Garamond\", Georgia, serif"'::jsonb
    ),
    '{bodyWeight}',
    '"400"'::jsonb
  ),
  custom_css = '
/* Arkline Trust — Australian Brand Identity */
@import url("https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&display=swap");

:root {
  --at-forest:       #1B3A2D;
  --at-forest-mid:   #244D3C;
  --at-forest-deep:  #122A20;
  --at-ochre:        #B8934A;
  --at-ochre-light:  #D4A85C;
  --at-sand:         #F5F2EE;
  --at-stone:        #E0DBD4;
  --at-ink:          #1A1A1A;
  --at-slate:        #4A4A4A;
}

.at-heading {
  font-family: "Cormorant Garamond", Georgia, serif;
  font-weight: 600;
}

.at-body {
  font-family: "Cormorant Garamond", Georgia, serif;
  font-weight: 400;
}

.at-ochre-text { color: var(--at-ochre); }

.at-divider {
  width: 48px;
  height: 1px;
  background: var(--at-ochre);
  margin: 1.25rem 0;
}

.at-divider-center {
  width: 48px;
  height: 1px;
  background: var(--at-ochre);
  margin: 1.25rem auto;
}
'
WHERE tenant_id = '66aa0d61-696b-46e1-b2d3-4efcb8a315af';
