const statusEl = document.getElementById('status');
const motionEl = document.getElementById('motion');
const accelXEl = document.getElementById('accelX');
const accelYEl = document.getElementById('accelY');
const accelZEl = document.getElementById('accelZ');
const permissionButton = document.getElementById('permissionButton');

const sampleBuffer = [];
const maxSamples = 80;
const motionLabels = {
  waiting: 'Waiting for motion data...',
  unknown: 'Still / Unknown',
  walking: 'Walking',
  running: 'Running',
  jumping: 'Jumping',
  upstairs: 'Going upstairs',
  downstairs: 'Going downstairs',
};

function round(value) {
  return Number(value.toFixed(1));
}

function updateDisplay(acceleration, label) {
  accelXEl.textContent = round(acceleration.x);
  accelYEl.textContent = round(acceleration.y);
  accelZEl.textContent = round(acceleration.z);
  motionEl.textContent = motionLabels[label] || motionLabels.unknown;
}

function setStatus(text) {
  statusEl.textContent = text;
}

function classifyMotion(samples) {
  if (samples.length < 10) {
    return 'waiting';
  }

  const mags = samples.map((item) => item.mag);
  const zValues = samples.map((item) => item.z);

  const mean = mags.reduce((sum, value) => sum + value, 0) / mags.length;
  const variance = mags.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / mags.length;
  const max = Math.max(...mags);
  const zTrend = zValues[zValues.length - 1] - zValues[0];
  const verticalMean = zValues.reduce((sum, value) => sum + value, 0) / zValues.length;

  const stairsUp = zTrend > 4.5 && verticalMean > 1.5 && mean > 3;
  const stairsDown = zTrend < -4.5 && verticalMean < -1.5 && mean > 3;
  const jump = max > 25 && variance > 120;
  const run = mean > 11 && variance > 18;
  const walk = mean > 4 && variance > 4;

  if (jump) {
    return 'jumping';
  }
  if (stairsUp) {
    return 'upstairs';
  }
  if (stairsDown) {
    return 'downstairs';
  }
  if (run) {
    return 'running';
  }
  if (walk) {
    return 'walking';
  }

  return 'unknown';
}

function handleMotion(event) {
  const accel = event.accelerationIncludingGravity || event.acceleration;
  if (!accel) {
    setStatus('Motion sensor data unavailable.');
    return;
  }

  const x = accel.x || 0;
  const y = accel.y || 0;
  const z = accel.z || 0;
  const mag = Math.sqrt(x * x + y * y + z * z);

  const sample = { x, y, z, mag, timestamp: Date.now() };
  sampleBuffer.push(sample);
  if (sampleBuffer.length > maxSamples) {
    sampleBuffer.shift();
  }

  const label = classifyMotion(sampleBuffer);
  updateDisplay(sample, label);
  setStatus('Motion data active');
}

function bindMotionSensor() {
  if (typeof DeviceMotionEvent === 'undefined') {
    setStatus('DeviceMotion API not supported in this browser.');
    return;
  }

  if (typeof DeviceMotionEvent.requestPermission === 'function') {
    setStatus('Tap the button and allow motion permission.');
    permissionButton.style.display = 'block';
  } else {
    setStatus('Listening for motion events. Move your device.');
    window.addEventListener('devicemotion', handleMotion, true);
  }
}

permissionButton.addEventListener('click', async () => {
  if (typeof DeviceMotionEvent.requestPermission !== 'function') {
    setStatus('Motion permission API not available.');
    return;
  }

  try {
    const permission = await DeviceMotionEvent.requestPermission();
    if (permission === 'granted') {
      setStatus('Permission granted. Move your device now.');
      permissionButton.style.display = 'none';
      window.addEventListener('devicemotion', handleMotion, true);
    } else {
      setStatus('Permission denied. Motion detection stopped.');
    }
  } catch (error) {
    setStatus('Unable to request motion permission.');
    console.error(error);
  }
});

bindMotionSensor();
