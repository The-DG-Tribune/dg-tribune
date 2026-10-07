/**
 * Cloudinary service - Document 03/05 Cloudinary Integration.
 * Uses an unsigned upload preset so uploads happen directly from the
 * browser (via the CMS) without exposing an API secret. This is the
 * ONLY place in the app that talks to Cloudinary - every upload flow
 * in the CMS calls uploadImage() from here.
 */

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

export interface CloudinaryUploadResult {
  url: string;
  publicId: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
}

export interface UploadOptions {
  folder?: string;
  onProgress?: (percent: number) => void;
}

/**
 * Uploads a single image file to Cloudinary using the unsigned preset.
 * Reports progress via XHR so the CMS can show a real progress bar.
 */
/**
 * Uploads an image to Cloudinary by remote URL instead of a local
 * File - Cloudinary fetches the URL itself. Used by the one-time
 * Data Import tool to pull real league/team logos from official
 * sources without needing to download them first.
 */
export async function uploadImageFromUrl(
  imageUrl: string,
  folder = "dg-tribune",
  attempt = 1
): Promise<CloudinaryUploadResult> {
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error("Image upload isn't configured yet.");
  }

  const formData = new FormData();
  formData.append("file", imageUrl);
  formData.append("upload_preset", UPLOAD_PRESET);
  if (folder) formData.append("folder", folder);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    { method: "POST", body: formData }
  );

  if (!response.ok) {
    // Surface Cloudinary's actual reason (e.g. "Fetched URL restricted")
    // instead of a generic message - this is almost always an account
    // security setting, not a bad or missing source image.
    let reason = "";
    try {
      const errorBody = await response.json();
      reason = errorBody?.error?.message ?? "";
    } catch {
      // response wasn't JSON - fall through with no extra detail
    }

    // 420/429 = rate limited - back off and retry rather than fail
    // the whole item on one transient blip. A real config problem
    // (e.g. "Fetched URL restricted") won't fix itself on retry, so
    // don't burn attempts on that - fail immediately instead.
    const isRateLimit = response.status === 420 || response.status === 429;
    if (isRateLimit && attempt < 4) {
      await new Promise((resolve) => setTimeout(resolve, attempt * 1500));
      return uploadImageFromUrl(imageUrl, folder, attempt + 1);
    }

    throw new Error(
      reason
        ? `Cloudinary rejected this image: ${reason}`
        : `Cloudinary couldn't fetch this image: ${imageUrl}`
    );
  }

  const data = await response.json();
  return {
    url: data.secure_url,
    publicId: data.public_id,
    width: data.width,
    height: data.height,
    format: data.format,
    bytes: data.bytes,
  };
}

export function uploadImage(
  file: File,
  options: UploadOptions = {}
): Promise<CloudinaryUploadResult> {
  return new Promise((resolve, reject) => {
    if (!CLOUD_NAME || !UPLOAD_PRESET) {
      reject(new Error("Image upload isn't configured yet."));
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", UPLOAD_PRESET);
    if (options.folder) formData.append("folder", options.folder);

    const xhr = new XMLHttpRequest();
    xhr.open(
      "POST",
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`
    );

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && options.onProgress) {
        options.onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const data = JSON.parse(xhr.responseText);
        resolve({
          url: data.secure_url,
          publicId: data.public_id,
          width: data.width,
          height: data.height,
          format: data.format,
          bytes: data.bytes,
        });
      } else {
        reject(new Error("The image couldn't be uploaded. Please try again."));
      }
    };

    xhr.onerror = () => {
      reject(new Error("The image couldn't be uploaded. Check your connection."));
    };

    xhr.send(formData);
  });
}

/**
 * Derives a thumbnail URL from any Cloudinary delivery URL by
 * inserting an on-the-fly transformation, without needing to store
 * a separate thumbnail file. Used by Wallpapers (full image vs.
 * gallery thumbnail) and anywhere else a smaller preview is needed.
 */
export function getBlurredImageUrl(url: string, blurAmount: number): string {
  if (!url.includes("/upload/") || blurAmount <= 0) return url;
  return url.replace("/upload/", `/upload/e_blur:${blurAmount}/`);
}

export function getThumbnailUrl(url: string, width = 400): string {
  if (!url.includes("/upload/")) return url;
  return url.replace("/upload/", `/upload/f_auto,q_auto,w_${width}/`);
}

/**
 * Builds an optimized delivery URL from a Cloudinary public ID.
 * Automatic format + quality, and optional resizing - Document 13
 * Image Optimization requires this for every image on the site.
 */
export function getOptimizedImageUrl(
  publicId: string,
  options: { width?: number; height?: number } = {}
): string {
  const transforms = ["f_auto", "q_auto"];
  if (options.width) transforms.push(`w_${options.width}`);
  if (options.height) transforms.push(`h_${options.height}`);
  if (options.width || options.height) transforms.push("c_fill");

  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/${transforms.join(",")}/${publicId}`;
}
