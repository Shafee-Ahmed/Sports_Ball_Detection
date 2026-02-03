// public/script.js
const MODEL_URL = "./my_model/"; // Renamed to avoid conflict with global URL object
let model, webcam, resultDiv, priceDiv;
let lastSpoken = '';

const PRICES = {
    'american_football': 2500,
    'baseball': 300,
    'basketball': 2000,
    'billiard_ball': 150,
    'bowling_ball': 8000,
    'cricket_ball': 400,
    'golf_ball': 500,
    'hockey_puck': 80,
    'shuttlecock': 50,
    'table_tennis_ball': 40,
    'tennis_ball': 120,
    'volleyball': 800,
    'soccer_ball': 1800,
    'rugby_ball': 2200,
    'beach_ball': 300
};

async function loadModel() {
    const modelURL = MODEL_URL + "model.json";
    const metadataURL = MODEL_URL + "metadata.json";
    model = await tmImage.load(modelURL, metadataURL);
}

function normalizeKey(name) {
    if (!name) return '';
    return name.toString()
        .toLowerCase()
        .replace(/\s+/g, '_')      // spaces -> underscore
        .replace(/-+/g, '_')       // hyphens -> underscore
        .replace(/[^\w_]/g, '')    // remove non-word except underscore
        .replace(/__+/g, '_')      // collapse double underscores
        .trim();
}

// simple Levenshtein distance
function levenshtein(a, b) {
    const m = a.length, n = b.length;
    if (m === 0) return n;
    if (n === 0) return m;
    const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;
            dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
        }
    }
    return dp[m][n];
}

// alias map for common misspellings / synonyms
const ALIASES = {
    'volly': 'volleyball',
    'volley': 'volleyball',
    'footbal': 'american_football',
    'soccer': 'soccer_ball',
    'tabletennis': 'table_tennis_ball',
    'ttball': 'table_tennis_ball'
    // add more as needed
};

// try exact normalized lookup, then fallback fuzzy match
function findPriceForClass(className) {
    const key = normalizeKey(className);
    // check aliases first
    if (ALIASES.hasOwnProperty(key)) {
        const mapped = ALIASES[key];
        if (PRICES.hasOwnProperty(mapped)) return { key: mapped, price: PRICES[mapped] };
    }
    if (PRICES.hasOwnProperty(key)) return { key, price: PRICES[key] };

    // fallback fuzzy match using Levenshtein distance
    let best = { key: null, dist: Infinity };
    for (const k of Object.keys(PRICES)) {
        const d = levenshtein(k, key);
        if (d < best.dist) best = { key: k, dist: d };
    }

    // choose best match if distance small relative to length
    if (best.key) {
        const maxAllowed = Math.max(1, Math.floor(key.length * 0.4)); // allow ~40% edits
        if (best.dist <= maxAllowed) {
            console.log(`Fuzzy matched "${className}" -> "${best.key}" (dist=${best.dist})`);
            return { key: best.key, price: PRICES[best.key] };
        }
    }

    // final fallback: partial inclusion match
    for (const k of Object.keys(PRICES)) {
        if (k.includes(key) || key.includes(k)) return { key: k, price: PRICES[k] };
    }

    return { key: null, price: null };
}

// try exact normalized lookup, then fallback fuzzy match
function findPriceForClass(className) {
    const key = normalizeKey(className);
    if (PRICES.hasOwnProperty(key)) return { key, price: PRICES[key] };

    // fallback: try to match any price key that includes the normalized className or vice versa
    for (const k of Object.keys(PRICES)) {
        if (k.includes(key) || key.includes(k)) return { key: k, price: PRICES[k] };
    }
    // nothing matched
    return { key: null, price: null };
}

// Webcam setup and prediction
async function startWebcam() {
    // Quick secure-context hint
    if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
        console.warn('Camera may be blocked on non-HTTPS origins. For local testing use http://localhost:3000 or an HTTPS tunnel (ngrok/localtunnel).');
    }

    // Explicitly request permission to surface errors immediately
    try {
        await navigator.mediaDevices.getUserMedia({ video: true });
    } catch (err) {
        console.error('Camera permission denied or unavailable:', err);
        if (resultDiv) resultDiv.innerText = 'Camera permission denied or unavailable: ' + (err && err.message ? err.message : err);
        return;
    }

    webcam = new tmImage.Webcam(640, 480, true);
    await webcam.setup();
    await webcam.play();

    // Prefer appending the tmImage canvas (more reliable cross-browser)
    const container = document.getElementById('webcam') || document.getElementById('webcam-container');
    if (!container) {
        console.error('Missing element to attach webcam canvas. Ensure #webcam or #webcam-container exists in index.html.');
        return;
    }
    container.innerHTML = '';
    container.appendChild(webcam.canvas);

    window.requestAnimationFrame(webcamLoop);
}

async function webcamLoop() {
    webcam.update();
    if (!model) return;
    const prediction = await model.predict(webcam.canvas);
    displayPrediction(prediction);
    window.requestAnimationFrame(webcamLoop);
}

// Upload image prediction
async function handleUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    const img = document.getElementById('preview');
    try {
        img.src = window.URL.createObjectURL(file); // Use window.URL to be explicit
    } catch (error) {
        console.error('Error creating object URL:', error);
        if (resultDiv) resultDiv.innerText = 'Failed to load image. Try another file.';
        return;
    }
    img.onload = async () => {
        if (!model) {
            console.warn('Model not loaded yet');
            return;
        }
        const prediction = await model.predict(img);
        displayPrediction(prediction);
    };
}

// Display result and price
function displayPrediction(prediction) {
    if (!prediction || prediction.length === 0) return;
    let topClass = prediction[0].className;
    let topProbability = prediction[0].probability;
    for (let i = 1; i < prediction.length; i++) {
        if (prediction[i].probability > topProbability) {
            topClass = prediction[i].className;
            topProbability = prediction[i].probability;
        }
    }

    console.log('Top prediction:', topClass, 'confidence:', topProbability);
    if (resultDiv) resultDiv.innerText = `Detected: ${topClass} (Confidence: ${(topProbability * 100).toFixed(2)}%)`;

    const lookup = findPriceForClass(topClass);
    if (lookup.price != null) {
        if (priceDiv) priceDiv.innerText = `Price: BDT ${lookup.price}`;
        console.log('Price lookup:', lookup.key, lookup.price);
    } else {
        if (priceDiv) priceDiv.innerText = `Price: N/A`;
        console.warn('Price not found for class:', topClass, 'normalized->', normalizeKey(topClass));
    }

    if (topProbability > 0.75 && topClass !== lastSpoken) {
        speak(`Detected ${topClass.replace(/_/g, ' ')}. Price ${lookup.price ? 'BDT ' + lookup.price : 'not available'}`);
        lastSpoken = topClass;
    }
}

// Speech function
function speak(text) {
    if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        speechSynthesis.cancel();
        speechSynthesis.speak(utterance);
    }
}

// Event listeners
document.addEventListener('DOMContentLoaded', async () => {
    resultDiv = document.getElementById('result');
    priceDiv = document.getElementById('price');

    // disable buttons until model loaded
    const webcamBtn = document.getElementById('webcamBtn');
    const uploadBtn = document.getElementById('uploadBtn');
    if (webcamBtn) webcamBtn.disabled = true;
    if (uploadBtn) uploadBtn.disabled = true;

    await loadModel();
    console.log('Model loaded');

    if (webcamBtn) webcamBtn.disabled = false;
    if (uploadBtn) uploadBtn.disabled = false;

    document.getElementById('webcamBtn').addEventListener('click', () => {
        document.getElementById('options').classList.add('hidden');
        document.getElementById('webcamSection').classList.remove('hidden');
        startWebcam();
    });

    document.getElementById('uploadBtn').addEventListener('click', () => {
        document.getElementById('options').classList.add('hidden');
        document.getElementById('uploadSection').classList.remove('hidden');
    });

    document.getElementById('fileInput').addEventListener('change', handleUpload);
});