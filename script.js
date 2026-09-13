const scanButton = document.querySelector(".primary-btn[href='#scanner']");
const cameraButton = document.getElementById("cameraButton");
const captureButton = document.getElementById("captureButton");
const cameraPreview = document.getElementById("cameraPreview");
const cameraPlaceholder = document.getElementById("cameraPlaceholder");
const leafUpload = document.getElementById("leafUpload");
const resultTitle = document.getElementById("resultTitle");
const resultText = document.getElementById("resultText");
const resultState = document.getElementById("resultState");
const confidence = document.getElementById("confidence");
const plantValue = document.getElementById("plantValue");
const severityValue = document.getElementById("severityValue");
const visionValue = document.getElementById("visionValue");
const analysisLoader = document.getElementById("analysisLoader");
const loaderStatus = document.getElementById("loaderStatus");
const loaderTime = document.getElementById("loaderTime");
let cameraStream = null;
let analysisTimer = null;

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => { if (entry.isIntersecting) entry.target.classList.add("visible"); });
}, { threshold: 0.12 });
document.querySelectorAll(".reveal").forEach(el => observer.observe(el));

function getConfidence() { return Math.floor(Math.random() * 18) + 80; }

function showHealthyResult(source = "Leaf image") {
    const score = getConfidence();
    resultState.textContent = "RESULT READY";
    visionValue.textContent = "ANALYZED";
    confidence.textContent = `${score}%`;
    plantValue.textContent = "Healthy";
    severityValue.textContent = "None";
    resultTitle.textContent = "This looks healthy";
    resultText.textContent = `${source} shows no obvious signs of disease in this prototype check.`;
}

function setCameraState(open) {
    captureButton.disabled = !open;
    cameraButton.textContent = open ? "Camera On" : "Open Camera";
}

async function openCamera() {
    if (!navigator.mediaDevices?.getUserMedia) {
        resultState.textContent = "CAMERA UNAVAILABLE";
        resultTitle.textContent = "Camera not supported";
        resultText.textContent = "Use the upload option to choose a leaf photo.";
        return;
    }
    cameraButton.disabled = true;
    cameraButton.textContent = "Opening…";
    try {
        cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
        cameraPreview.srcObject = cameraStream;
        cameraPreview.removeAttribute("src");
        cameraPreview.style.display = "block";
        cameraPlaceholder.style.display = "none";
        cameraButton.disabled = false;
        setCameraState(true);
        resultState.textContent = "CAMERA READY";
        visionValue.textContent = "READY";
        resultTitle.textContent = "Position the leaf";
        resultText.textContent = "Place the leaf inside the frame, then press Capture Leaf.";
    } catch (error) {
        cameraButton.disabled = false;
        setCameraState(false);
        resultState.textContent = "CAMERA UNAVAILABLE";
        resultTitle.textContent = "Camera access needed";
        resultText.textContent = "Allow camera access, or use the upload option instead.";
    }
}

cameraButton.addEventListener("click", () => { if (!cameraStream) openCamera(); });
captureButton.addEventListener("click", captureFromCamera);

function captureFromCamera() {
    if (!cameraStream || cameraPreview.readyState < 2) return;
    const canvas = document.createElement("canvas");
    canvas.width = cameraPreview.videoWidth || 1280;
    canvas.height = cameraPreview.videoHeight || 720;
    canvas.getContext("2d").drawImage(cameraPreview, 0, 0, canvas.width, canvas.height);
    cameraPreview.srcObject = null;
    cameraPreview.src = canvas.toDataURL("image/jpeg", 0.92);
    cameraPreview.style.display = "block";
    cameraStream.getTracks().forEach(track => track.stop());
    cameraStream = null;
    setCameraState(false);
    runAnalysis("Captured leaf");
}

leafUpload.addEventListener("change", (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const imageURL = URL.createObjectURL(file);
    if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        cameraStream = null;
    }
    cameraPreview.srcObject = null;
    cameraPreview.src = imageURL;
    cameraPreview.style.display = "block";
    cameraPlaceholder.style.display = "none";
    setCameraState(false);
    runAnalysis(`Uploaded image “${file.name}”`);
});

function runAnalysis(source) {
    clearInterval(analysisTimer);
    selectedDemoResult = null;
    analysisLoader.classList.add("active");
    analysisLoader.setAttribute("aria-hidden", "false");
    resultState.textContent = "ANALYZING";
    visionValue.textContent = "CHECKING";
    confidence.textContent = "…";
    plantValue.textContent = "—";
    severityValue.textContent = "—";
    resultTitle.textContent = "Checking the leaf…";
    resultText.textContent = "Reading the image and preparing a sample result.";
    const stages = [[0,"Inspecting image"],[900,"Scanning leaf"],[1750,"Extracting data"],[2600,"Checking condition"],[3450,"Preparing result"]];
    stages.forEach(([delay, text]) => setTimeout(() => { if (analysisLoader.classList.contains("active")) loaderStatus.textContent = text; }, delay));
    let elapsed = 0;
    loaderTime.textContent = "0s";
    analysisTimer = setInterval(() => { elapsed += 1; loaderTime.textContent = `${elapsed}s`; }, 1000);
    setTimeout(() => {
        clearInterval(analysisTimer);
        analysisLoader.classList.remove("active");
        analysisLoader.setAttribute("aria-hidden", "true");
        if (selectedDemoResult) {
            applyDemoResult(selectedDemoResult, source);
        } else {
            applyDemoResult('1', source);
        }
        selectedDemoResult = null;
    }, 3600);
}

scanButton?.addEventListener("click", () => { setTimeout(() => leafUpload.focus(), 400); });

// Demo controls: choose the sample result while the analysis is running.
const demoResults = {
    '1': { title: 'This looks healthy', text: 'The leaf appears healthy with no obvious signs of disease in this demo check.', condition: 'Healthy', severity: 'None', vision: 'ANALYZED' },
    '2': { title: 'Semi diseased', text: 'Some signs of disease were detected. The leaf may need closer inspection.', condition: 'Semi diseased', severity: 'Mild', vision: 'ANALYZED' },
    '3': { title: 'Diseased leaf detected', text: 'Clear signs of disease were detected across parts of the leaf. Further inspection is recommended.', condition: 'Diseased', severity: 'High', vision: 'ANALYZED' }
};
let selectedDemoResult = null;

function applyDemoResult(key, source = 'Leaf image') {
    const result = demoResults[key];
    if (!result) return;
    selectedDemoResult = key;
    const score = getConfidence();
    resultState.textContent = 'RESULT READY';
    visionValue.textContent = result.vision;
    confidence.textContent = `${score}%`;
    plantValue.textContent = result.condition;
    severityValue.textContent = result.severity;
    resultTitle.textContent = result.title;
    resultText.textContent = `${source}: ${result.text}`;
}

window.addEventListener('keydown', (event) => {
    if (!analysisLoader.classList.contains('active')) return;
    if (!demoResults[event.key]) return;
    event.preventDefault();
    applyDemoResult(event.key);
    // Secret keyboard selection: keep the normal analysis status visible.
});

// The footer intentionally uses the same full-page background as the rest of the site.
