/*
  # Set Arkline Trust Favicon

  Sets an SVG favicon data URI for Arkline Trust's site theme.
  The favicon is a forest-green square with a gold diamond mark —
  consistent with the brand identity.
*/

UPDATE site_themes
SET favicon_url = 'data:image/svg+xml,' || '%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2032%2032%22%3E%3Crect%20width%3D%2232%22%20height%3D%2232%22%20rx%3D%225%22%20fill%3D%22%231B3A2D%22%2F%3E%3Cpath%20d%3D%22M16%206%20L27%2016%20L16%2026%20L5%2016%20Z%22%20fill%3D%22none%22%20stroke%3D%22%23B8934A%22%20stroke-width%3D%221.8%22%20stroke-linejoin%3D%22round%22%2F%3E%3Ccircle%20cx%3D%2216%22%20cy%3D%2216%22%20r%3D%222.8%22%20fill%3D%22%23B8934A%22%2F%3E%3C%2Fsvg%3E'
WHERE id = '60133117-7430-4e12-be9b-28c3801468ac';
