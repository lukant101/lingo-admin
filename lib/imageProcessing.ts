import { ImageManipulator, SaveFormat } from "expo-image-manipulator";

export const LOGO_SIZE = 512;

type CoverVariant = "horizontal" | "vertical";

type Dimensions = {
  width: number;
  height: number;
};

export type ResizeResult = {
  uri: string;
  format: "jpeg" | "png" | "webp";
};

export const MAX_COVER_DIMENSIONS: Record<CoverVariant, Dimensions> = {
  horizontal: { width: 1920, height: 1080 },
  vertical: { width: 1080, height: 1920 },
};

export const UPSCALE_TARGET_DIMENSIONS: Record<CoverVariant, Dimensions> = {
  horizontal: { width: 1280, height: 720 },
  vertical: { width: 720, height: 1280 },
};

export const MIN_COVER_DIMENSIONS: Record<CoverVariant, Dimensions> = {
  horizontal: { width: 960, height: 540 },
  vertical: { width: 540, height: 960 },
};

export async function resizeForCover(
  uri: string,
  variant: CoverVariant,
  sourceWidth: number | null,
  sourceHeight: number | null,
  mimeType?: string | null
): Promise<ResizeResult> {
  const max = MAX_COVER_DIMENSIONS[variant];
  const upscaleTarget = UPSCALE_TARGET_DIMENSIONS[variant];

  // Detect format from URI extension or MIME type (blob URLs have no extension)
  const lowerUri = uri.toLowerCase();
  const lowerMime = mimeType?.toLowerCase() ?? "";
  const isPng = lowerUri.endsWith(".png") || lowerMime === "image/png";
  const isWebp = lowerUri.endsWith(".webp") || lowerMime === "image/webp";
  const isJpeg =
    lowerUri.endsWith(".jpg") ||
    lowerUri.endsWith(".jpeg") ||
    lowerMime === "image/jpeg";
  const isWebFriendly = isPng || isJpeg || isWebp;

  // Check if aspect ratio matches target (for center-crop)
  const targetRatio = max.width / max.height;
  const needsCrop =
    sourceWidth != null &&
    sourceHeight != null &&
    Math.abs(sourceWidth / sourceHeight - targetRatio) > 0.01;

  const needsResize =
    sourceWidth == null ||
    sourceHeight == null ||
    sourceWidth > max.width ||
    sourceHeight > max.height ||
    sourceWidth < upscaleTarget.width ||
    sourceHeight < upscaleTarget.height;

  if (isWebFriendly && !needsResize && !needsCrop) {
    const passFormat = isPng ? "png" : isWebp ? "webp" : "jpeg";
    return { uri, format: passFormat };
  }

  const format: "png" | "webp" = isPng ? "png" : "webp";
  const context = ImageManipulator.manipulate(uri);

  // Center-crop to target aspect ratio if needed
  if (needsCrop && sourceWidth != null && sourceHeight != null) {
    const sourceRatio = sourceWidth / sourceHeight;
    let cropWidth: number;
    let cropHeight: number;

    if (sourceRatio > targetRatio) {
      // Source is wider — crop sides
      cropHeight = sourceHeight;
      cropWidth = Math.round(sourceHeight * targetRatio);
    } else {
      // Source is taller — crop top/bottom
      cropWidth = sourceWidth;
      cropHeight = Math.round(sourceWidth / targetRatio);
    }

    const originX = Math.round((sourceWidth - cropWidth) / 2);
    const originY = Math.round((sourceHeight - cropHeight) / 2);

    context.crop({
      originX,
      originY,
      width: cropWidth,
      height: cropHeight,
    });

    // Update effective dimensions after crop for resize logic
    sourceWidth = cropWidth;
    sourceHeight = cropHeight;
  }

  if (sourceWidth != null && sourceHeight != null) {
    if (sourceWidth > max.width || sourceHeight > max.height) {
      context.resize({ width: max.width, height: max.height });
    } else if (
      sourceWidth < upscaleTarget.width ||
      sourceHeight < upscaleTarget.height
    ) {
      context.resize({
        width: upscaleTarget.width,
        height: upscaleTarget.height,
      });
    }
  } else {
    context.resize({ width: max.width, height: max.height });
  }

  const image = await context.renderAsync();
  const result = await image.saveAsync({
    format: isPng ? SaveFormat.PNG : SaveFormat.WEBP,
    compress: isPng ? 1 : isWebFriendly ? 0.8 : 0.65,
  });
  return { uri: result.uri, format };
}

export async function resizeForLogo(
  uri: string,
  sourceWidth: number | null,
  sourceHeight: number | null,
  mimeType?: string | null
): Promise<ResizeResult> {
  const lowerUri = uri.toLowerCase();
  const lowerMime = mimeType?.toLowerCase() ?? "";
  const isPng = lowerUri.endsWith(".png") || lowerMime === "image/png";
  const isWebp = lowerUri.endsWith(".webp") || lowerMime === "image/webp";
  const isJpeg =
    lowerUri.endsWith(".jpg") ||
    lowerUri.endsWith(".jpeg") ||
    lowerMime === "image/jpeg";
  const isWebFriendly = isPng || isJpeg || isWebp;

  const needsCrop =
    sourceWidth != null &&
    sourceHeight != null &&
    Math.abs(sourceWidth / sourceHeight - 1) > 0.01;

  const needsResize =
    sourceWidth == null ||
    sourceHeight == null ||
    sourceWidth > LOGO_SIZE ||
    sourceHeight > LOGO_SIZE;

  if (isWebFriendly && !needsResize && !needsCrop) {
    const passFormat = isPng ? "png" : isWebp ? "webp" : "jpeg";
    return { uri, format: passFormat };
  }

  const format: "png" | "webp" = isPng ? "png" : "webp";
  const context = ImageManipulator.manipulate(uri);

  if (needsCrop && sourceWidth != null && sourceHeight != null) {
    const side = Math.min(sourceWidth, sourceHeight);
    const originX = Math.round((sourceWidth - side) / 2);
    const originY = Math.round((sourceHeight - side) / 2);

    context.crop({
      originX,
      originY,
      width: side,
      height: side,
    });
  }

  if (
    sourceWidth == null ||
    sourceHeight == null ||
    Math.min(sourceWidth, sourceHeight) > LOGO_SIZE
  ) {
    context.resize({ width: LOGO_SIZE, height: LOGO_SIZE });
  }

  const image = await context.renderAsync();
  const result = await image.saveAsync({
    format: isPng ? SaveFormat.PNG : SaveFormat.WEBP,
    compress: isPng ? 1 : isWebFriendly ? 0.8 : 0.65,
  });
  return { uri: result.uri, format };
}
