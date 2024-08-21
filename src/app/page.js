'use client'

import { useState, useMemo, useEffect } from 'react';
import { withAuth } from '../components/ProtectedRoute';
import * as fal from "@fal-ai/serverless-client";
import { Download } from "lucide-react";
import { useAuth } from '../context/FirebaseAuthContext';
import { updateUserCredits } from '../firebase/clientApp';

fal.config({
  credentials: process.env.FAL_KEY_SECRET,
  proxyUrl: "/api/fal/proxy", // the built-in nextjs proxy
  // proxyUrl: 'http://localhost:3333/api/fal/proxy', // or your own external proxy
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

  const { user, credits, updateCredits } = useAuth();

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

      // Deduct 1 credit and update Firestore
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

      // Deduct 4 credits and update Firestore
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

  const downloadImage = () => {
    if (image) {
      const link = document.createElement('a');
      link.href = image.url;
      link.download = 'generated-image.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const downloadVideo = () => {
    if (videoResult && videoResult.video) {
      fetch(videoResult.video.url)
        .then(response => response.blob())
        .then(blob => {
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = 'animated-video.mp4';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
        })
        .catch(error => {
          console.error('Error downloading video:', error);
          setError(error.message);
        });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <label htmlFor="prompt" className="block text-lg mb-2 font-semibold">
          Prompt
        </label>
        <textarea
          className="w-full bg-gray-100 text-gray-900 placeholder-gray-500 py-3 px-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 transition duration-200 resize-none min-h-[120px]"
          id="prompt"
          name="prompt"
          placeholder="Describe your image..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onBlur={(e) => setPrompt(e.target.value.trim())}
          rows="3"
        />
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