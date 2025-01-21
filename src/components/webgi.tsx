import { useRef, useEffect, useState } from "react";
import {
  addBasePlugins,
  AssetManagerBasicPopupPlugin,
  ViewerApp,
  FileTransferPlugin,
  CanvasSnipperPlugin,
  TweakpaneUiPlugin,
  TonemapPlugin,
  GBufferPlugin,
  ProgressivePlugin,
  GammaCorrectionPlugin,
  SSRPlugin,
  SSAOPlugin,
  DiamondPlugin,
  GLTFAnimationPlugin,
  GroundPlugin,
  BloomPlugin,
  AnisotropyPlugin,
  MaterialConfiguratorPlugin,
  InteractionPromptPlugin,
} from "webgi";
import { FaceMesh } from "@mediapipe/face_mesh";
import { Camera } from "@mediapipe/camera_utils";

export const WebgiComp = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const faceMeshRef = useRef<FaceMesh | null>(null);
  const viewerRef = useRef<ViewerApp | null>(null);
  const [debugInfo, setDebugInfo] = useState<string[]>([]);
  const [showCamera, setShowCamera] = useState(false);

  const currentRotation = useRef(0);
  const modelRef = useRef<any>(null);
  const rotationHistory = useRef<number[]>([]);
  const historyLength = 5;
  const smoothingFactor = 0.5;
  const deadZoneThreshold = 0.08;

  const logDebug = (message: string) => {
    setDebugInfo((prev) => [...prev, message].slice(-5));
  };

  useEffect(() => {
    let camera: Camera | null = null;
    let animationFrameId: number | null = null;

    async function setupFaceTracking() {
      if (!videoRef.current || !viewerRef.current) return;

      const faceMesh = new FaceMesh({
        locateFile: (file) =>
          `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
      });

      faceMeshRef.current = faceMesh;

      faceMesh.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      faceMesh.onResults((results) => {
        if (results.multiFaceLandmarks.length > 0 && modelRef.current) {
          const face = results.multiFaceLandmarks[0];

          const noseTip = face[1];
          const leftEye = face[40];
          const rightEye = face[269];

          const eyeMidpoint = {
            x: (leftEye.x + rightEye.x) / 2,
            y: (leftEye.y + rightEye.y) / 2,
          };

          const headTilt = noseTip.x - eyeMidpoint.x;
          const targetRotation = headTilt * 15;

          if (
            Math.abs(targetRotation - currentRotation.current) >
            deadZoneThreshold
          ) {
            rotationHistory.current.push(targetRotation);
            if (rotationHistory.current.length > historyLength) {
              rotationHistory.current.shift();
            }

            const averageRotation =
              rotationHistory.current.reduce((a, b) => a + b, 0) /
              rotationHistory.current.length;

            currentRotation.current +=
              (averageRotation - currentRotation.current) * smoothingFactor;

            modelRef.current.rotation.y = currentRotation.current;

            if (viewerRef.current?.scene) {
              viewerRef.current.scene.setDirty();
            }

            logDebug(
              `Model rotation: ${(
                (currentRotation.current * 180) /
                Math.PI
              ).toFixed(2)}°`
            );
          }
        }
      });

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 320, height: 240 },
        });
        videoRef.current.srcObject = stream;
        videoRef.current.play();

        camera = new Camera(videoRef.current, {
          onFrame: async () => {
            if (animationFrameId === null) {
              animationFrameId = requestAnimationFrame(async () => {
                await faceMesh.send({ image: videoRef.current! });
                animationFrameId = null;
              });
            }
          },
          width: 320,
          height: 240,
        });

        camera.start();
        logDebug("Face tracking initialized successfully");
      } catch (error) {
        logDebug(
          `Error setting up face tracking: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    }

    async function setupViewer() {
      logDebug("Initializing WebGI Viewer");

      const viewer = new ViewerApp({
        canvas: canvasRef.current || undefined,
      });

      viewerRef.current = viewer;

      try {
        if (
          !viewer.getPlugin(GBufferPlugin as any) as unknown as GBufferPlugin
        ) {
          (await viewer.addPlugin(
            GBufferPlugin as any
          )) as unknown as GBufferPlugin;
        }
        if (
          !viewer.getPlugin(
            ProgressivePlugin as any
          ) as unknown as ProgressivePlugin
        ) {
          (await viewer.addPlugin(
            new ProgressivePlugin(16) as any
          )) as unknown as ProgressivePlugin;
        }
        if (
          !viewer.getPlugin(
            GammaCorrectionPlugin as any
          ) as unknown as GammaCorrectionPlugin
        ) {
          (await viewer.addPlugin(
            GammaCorrectionPlugin as any
          )) as unknown as GammaCorrectionPlugin;
        }

        if (!viewer.getPlugin(SSRPlugin as any) as unknown as SSRPlugin) {
          (await viewer.addPlugin(SSRPlugin as any)) as unknown as SSRPlugin;
        }
        if (!viewer.getPlugin(SSAOPlugin as any) as unknown as SSAOPlugin) {
          (await viewer.addPlugin(SSAOPlugin as any)) as unknown as SSAOPlugin;
        }
        if (
          !viewer.getPlugin(DiamondPlugin as any) as unknown as DiamondPlugin
        ) {
          (await viewer.addPlugin(
            DiamondPlugin as any
          )) as unknown as DiamondPlugin;
        }
        if (
          !viewer.getPlugin(
            GLTFAnimationPlugin as any
          ) as unknown as GLTFAnimationPlugin
        ) {
          (await viewer.addPlugin(
            GLTFAnimationPlugin as any
          )) as unknown as GLTFAnimationPlugin;
        }
        if (!viewer.getPlugin(GroundPlugin as any) as unknown as GroundPlugin) {
          (await viewer.addPlugin(
            GroundPlugin as any
          )) as unknown as GroundPlugin;
        }
        if (!viewer.getPlugin(BloomPlugin as any) as unknown as BloomPlugin) {
          (await viewer.addPlugin(
            BloomPlugin as any
          )) as unknown as BloomPlugin;
        }
        if (
          !viewer.getPlugin(
            AnisotropyPlugin as any
          ) as unknown as AnisotropyPlugin
        ) {
          (await viewer.addPlugin(
            AnisotropyPlugin as any
          )) as unknown as AnisotropyPlugin;
        }
        if (
          !viewer.getPlugin(
            MaterialConfiguratorPlugin as any
          ) as unknown as MaterialConfiguratorPlugin
        ) {
          (await viewer.addPlugin(
            MaterialConfiguratorPlugin as any
          )) as unknown as MaterialConfiguratorPlugin;
        }

        if (
          !viewer.getPlugin(
            AssetManagerBasicPopupPlugin as any
          ) as unknown as AssetManagerBasicPopupPlugin
        ) {
          (await viewer.addPlugin(
            AssetManagerBasicPopupPlugin as any
          )) as unknown as AssetManagerBasicPopupPlugin;
        }
        if (
          !viewer.getPlugin(
            FileTransferPlugin as any
          ) as unknown as FileTransferPlugin
        ) {
          (await viewer.addPlugin(
            FileTransferPlugin as any
          )) as unknown as FileTransferPlugin;
        }
        if (
          !viewer.getPlugin(
            CanvasSnipperPlugin as any
          ) as unknown as CanvasSnipperPlugin
        ) {
          (await viewer.addPlugin(
            CanvasSnipperPlugin as any
          )) as unknown as CanvasSnipperPlugin;
        }
        await addBasePlugins(viewer as any);
        viewer.renderer.refreshPipeline();
        logDebug("Loading GLB model");
        const model = await viewer.load("realvwr-demo-solitair.glb");
        modelRef.current = model.modelObject;
        logDebug("GLB model loaded successfully");

        if (viewer.scene?.activeCamera) {
          viewer.scene.activeCamera.position.set(0, 0, 5);
          viewer.scene.setDirty();
          viewer.plugins;
          console.log(viewer.plugins, "viewer");
        }

        const uiPlugin = await viewer.addPlugin(TweakpaneUiPlugin as any);
        uiPlugin.setupPlugins(
          TonemapPlugin,
          CanvasSnipperPlugin,
          GroundPlugin,
          BloomPlugin,
          AnisotropyPlugin,
          MaterialConfiguratorPlugin,
          GLTFAnimationPlugin,
          DiamondPlugin,
          SSAOPlugin,
          SSRPlugin,
          GammaCorrectionPlugin
        );

        const groundPlugin = viewer.getPlugin(
          GroundPlugin as any
        ) as unknown as GroundPlugin;
        if (groundPlugin) {
          groundPlugin.bakedShadows = false;
          groundPlugin.physicalReflections = true;
        }
        const pointerPlugin = viewer.getPlugin(
          InteractionPromptPlugin as any
        ) as unknown as InteractionPromptPlugin;
        if (pointerPlugin) {
          pointerPlugin.enabled = false;
          console.log(pointerPlugin, "pointerPlugin");
        }

        await setupFaceTracking();
      } catch (error) {
        logDebug(
          `ERROR during setup: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    }

    setupViewer();

    return () => {
      camera?.stop();
      faceMeshRef.current?.close();
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, []);

  return (
    <div id="webgi-canvas-container" className="w-full h-full relative">
      {/* Video element for camera view */}
      <video
        ref={videoRef}
        style={{
          position: "absolute",
          top: 20, // 20px from the top
          left: "50%", // Center horizontally
          transform: "translateX(-50%)", // Adjust for exact centering
          width: 160,
          height: 120,
          borderRadius: "8px",
          border: "2px solid white",
          zIndex: 10,
          display: showCamera ? "block" : "none", // Toggle visibility
        }}
      />
      {/* Canvas for WebGI */}
      <canvas
        id="webgi-canvas"
        className="w-full h-screen"
        ref={canvasRef}
      ></canvas>
      {/* Debug log */}
      <div
        style={{
          position: "absolute",
          top: 150,
          left: 10,
          color: "white",
          backgroundColor: "rgba(0,0,0,0.7)",
          padding: "10px",
          borderRadius: "5px",
        }}
      >
        <strong>Debug Log:</strong>
        {debugInfo.map((msg, index) => (
          <div key={index}>{msg}</div>
        ))}
      </div>
      {/* Toggle button for camera visibility */}
      <button
        style={{
          position: "absolute",
          top: 20,
          left: "18%",
          transform: "translateX(-50%)",
          padding: "8px 16px",
          backgroundColor: "rgba(0,0,0,0.7)",
          color: "white",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer",
          zIndex: 10,
        }}
        onClick={() => setShowCamera(!showCamera)}
      >
        {showCamera ? "Hide Camera" : "Show Camera"}
      </button>
    </div>
  );
};
