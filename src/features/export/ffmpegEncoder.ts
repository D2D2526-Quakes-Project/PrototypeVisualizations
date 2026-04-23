import ffmpegCoreURL from "@ffmpeg/core?url";
import ffmpegWasmURL from "@ffmpeg/core/wasm?url";

type LoadPhase = "core-script" | "core-wasm" | "ready";
type EncodePhase = "frames" | "encoding" | "finalizing";

export type FfmpegLoadProgress = {
  phase: LoadPhase;
  progress: number;
};

export type EncodeProgress = {
  phase: EncodePhase;
  progress: number;
};

export type ExportVideoFormat = "mp4" | "webm";

export interface FfmpegEncoder {
  encodeFrames(params: {
    frames: Uint8Array[];
    fps: number;
    format: ExportVideoFormat;
    onProgress?: (progress: EncodeProgress) => void;
  }): Promise<Uint8Array>;
}

let encoderPromise: Promise<FfmpegEncoder> | null = null;

function buildOutputArgs(format: ExportVideoFormat, fps: number, outputFile: string): string[] {
  const inputArgs = ["-framerate", `${fps}`, "-i", "frame-%06d.png"];

  if (format === "mp4") {
    return [...inputArgs, "-c:v", "mpeg4", "-pix_fmt", "yuv420p", outputFile];
  }

  return [...inputArgs, "-c:v", "libvpx", "-pix_fmt", "yuv420p", "-b:v", "0", "-crf", "32", outputFile];
}

function frameFileName(index: number): string {
  return `frame-${`${index}`.padStart(6, "0")}.png`;
}

export async function canvasToPngBytes(canvas: HTMLCanvasElement): Promise<Uint8Array> {
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((nextBlob) => {
      if (!nextBlob) {
        reject(new Error("Failed to encode export frame"));
        return;
      }
      resolve(nextBlob);
    }, "image/png");
  });

  return new Uint8Array(await blob.arrayBuffer());
}

export async function getFfmpegEncoder(
  onLoadProgress?: (progress: FfmpegLoadProgress) => void
): Promise<FfmpegEncoder> {
  if (!encoderPromise) {
    encoderPromise = (async () => {
      const [{ FFmpeg }, { toBlobURL }] = await Promise.all([import("@ffmpeg/ffmpeg"), import("@ffmpeg/util")]);

      const ffmpeg = new FFmpeg();
      const coreJsBlobUrl = await toBlobURL(ffmpegCoreURL, "text/javascript", true, ({ total, received }) => {
        const nextProgress = total > 0 ? received / total : 0;
        onLoadProgress?.({
          phase: "core-script",
          progress: nextProgress * 0.15,
        });
      });
      const wasmBlobUrl = await toBlobURL(ffmpegWasmURL, "application/wasm", true, ({ total, received }) => {
        const nextProgress = total > 0 ? received / total : 0;
        onLoadProgress?.({
          phase: "core-wasm",
          progress: 0.15 + nextProgress * 0.85,
        });
      });

      await ffmpeg.load({
        coreURL: coreJsBlobUrl,
        wasmURL: wasmBlobUrl,
      });

      onLoadProgress?.({ phase: "ready", progress: 1 });

      return {
        async encodeFrames({ frames, fps, format, onProgress }) {
          const outputFile = format === "mp4" ? "output.mp4" : "output.webm";
          const ffmpegProgressHandler = ({ progress }: { progress: number }) => {
            onProgress?.({
              phase: "encoding",
              progress,
            });
          };

          ffmpeg.on("progress", ffmpegProgressHandler);

          try {
            for (let index = 0; index < frames.length; index += 1) {
              await ffmpeg.writeFile(frameFileName(index + 1), frames[index]);
              onProgress?.({
                phase: "frames",
                progress: (index + 1) / frames.length,
              });
            }

            const exitCode = await ffmpeg.exec(buildOutputArgs(format, fps, outputFile));
            if (exitCode !== 0) {
              throw new Error(`ffmpeg exited with code ${exitCode}`);
            }

            onProgress?.({
              phase: "finalizing",
              progress: 1,
            });

            const data = await ffmpeg.readFile(outputFile);
            if (!(data instanceof Uint8Array)) {
              throw new Error("ffmpeg returned unexpected output data");
            }

            return data;
          } finally {
            ffmpeg.off("progress", ffmpegProgressHandler);
            for (let index = 0; index < frames.length; index += 1) {
              await ffmpeg.deleteFile(frameFileName(index + 1)).catch(() => undefined);
            }
            await ffmpeg.deleteFile(outputFile).catch(() => undefined);
          }
        },
      } satisfies FfmpegEncoder;
    })();
  }

  return encoderPromise;
}
