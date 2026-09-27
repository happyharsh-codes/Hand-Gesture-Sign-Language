"use client"
import "./page.css"
import "../globals.css"

import Navbar from "@/components/navbar"
import Footer from "@/components/footer"
import { useEffect, useRef, useState } from "react"

export default function Page() {

    const previewVideoRef = useRef();
    const playbackVideoRef = useRef();
    const startBtnRef = useRef();
    const stopBtnRef = useRef();
    const loadBtnRef = useRef();
    const errorOverlayRef = useRef();

    let [mediaRecorder, setMediaRecorder] = useState(null);
    let [recordedChunks, setRecordedChunks] = useState([]);
    let [localStream, setLoacalStream] = useState(null);


    const showError = (errorName) => {
        if (!errorOverlayRef.current) return;
        errorOverlayRef.current.style.display = "flex";
        const textbox = document.getElementById("errorText");
        textbox.textContent = errorName;
    };

    const clearError = () => {
        if (!errorOverlayRef.current) return;
        errorOverlayRef.current.style.display = "none";
    };

    useEffect(() => {
        clearError();
    });


    const startLiveRecording = async () => {
        setRecordedChunks([]);
        
        // Explicit Mobile and universal constraints checklist

        const constraints = {
            video: {
                facingMode: "user",
                width: {ideal: 640},
                height: {ideal: 480}
            },
            audio: true
        };

        try{
            //Permission ask here
            localStream = await navigator.mediaDevices.getUserMedia(constraints);
            previewVideoRef.current.srcObject = localStream;

            let options = {mimeType: 'video/webm;codecs=vp9'};
            if(!MediaRecorder.isTypeSupported(options.mimeType)){
                options = {mimeType: 'video/webm;codecs=vp8'};
                if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                    options = {mimeType: 'video/mp4'}; //fallback for safari/ ios
                }
            }

            mediaRecorder = new MediaRecorder(localStream, options);

            mediaRecorder.ondataavailable = (event) => {
                if (event.data && event.data.size > 0) {
                    setRecordedChunks( prev => prev.push(event.data));
                }
            }

            mediaRecorder.onstop = async () => {
                const videoBlob = new blob(reocordedChunks, { type: options.mimeType});
                await uploadVideoToServer(videoBlob);
            }

            mediaRecorder.start(1000)
            startBtnRef.current.disabled = true;
            stopBtnRef.current.disabled = false;

        } catch (err) {

            if (err.name === "NOtAllowedError" || err.name === 'PemissionDeniedError') {
                showError("🚫 Camera/Microphone access denied. Please change your mobile site permissions settings to allow access.");
            } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
                showError("⚠️ No camera hardware or audio recording device found on this system.");
            } else {
                showError(`❌ System error: ${err.message}`);
            }
            
        }
    }

    const stopLiveRecording = () => {
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
        }
        if (localStream) {
            localStream.getTracks().forEach(track => track.stop()); // Explicitly turn off the active camera hardware lens light
        }
        if (!startBtnRef.current || !stopBtnRef.current) return;
        startBtnRef.current.disabled = false;
        stopBtnRef.current.disabled = true;
    };

    return (
        <>
            <Navbar />
            <main>
                <div ref={errorOverlayRef} className="error-overlay">
                    <div className="error-box">
                        <section className="tab">
                            <div className="close">
                                <button className="close-btn" onClick={clearError}>X</button>
                            </div>
                        </section>
                        <section className="text">
                            <p id="errorText"></p>
                            <p>:/</p>
                        </section>
                    </div>
                </div>
                <div className="video-container">
                    <div className="box">
                        <h3>Live Recorder🔴</h3>
                        <video ref={previewVideoRef} id="preview" className="videoplayer" autoplay playsInline muded></video>
                        <div className="controls">
                        <button ref={startBtnRef} id="startBtn" className="control-btn" onClick={startLiveRecording}>Start Camera & Recording</button>
                        <button ref={stopBtnRef} id="stopBtn" className="control-btn" onClick={stopLiveRecording} disabled>Stop Camera & Save</button>
                        </div>
                    </div>

                    <div className="box">
                        <h3>Database Retrieval Player🟢</h3>
                        <video ref={playbackVideoRef} id="playback" className="videoplayer" autoplay playsInline muded></video>
                        <div className="control">
                        <button ref={loadBtnRef} id="loadBtn" className="control-btn">Load Latest Recording</button>
                        </div>
                    </div>
                </div>

            </main>
            <Footer />
        </>
    )
}