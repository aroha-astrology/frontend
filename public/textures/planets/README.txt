Planet textures
===============

Source: Solar System Scope (https://www.solarsystemscope.com/textures/)
License: Creative Commons Attribution 4.0 International (CC BY 4.0)
Author : INOVE, Vienna (Solar System Scope)

All planetary equirectangular maps are 2048x1024 (2K), derived from
public-domain NASA / JPL / USGS imagery and re-projected for 3D rendering.

The Saturn ring strip is 2048x125 RGBA — alpha channel carves the real
ring gaps so the texture can be used as both `map` and `alphaMap` on a
RingGeometry without a manual radial-gradient mask.

Mapping (Vedic graha -> texture file):
  Sun     -> sunmap.jpg
  Moon    -> moonmap.jpg
  Mars    -> marsmap.jpg
  Mercury -> mercurymap.jpg
  Jupiter -> jupitermap.jpg
  Venus   -> venusmap.jpg          (2k_venus_surface)
  Saturn  -> saturnmap.jpg  + saturnringalpha.png
  Rahu    -> moonmap.jpg            (shadow node — tinted in shader)
  Ketu    -> moonmap.jpg            (shadow node — tinted in shader)

If you redistribute or republish these assets, keep this attribution.
