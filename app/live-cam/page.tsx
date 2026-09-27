"use client";

import "./page.css";
import "../globals.css";

import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import { useCallback, useEffect, useRef, useState } from "react";

export default function Page() {
    // --------------------------------------------------
    // Video / button refs
    // --------------------------------------------------

    const previewVideoRef = useRef<HTMLVideoElement | null>(null);
    const playbackVideoRef = useRef<HTMLVideoElement | null>(null);

    const startBtnRef = useRef<HTMLButtonElement | null>(null);
    const stopBtnRef = useRef<HTMLButtonElement | null>(null);
    const loadBtnRef = useRef<HTMLButtonElement | null>(null);

    const errorOverlayRef = useRef<HTMLDivElement | null>(null);

    // --------------------------------------------------
    // Media refs
    // --------------------------------------------------

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);

    const localStreamRef = useRef<MediaStream | null>(null);

    const recordedChunksRef = useRef<Blob[]>([]);

    // Keep the MIME type used by MediaRecorder
    const mimeTypeRef = useRef<string>("");

    // --------------------------------------------------
    // UI state
    // --------------------------------------------------

    const [isRecording, setIsRecording] = useState<boolean>(false);

    const [isUploading, setIsUploading] = useState<boolean>(false);

    // --------------------------------------------------
    // Error handling
    // --------------------------------------------------

    const showError = useCallback((message: string): void => {
        if (!errorOverlayRef.current) {
            return;
        }

        errorOverlayRef.current.style.display = "flex";

        const textbox = document.getElementById("errorText");

        if (textbox) {
            textbox.textContent = message;
        }
    }, []);

    const clearError = useCallback((): void => {
        if (!errorOverlayRef.current) {
            return;
        }

        errorOverlayRef.current.style.display = "none";

        const textbox = document.getElementById("errorText");

        if (textbox) {
            textbox.textContent = "";
        }
    }, []);

    // --------------------------------------------------
    // Select supported MediaRecorder MIME type
    // --------------------------------------------------

    const getSupportedMimeType = (): string => {
        const mimeTypes: string[] = [
            "video/webm;codecs=vp9,opus",
            "video/webm;codecs=vp8,opus",
            "video/webm",
            "video/mp4",
        ];

        for (const mimeType of mimeTypes) {
            if (MediaRecorder.isTypeSupported(mimeType)) {
                return mimeType;
            }
        }

        return "";
    };

    // --------------------------------------------------
    // Upload video
    // --------------------------------------------------

    const uploadVideoToServer = async (
        videoBlob: Blob
    ): Promise<void> => {
        try {
            setIsUploading(true);

            const extension = videoBlob.type.includes("mp4")
                ? "mp4"
                : "webm";

            const file = new File(
                [videoBlob],
                `recording-${Date.now()}.${extension}`,
                {
                    type: videoBlob.type,
                }
            );

            const formData = new FormData();

            formData.append("video", file);

            /*
             * Replace this URL with your actual API endpoint.
             *
             * Example:
             *
             * const response = await fetch("/api/upload", {
             *     method: "POST",
             *     body: formData,
             * });
             */

            console.log("Video ready for upload:", file);
            console.log("Video type:", videoBlob.type);
            console.log("Video size:", videoBlob.size);

            /*
            const response = await fetch("/api/upload", {
                method: "POST",
                body: formData,
            });

            if (!response.ok) {
                throw new Error("Failed to upload video");
            }

            const result = await response.json();

            console.log("Upload successful:", result);
            */

        } catch (error: unknown) {
            console.error("Upload error:", error);

            if (error instanceof Error) {
                showError(`❌ Upload failed: ${error.message}`);
            } else {
                showError("❌ Failed to upload video.");
            }
        } finally {
            setIsUploading(false);
        }
    };

    // --------------------------------------------------
    // Start recording
    // --------------------------------------------------

    const startLiveRecording = async (): Promise<void> => {
        clearError();

        // Prevent starting twice
        if (mediaRecorderRef.current) {
            return;
        }

        // Clear previous recording chunks
        recordedChunksRef.current = [];

        const constraints: MediaStreamConstraints = {
            video: {
                facingMode: "user",
                width: {
                    ideal: 640,
                },
                height: {
                    ideal: 480,
                },
            },
            audio: true,
        };

        try {
            // ------------------------------------------
            // Request camera + microphone permission
            // ------------------------------------------

            const stream =
                await navigator.mediaDevices.getUserMedia(
                    constraints
                );

            localStreamRef.current = stream;

            // ------------------------------------------
            // Show camera preview
            // ------------------------------------------

            if (previewVideoRef.current) {
                previewVideoRef.current.srcObject = stream;

                try {
                    await previewVideoRef.current.play();
                } catch (error) {
                    console.warn(
                        "Video autoplay was prevented:",
                        error
                    );
                }
            }

            // ------------------------------------------
            // Find supported MIME type
            // ------------------------------------------

            const mimeType = getSupportedMimeType();

            mimeTypeRef.current = mimeType;

            let recorder: MediaRecorder;

            if (mimeType) {
                recorder = new MediaRecorder(stream, {
                    mimeType,
                });
            } else {
                // Let the browser choose its default format
                recorder = new MediaRecorder(stream);
            }

            mediaRecorderRef.current = recorder;

            // ------------------------------------------
            // Receive recorded chunks
            // ------------------------------------------

            recorder.ondataavailable = (
                event: BlobEvent
            ): void => {
                if (
                    event.data &&
                    event.data.size > 0
                ) {
                    recordedChunksRef.current.push(
                        event.data
                    );
                }
            };

            // ------------------------------------------
            // Recording stopped
            // ------------------------------------------

            recorder.onstop = async (): Promise<void> => {
                try {
                    const chunks =
                        recordedChunksRef.current;

                    if (chunks.length === 0) {
                        showError(
                            "❌ No video data was recorded."
                        );
                        return;
                    }

                    const videoType =
                        mimeTypeRef.current ||
                        chunks[0].type ||
                        "video/webm";

                    const videoBlob = new Blob(
                        chunks,
                        {
                            type: videoType,
                        }
                    );

                    console.log(
                        "Recording complete:",
                        videoBlob.size,
                        "bytes"
                    );

                    // Upload recording
                    await uploadVideoToServer(
                        videoBlob
                    );
                } catch (error: unknown) {
                    console.error(
                        "Processing error:",
                        error
                    );

                    if (error instanceof Error) {
                        showError(
                            `❌ Recording processing failed: ${error.message}`
                        );
                    } else {
                        showError(
                            "❌ Recording processing failed."
                        );
                    }
                } finally {
                    recordedChunksRef.current = [];
                    mediaRecorderRef.current = null;
                }
            };

            // ------------------------------------------
            // Recorder error
            // ------------------------------------------

            recorder.onerror = (
                event: Event
            ): void => {
                console.error(
                    "MediaRecorder error:",
                    event
                );

                showError(
                    "❌ An error occurred while recording."
                );
            };

            // ------------------------------------------
            // Start recording
            // ------------------------------------------

            recorder.start(1000);

            setIsRecording(true);

        } catch (error: unknown) {
            console.error(
                "Camera initialization error:",
                error
            );

            // ------------------------------------------
            // Clean up stream if something failed
            // ------------------------------------------

            if (localStreamRef.current) {
                localStreamRef.current
                    .getTracks()
                    .forEach((track) => {
                        track.stop();
                    });

                localStreamRef.current = null;
            }

            if (previewVideoRef.current) {
                previewVideoRef.current.srcObject = null;
            }

            // ------------------------------------------
            // Handle browser errors
            // ------------------------------------------

            if (error instanceof DOMException) {
                switch (error.name) {
                    case "NotAllowedError":
                        showError(
                            "🚫 Camera/Microphone access denied. Please allow camera and microphone permissions in your browser settings."
                        );
                        break;

                    case "PermissionDeniedError":
                        showError(
                            "🚫 Camera/Microphone permission was denied."
                        );
                        break;

                    case "NotFoundError":
                        showError(
                            "⚠️ No camera or microphone was found on this device."
                        );
                        break;

                    case "NotReadableError":
                        showError(
                            "⚠️ Camera or microphone is already being used by another application."
                        );
                        break;

                    case "OverconstrainedError":
                        showError(
                            "⚠️ The requested camera settings are not supported by this device."
                        );
                        break;

                    case "SecurityError":
                        showError(
                            "🔒 Camera access is blocked for security reasons. Make sure you are using HTTPS or localhost."
                        );
                        break;

                    case "AbortError":
                        showError(
                            "⚠️ Camera access was interrupted."
                        );
                        break;

                    default:
                        showError(
                            `❌ System error: ${error.message}`
                        );
                }
            } else if (error instanceof Error) {
                showError(
                    `❌ System error: ${error.message}`
                );
            } else {
                showError(
                    "❌ An unknown system error occurred."
                );
            }
        }
    };

    // --------------------------------------------------
    // Stop recording
    // --------------------------------------------------

    const stopLiveRecording = (): void => {
        const recorder =
            mediaRecorderRef.current;

        // Ask MediaRecorder to finish recording
        if (
            recorder &&
            recorder.state !== "inactive"
        ) {
            recorder.stop();
        }

        // Turn off camera + microphone
        if (localStreamRef.current) {
            localStreamRef.current
                .getTracks()
                .forEach((track) => {
                    track.stop();
                });

            localStreamRef.current = null;
        }

        // Remove camera preview
        if (previewVideoRef.current) {
            previewVideoRef.current.srcObject = null;
        }

        setIsRecording(false);
    };

    // --------------------------------------------------
    // Load latest recording
    // --------------------------------------------------

    const loadLatestRecording = async (): Promise<void> => {
        try {
            clearError();

            /*
             * Replace this with your actual API endpoint.
             *
             * Example:
             *
             * const response = await fetch(
             *     "/api/videos/latest"
             * );
             *
             * if (!response.ok) {
             *     throw new Error(
             *         "Failed to retrieve video"
             *     );
             * }
             *
             * const blob = await response.blob();
             *
             * const videoUrl =
             *     URL.createObjectURL(blob);
             *
             * if (playbackVideoRef.current) {
             *     playbackVideoRef.current.src =
             *         videoUrl;
             * }
             */

            console.log(
                "Load latest recording clicked"
            );

        } catch (error: unknown) {
            console.error(
                "Playback error:",
                error
            );

            if (error instanceof Error) {
                showError(
                    `❌ Failed to load recording: ${error.message}`
                );
            } else {
                showError(
                    "❌ Failed to load recording."
                );
            }
        }
    };

    // --------------------------------------------------
    // Cleanup when component unmounts
    // --------------------------------------------------

    useEffect(() => {
        return () => {
            // Stop MediaRecorder
            const recorder =
                mediaRecorderRef.current;

            if (
                recorder &&
                recorder.state !== "inactive"
            ) {
                recorder.stop();
            }

            // Stop camera + microphone
            const stream =
                localStreamRef.current;

            if (stream) {
                stream
                    .getTracks()
                    .forEach((track) => {
                        track.stop();
                    });
            }

            // Remove video source
            if (previewVideoRef.current) {
                previewVideoRef.current.srcObject =
                    null;
            }

            mediaRecorderRef.current = null;
            localStreamRef.current = null;
            recordedChunksRef.current = [];
        };
    }, []);

    // --------------------------------------------------
    // JSX
    // --------------------------------------------------

    return (
        <>
            <Navbar />

            <main>
                {/* ------------------------------------- */}
                {/* Error overlay */}
                {/* ------------------------------------- */}

                <div
                    ref={errorOverlayRef}
                    className="error-overlay"
                    style={{
                        display: "none",
                    }}
                >
                    <div className="error-box">
                        <section className="tab">
                            <div className="close">
                                <button
                                    type="button"
                                    className="close-btn"
                                    onClick={clearError}
                                >
                                    X
                                </button>
                            </div>
                        </section>

                        <section className="text">
                            <p id="errorText"></p>
                            <p>:/</p>
                        </section>
                    </div>
                </div>

                {/* ------------------------------------- */}
                {/* Video containers */}
                {/* ------------------------------------- */}

                <div className="video-container">
                    {/* ================================= */}
                    {/* Live recorder */}
                    {/* ================================= */}

                    <div className="box">
                        <h3>
                            Live Recorder 🔴
                        </h3>

                        <video
                            ref={previewVideoRef}
                            id="preview"
                            className="videoplayer"
                            autoPlay
                            playsInline
                            muted
                        />

                        <div className="controls">
                            <button
                                ref={startBtnRef}
                                id="startBtn"
                                type="button"
                                className="control-btn"
                                onClick={
                                    startLiveRecording
                                }
                                disabled={
                                    isRecording ||
                                    isUploading
                                }
                            >
                                {isRecording
                                    ? "Recording..."
                                    : "Start Camera & Recording"}
                            </button>

                            <button
                                ref={stopBtnRef}
                                id="stopBtn"
                                type="button"
                                className="control-btn"
                                onClick={
                                    stopLiveRecording
                                }
                                disabled={!isRecording}
                            >
                                Stop Camera & Save
                            </button>
                        </div>

                        {isUploading && (
                            <p>
                                Uploading recording...
                            </p>
                        )}
                    </div>

                    {/* ================================= */}
                    {/* Database playback */}
                    {/* ================================= */}

                    <div className="box">
                        <h3>
                            Database Retrieval Player 🟢
                        </h3>

                        <video
                            ref={playbackVideoRef}
                            id="playback"
                            className="videoplayer"
                            controls
                            playsInline
                        />

                        <div className="control">
                            <button
                                ref={loadBtnRef}
                                id="loadBtn"
                                type="button"
                                className="control-btn"
                                onClick={
                                    loadLatestRecording
                                }
                                disabled={isUploading}
                            >
                                Load Latest Recording
                            </button>
                        </div>
                    </div>
                </div>
            </main>

            <Footer />
        </>
    );
}
