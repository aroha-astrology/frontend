# Varshik share cards on Android: the saveImage method

`lib/pdf/share-image.ts` calls `FileSaver.saveImage({ base64, fileName })` on the Android app and falls back to the Web Share API when the plugin has no such method. The method does not exist yet in `mobile/.../FileSaverPlugin.java` (mobile is on release/1.18, so it was left alone). It needs, for app build 1.19:

- `saveImage`: decode base64, write to Pictures/Aroha via MediaStore.Images (API 29+; older phones: the app cache folder `images/`, already shared by file_paths.xml), then open an ACTION_SEND chooser (image/jpeg) so the reader can send it on at once. Resolve `{ uri, saved }`.
