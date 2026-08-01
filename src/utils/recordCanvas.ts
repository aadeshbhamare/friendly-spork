export async function recordCanvasStreamToWebM(canvas: HTMLCanvasElement, seconds = 5): Promise<Blob> {
  if (!canvas) throw new Error("No canvas provided");

  // Try to get a stream from the canvas (works when animation is drawn to canvas)
  const captureStreamFn = (canvas as any).captureStream || (canvas as any).mozCaptureStream;
  if (!captureStreamFn) throw new Error("Canvas captureStream is not supported in this browser");

  const stream = captureStreamFn.call(canvas, 60) as MediaStream | undefined;
  if (!stream) throw new Error("Failed to get canvas MediaStream");

  const recordedChunks: BlobPart[] = [];
  // Prefer VP9 if available; fallback will be handled by MediaRecorder
  const mimeType = "video/webm;codecs=vp9,opus";
  let recorder: MediaRecorder;

  try {
    recorder = new MediaRecorder(stream, { mimeType });
  } catch (e) {
    // fallback to default
    recorder = new MediaRecorder(stream);
  }

  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size) recordedChunks.push(e.data);
  };

  const stopPromise = new Promise<Blob>((resolve, reject) => {
    recorder.onstop = () => {
      try {
        const blob = new Blob(recordedChunks, { type: recordedChunks.length ? recordedChunks[0]?.type || 'video/webm' : 'video/webm' });
        resolve(blob);
      } catch (err) {
        reject(err);
      }
    };
    recorder.onerror = (ev) => reject(ev);
  });

  recorder.start();

  // Stop after given seconds (or you can implement UI to stop earlier)
  setTimeout(() => {
    if (recorder.state === "recording") recorder.stop();
  }, seconds * 1000);

  const webmBlob = await stopPromise;
  return webmBlob;
}
