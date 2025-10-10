
import { NextApiRequest, NextApiResponse } from "next";
import { createWorker } from "tesseract.js";

// This is a long-running process, so we should initialize the worker outside the handler
// to cache it between invocations in a serverless environment.
let worker: Tesseract.Worker | null = null;
let workerReady = false;

async function initializeWorker() {
  if (!worker) {
    worker = await createWorker();
  }
  if (!workerReady) {
    await worker.load();
    await worker.loadLanguage('eng');
    await worker.initialize('eng');
    workerReady = true;
  }
  return worker;
}

// Pre-warm the worker on server startup
initializeWorker();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { imageUrl } = req.body;
    if (!imageUrl) {
      return res.status(400).json({ message: "Image URL is required" });
    }

    // console.log(`Received request to OCR image: ${imageUrl}`)

    const ocrWorker = await initializeWorker();
    const { data: { text } } = await ocrWorker.recognize(imageUrl);
    
    // console.log(`OCR Result: ${text.substring(0, 100)}...`);

    res.status(200).json({ text });

  } catch (error) {
    // console.error("Error performing OCR:", error);
    res.status(500).json({ message: "Internal server error or OCR failure" });
  }
  // We don't terminate the worker here to keep it warm for subsequent requests.
  // It will be garbage collected when the serverless function instance is recycled.
}
