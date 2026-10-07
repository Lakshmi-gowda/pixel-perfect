# Supplied heart model inspection

Source: human_heart.glb, preserved as public/models/heart.glb.

- Size: 3,034,092 bytes (2.89 MiB).
- Triangles: 13,286 across five meshes; suitable for the requested lightweight stage.
- Hierarchy: Sketchfab_model → human heart.obj.cleaner → Object_2, Object_3, Object_4, Object_5, Object_6.
- Mesh names: Object_0, Object_1, Object_2, Object_3, Object_4.
- Materials: Material__12, Material__24, Material__37, textured, double-sided.
- No animations, skins or morph targets.
- Coronary mesh names are generic: no reliable LAD/LCX/RCA mapping. No anatomical assignments are inferred from these names.
- Use three separate schematic tube overlays named exactly LAD, LCX, RCA. Control points are editable in config/vesselCurves.ts; anatomical alignment NEEDS_CONFIRMATION.
- Center and normalize the scene using its transformed bounds; visually verify front-facing presentation.

Embedded attribution: “human heart” by sammite, https://sketchfab.com/sammite86. Source https://sketchfab.com/3d-models/human-heart-bc51630b88b94f5fb6bdaef1488041c3. CC BY 4.0.