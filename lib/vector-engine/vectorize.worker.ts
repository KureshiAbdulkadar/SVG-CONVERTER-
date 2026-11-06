import { vectorizeImage, classifyImageHeuristic } from "./index";
import type { VectorParameters } from "./types";

self.onmessage = async (
  event: MessageEvent<{
    pixels: ArrayBuffer;
    width: number;
    height: number;
    params: VectorParameters;
  }>,
) => {
  try {
    const { pixels, width, height, params } = event.data;
    const data = new Uint8ClampedArray(pixels);
    const result = await vectorizeImage(
      data,
      width,
      height,
      { ...params, imageType: classifyImageHeuristic(data, width, height) },
      (stage) => self.postMessage({ stage }),
    );
    self.postMessage({ result });
  } catch (error) {
    self.postMessage({
      error: error instanceof Error ? error.message : "Conversion failed",
    });
  }
};
