import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

/** Long edge of a stored photo: plenty for a shelf card, and keeps uploads well under 5 MB. */
const MAX_EDGE = 1600;

export type PickedPhoto = { uri: string; width: number; height: number };

export class CameraPermissionError extends Error {
  constructor() {
    super('camera_permission');
  }
}

/**
 * Opens the photo library (or camera) and returns a JPEG resized to at most 1600 px on its
 * long edge, or null if the person cancelled. Converting here means HEIC and large
 * originals never reach storage, so the 5 MB cap is a safety net rather than a hurdle.
 */
export async function pickPhoto(source: 'library' | 'camera'): Promise<PickedPhoto | null> {
  const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 1, exif: false };
  let result: ImagePicker.ImagePickerResult;
  if (source === 'camera') {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) throw new CameraPermissionError();
    result = await ImagePicker.launchCameraAsync(options);
  } else {
    // The system photo picker needs no library permission on iOS 14+ and Android 13+.
    result = await ImagePicker.launchImageLibraryAsync(options);
  }
  const asset = result.canceled ? null : result.assets[0];
  if (!asset) return null;
  return preparePhoto(asset);
}

async function preparePhoto(asset: { uri: string; width: number; height: number }): Promise<PickedPhoto> {
  const context = ImageManipulator.manipulate(asset.uri);
  const landscape = asset.width >= asset.height;
  if (Math.max(asset.width, asset.height) > MAX_EDGE) {
    context.resize(landscape ? { width: MAX_EDGE } : { height: MAX_EDGE });
  }
  const image = await context.renderAsync();
  const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.82 });
  return { uri: saved.uri, width: saved.width, height: saved.height };
}
