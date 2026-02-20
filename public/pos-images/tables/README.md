# Table images

Place table images in this folder, or add them via the Admin **Edit table** / **Add table** modal (upload from your device).

**Path:** `public/pos-images/tables/`

You can add image files here (e.g. `T1.jpg`, `booth-1.jpg`) and reference them when adding or editing a table in Admin (e.g. `/pos-images/tables/T1.jpg`). If no image is set, the system uses the placeholder image.

**If you see "Unknown argument images"** when saving a table: stop the dev server, run `npx prisma generate` then `npx prisma db push`, then restart the server.
