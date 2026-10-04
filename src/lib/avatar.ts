/** Everything about profile pictures that isn't UI. */

export const AVATAR_BUCKET = "avatars";
export const AVATAR_SIZE = 256;

/** What the file picker is allowed to offer and what we will try to decode. */
export const AVATAR_ACCEPT = "image/jpeg,image/png,image/webp";
const MAX_INPUT_BYTES = 10 * 1024 * 1024;

/**
 * Public URL for a stored picture. `profiles.avatar_path` holds only the
 * path inside the bucket (see the avatars migration for why), so this is the
 * one place a URL gets built. Empty string = no picture, which callers
 * render as an initial.
 */
export function avatarUrl(path: string | null | undefined): string {
  if (!path) return "";
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${AVATAR_BUCKET}/${path}`;
}

/** A fresh object name per upload, so a replaced picture is never cached stale. */
export function newAvatarPath(userId: string): string {
  return `${userId}/${Date.now()}.jpg`;
}

/**
 * Turns whatever the person picked into the one thing we store: a centred
 * square crop, 256×256, JPEG. Done in the browser so a 6 MB phone photo never
 * leaves the device — what is uploaded is roughly 20–40 KB.
 *
 * Throws an Error with a message fit to show the person.
 */
export async function processAvatar(file: File): Promise<Blob> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    throw new Error("Use a JPG, PNG or WebP image.");
  }
  if (file.size > MAX_INPUT_BYTES) {
    throw new Error("That image is too large. Pick one under 10 MB.");
  }

  let bitmap: ImageBitmap;
  try {
    // "from-image" applies the photo's EXIF rotation, so a portrait phone
    // shot isn't uploaded sideways.
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new Error("Couldn't read that image. Try a different file.");
  }

  const side = Math.min(bitmap.width, bitmap.height);
  // Anything smaller would be stretched up to 256 px and come out blurry.
  if (side < AVATAR_SIZE) {
    bitmap.close();
    throw new Error(
      `That image is too small. It should be at least ${AVATAR_SIZE} by ${AVATAR_SIZE} pixels.`,
    );
  }

  const canvas = document.createElement("canvas");
  canvas.width = AVATAR_SIZE;
  canvas.height = AVATAR_SIZE;
  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    throw new Error("Your browser can't process images here.");
  }

  // JPEG has no transparency; without a backdrop a transparent PNG would
  // come out black. The colour matches the page so it blends in.
  context.fillStyle = "#1a1a1a";
  context.fillRect(0, 0, AVATAR_SIZE, AVATAR_SIZE);
  context.drawImage(
    bitmap,
    (bitmap.width - side) / 2,
    (bitmap.height - side) / 2,
    side,
    side,
    0,
    0,
    AVATAR_SIZE,
    AVATAR_SIZE,
  );
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.85),
  );
  if (!blob) throw new Error("Couldn't process that image. Try a different file.");
  return blob;
}
