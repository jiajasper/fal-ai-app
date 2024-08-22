'use client'
import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { withAuth } from '../components/ProtectedRoute';
import * as fal from "@fal-ai/serverless-client";
import { Download } from "lucide-react";
import { useAuth } from '../context/FirebaseAuthContext';
import { updateUserCredits } from '../firebase/clientApp';

fal.config({
  credentials: process.env.FAL_KEY,
  proxyUrl: "/api/fal/proxy",
});

function Home() {
  const [prompt, setPrompt] = useState("A serene landscape with mountains and a lake at sunset");
  const [imageSize, setImageSize] = useState("landscape_4_3");
  const [qualityOfDetails, setQualityOfDetails] = useState(4);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [imageResult, setImageResult] = useState(null);
  const [videoResult, setVideoResult] = useState(null);
  const [logs, setLogs] = useState([]);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [showAnimationOptions, setShowAnimationOptions] = useState(false);
  const [movementLevel, setMovementLevel] = useState(127);
  const [similarityLevel, setSimilarityLevel] = useState(0.02);
  const [textareaHeight, setTextareaHeight] = useState('auto');

  const { user, credits, updateCredits } = useAuth();
  const [enhancing, setEnhancing] = useState(false);

  const textareaRef = useRef(null);

  const adjustHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  };

  useEffect(() => {
    adjustHeight();
  }, [prompt]);

  const image = useMemo(() => {
    if (!imageResult) return null;
    return imageResult.images ? imageResult.images[0] : null;
  }, [imageResult]);

  useEffect(() => {
    if (image) {
      setLogs([]);
      setShowAnimationOptions(true);
    }
  }, [image]);

  const reset = () => {
    setLoading(false);
    setError(null);
    setImageResult(null);
    setVideoResult(null);
    setLogs([]);
    setElapsedTime(0);
    setShowAnimationOptions(false);
  };

  const generateImage = async () => {
    if (credits < 1) {
      setError("Not enough credits to generate an image.");
      return;
    }

    reset();
    setLoading(true);
    const start = Date.now();
    try {
      const result = await fal.subscribe("fal-ai/flux/schnell", {
        input: {
          prompt,
          image_size: imageSize,
          num_inference_steps: qualityOfDetails,
          seed: null,
          sync_mode: true,
          num_images: 1,
          enable_safety_checker: false,
        },
        logs: true,
        onQueueUpdate(update) {
          setElapsedTime(Date.now() - start);
          if (
            update.status === "IN_PROGRESS" ||
            update.status === "COMPLETED"
          ) {
            setLogs((update.logs || []).map((log) => log.message));
          }
        },
      });
      setImageResult(result);
      setShowAnimationOptions(true);

      if (user) {
        await updateUserCredits(user.uid, -1);
        await updateCredits();
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
      setElapsedTime(Date.now() - start);
    }
  };

  const animateImage = async () => {
    if (credits < 4) {
      setError("Not enough credits to create an animation.");
      return;
    }

    if (!image) return;
    setLoading(true);
    setError(null);
    try {
      const result = await fal.subscribe("fal-ai/stable-video", {
        input: {
          image_url: image.url,
          seed: null,
          motion_bucket_id: movementLevel,
          cond_aug: similarityLevel,
          enable_safety_checker: false,
        },
        logs: true,
        onQueueUpdate(update) {
          if (
            update.status === "IN_PROGRESS" ||
            update.status === "COMPLETED"
          ) {
            setLogs((update.logs || []).map((log) => log.message));
          }
        },
      });
      setVideoResult(result);

      if (user) {
        await updateUserCredits(user.uid, -4);
        await updateCredits();
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const downloadFile = useCallback(async (url, filename) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Error downloading:', error);
      setError('Error downloading: ' + error.message);
    }
  }, []);

  const downloadImage = useCallback(() => {
    if (image) {
      downloadFile(image.url, 'generated-image.png');
    }
  }, [image, downloadFile]);

  const downloadVideo = useCallback(() => {
    if (videoResult && videoResult.video) {
      downloadFile(videoResult.video.url, 'animated-video.mp4');
    }
  }, [videoResult, downloadFile]);

  const enhancePrompt = async () => {
    setEnhancing(true);
    try {
      const response = await fetch('/api/ai-enhance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt }),
      });
      const data = await response.json();
      if (data.enhancedPrompt) {
        setPrompt(data.enhancedPrompt);
      }
    } catch (error) {
      console.error('Error enhancing prompt:', error);
      setError('Failed to enhance the prompt');
    } finally {
      setEnhancing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <label htmlFor="prompt" className="block text-lg mb-2 font-semibold">
          Prompt
        </label>
        <div className="relative">
          <textarea
            ref={textareaRef}
            className="w-full bg-gray-100 text-gray-900 placeholder-gray-500 py-3 px-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 transition duration-200 resize-none overflow-hidden"
            style={{ height: textareaHeight }}
            id="prompt"
            name="prompt"
            placeholder="Describe your image..."
            value={prompt}
            onChange={(e) => {
              setPrompt(e.target.value);
              adjustHeight();
            }}
            onBlur={(e) => setPrompt(e.target.value.trim())}
          />
          <div className="tooltip absolute bottom-1 mt-1">
            <button
              onClick={enhancePrompt}
              disabled={enhancing || !prompt.trim()}
              className="bg-blue-500 text-white rounded-full p-2 hover:bg-blue-600 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Enhance Prompt"
            >
              {enhancing ? (
                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                </svg>
              )}
            </button>
            <span className="tooltiptext">Enhance Prompt</span>
          </div>
        </div>
      </div>
      <div>
        <label htmlFor="imageSize" className="block text-lg mb-2 font-semibold">
          Image Size
        </label>
        <select
          className="w-full bg-gray-100 text-gray-900 py-3 px-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 transition duration-200"
          id="imageSize"
          name="imageSize"
          value={imageSize}
          onChange={(e) => setImageSize(e.target.value)}
        >
          <option value="square_hd">Square HD</option>
          <option value="square">Square</option>
          <option value="portrait_4_3">Portrait 4:3</option>
          <option value="portrait_16_9">Portrait 16:9</option>
          <option value="landscape_4_3">Landscape 4:3</option>
          <option value="landscape_16_9">Landscape 16:9</option>
        </select>
      </div>
      <div>
        <label htmlFor="qualityOfDetails" className="block text-lg mb-2 font-semibold">
          Quality of Details: {qualityOfDetails}
        </label>
        <input
          type="range"
          className="w-full"
          id="qualityOfDetails"
          name="qualityOfDetails"
          value={qualityOfDetails}
          onChange={(e) => setQualityOfDetails(Number(e.target.value))}
          min="1"
          max="10"
        />
      </div>

      <button
        onClick={generateImage}
        className="w-full bg-gray-900 text-white font-bold py-3 px-6 rounded-lg hover:bg-gray-800 transition duration-200 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-opacity-50"
        disabled={loading || credits < 1}
      >
        {loading ? "Generating..." : `Generate Image (1 credit)`}
      </button>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Error!</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      )}

      <div className="space-y-6">
        <div className="relative">
          {image && (
            <>
              <img src={image.url} alt="Generated" className="w-full rounded-lg shadow-lg" />
              <button
                onClick={downloadImage}
                className="absolute bottom-4 right-4 bg-white text-gray-900 rounded-full p-3 shadow-lg hover:bg-gray-100 transition duration-200"
                aria-label="Download Image"
              >
                <Download size={24} />
              </button>
            </>
          )}
        </div>

        {showAnimationOptions && !videoResult && (
          <div className="space-y-4">
            <div>
              <label htmlFor="movementLevel" className="block text-lg mb-2 font-semibold">
                Movement Level: {movementLevel}
              </label>
              <input
                type="range"
                className="w-full"
                id="movementLevel"
                name="movementLevel"
                value={movementLevel}
                onChange={(e) => setMovementLevel(Number(e.target.value))}
                min="1"
                max="255"
              />
            </div>
            <div>
              <label htmlFor="similarityLevel" className="block text-lg mb-2 font-semibold">
                Similarity to Original: {similarityLevel.toFixed(2)}
              </label>
              <input
                type="range"
                className="w-full"
                id="similarityLevel"
                name="similarityLevel"
                value={similarityLevel}
                onChange={(e) => setSimilarityLevel(Number(e.target.value))}
                min="0"
                max="0.1"
                step="0.01"
              />
            </div>
            <button
              onClick={animateImage}
              className="w-full bg-gray-900 text-white font-bold py-3 px-6 rounded-lg hover:bg-gray-800 transition duration-200 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-opacity-50"
              disabled={loading || credits < 4}
            >
              {loading ? "Animating..." : `Create Animation (4 credits)`}
            </button>
          </div>
        )}

        {videoResult && videoResult.video && (
          <div className="space-y-4">
            <div className="relative">
              <video
                src={videoResult.video.url}
                autoPlay
                loop
                muted
                playsInline
                className="w-full rounded-lg shadow-lg"
              />
              <button
                onClick={downloadVideo}
                className="absolute bottom-4 right-4 bg-white text-gray-900 rounded-full p-3 shadow-lg hover:bg-gray-100 transition duration-200"
                aria-label="Download Video"
              >
                <Download size={24} />
              </button>
            </div>
          </div>
        )}

        {!image && logs.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xl font-bold">Logs</h3>
            <pre className="bg-gray-100 p-4 rounded-lg text-sm text-gray-700 overflow-auto max-h-60">
              {logs.filter(Boolean).join("\n")}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

export default withAuth(Home);
