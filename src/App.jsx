import { useEffect, useState } from 'react';

const motionLabels = {
  waiting: 'Waiting for motion data...',
  unknown: 'Still / Unknown',
  walking: 'Walking',
  running: 'Running',
  jumping: 'Jumping',
  upstairs: 'Going upstairs',
  downstairs: 'Going downstairs',
};

const maxSamples = 80;

function round(value) {
  return Number(value.toFixed(1));
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

function App() {
  const [status, setStatus] = useState('Waiting for motion sensor...');
  const [motion, setMotion] = useState('Unknown');
  const [acceleration, setAcceleration] = useState({ x: 0, y: 0, z: 0 });
  const [permissionRequired, setPermissionRequired] = useState(false);
  const [samples, setSamples] = useState([]);

  useEffect(() => {
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

      const nextSamples = [...samples, { x, y, z, mag }];
      if (nextSamples.length > maxSamples) {
        nextSamples.shift();
      }

      setSamples(nextSamples);
      setAcceleration({ x, y, z });
      setMotion(motionLabels[classifyMotion(nextSamples)] ?? motionLabels.unknown);
      setStatus('Motion data active');
    }

    function initMotion() {
      if (typeof DeviceMotionEvent === 'undefined') {
        setStatus('DeviceMotion API not supported in this browser.');
        return;
      }

      if (typeof DeviceMotionEvent.requestPermission === 'function') {
        setStatus('Tap the button and allow motion permission.');
        setPermissionRequired(true);
      } else {
        setStatus('Listening for motion events. Move your device.');
        window.addEventListener('devicemotion', handleMotion, true);
      }
    }

    initMotion();

    return () => {
      window.removeEventListener('devicemotion', handleMotion, true);
    };
  }, [samples]);

  async function requestPermission() {
    if (typeof DeviceMotionEvent.requestPermission !== 'function') {
      setStatus('Motion permission API not available.');
      return;
    }

    try {
      const permission = await DeviceMotionEvent.requestPermission();
      if (permission === 'granted') {
        setPermissionRequired(false);
        setStatus('Permission granted. Move your device now.');
        window.addEventListener('devicemotion', (event) => {
          const accel = event.accelerationIncludingGravity || event.acceleration;
          if (!accel) return;
          const x = accel.x || 0;
          const y = accel.y || 0;
          const z = accel.z || 0;
          const mag = Math.sqrt(x * x + y * y + z * z);
          const nextSamples = [...samples, { x, y, z, mag }];
          if (nextSamples.length > maxSamples) nextSamples.shift();
          setSamples(nextSamples);
          setAcceleration({ x, y, z });
          setMotion(motionLabels[classifyMotion(nextSamples)] ?? motionLabels.unknown);
        }, true);
      } else {
        setStatus('Permission denied. Motion detection stopped.');
      }
    } catch (error) {
      setStatus('Unable to request motion permission.');
      console.error(error);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="text-center">
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">Motion Detector</h1>
          <p className="mt-3 text-slate-400">Use your device motion sensor to detect walking, running, jumping, upstairs, and downstairs.</p>
        </div>

        <div className="grid gap-6">
          <div className="rounded-3xl border border-slate-700/80 bg-slate-900/80 p-6 shadow-xl shadow-slate-950/30">
            <p className="text-sm text-slate-400">Device status</p>
            <div className="mt-4 rounded-3xl bg-slate-950/90 px-5 py-6 text-center text-lg font-semibold text-slate-100">{status}</div>
          </div>

          <div className="rounded-3xl border border-slate-700/80 bg-slate-900/80 p-6 shadow-xl shadow-slate-950/30">
            <p className="text-sm text-slate-400">Detected motion</p>
            <div className="mt-4 rounded-3xl bg-slate-950/90 px-5 py-6 text-center text-2xl font-semibold text-cyan-300">{motion}</div>
          </div>

          <div className="grid gap-3 rounded-3xl border border-slate-700/80 bg-slate-900/80 p-6 shadow-xl shadow-slate-950/30 sm:grid-cols-3">
            <div className="rounded-3xl bg-slate-950/90 p-4 text-center">
              <p className="text-sm text-slate-400">X</p>
              <p className="mt-2 text-2xl font-semibold text-slate-100">{round(acceleration.x)}</p>
            </div>
            <div className="rounded-3xl bg-slate-950/90 p-4 text-center">
              <p className="text-sm text-slate-400">Y</p>
              <p className="mt-2 text-2xl font-semibold text-slate-100">{round(acceleration.y)}</p>
            </div>
            <div className="rounded-3xl bg-slate-950/90 p-4 text-center">
              <p className="text-sm text-slate-400">Z</p>
              <p className="mt-2 text-2xl font-semibold text-slate-100">{round(acceleration.z)}</p>
            </div>
          </div>

          {permissionRequired && (
            <button
              className="rounded-3xl bg-cyan-500 px-5 py-4 text-lg font-semibold text-slate-950 transition hover:bg-cyan-400"
              onClick={requestPermission}
            >
              Request Motion Permission
            </button>
          )}

          <p className="rounded-3xl bg-slate-900/80 p-4 text-sm text-slate-400">
            Best results on a mobile device with motion sensors. Try walking, running, jumping, upstairs, or downstairs.
          </p>
        </div>
      </div>
    </div>
  );
}

export default App;
