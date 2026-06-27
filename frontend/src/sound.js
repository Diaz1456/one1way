const audioCtx = typeof AudioContext !== 'undefined' ? new AudioContext() : null

const isSoundEnabled = () => {
  try {
    return localStorage.getItem('soundEnabled') !== 'false'
  } catch (e) {
    return true
  }
}

const playTone = (freq, duration, type = 'sine', volume = 0.15) => {
  if (!audioCtx) return
  const osc = audioCtx.createOscillator()
  const gain = audioCtx.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, audioCtx.currentTime)
  gain.gain.setValueAtTime(volume, audioCtx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration)
  osc.connect(gain)
  gain.connect(audioCtx.destination)
  osc.start()
  osc.stop(audioCtx.currentTime + duration)
}

const soundGuard = (fn) => (...args) => {
  if (!isSoundEnabled()) return
  fn(...args)
}

export const playClick = soundGuard(() => playTone(800, 0.08, 'square', 0.08))

export const playWhoosh = soundGuard(() => {
  if (!audioCtx) return
  const osc = audioCtx.createOscillator()
  const gain = audioCtx.createGain()
  osc.type = 'sawtooth'
  osc.frequency.setValueAtTime(200, audioCtx.currentTime)
  osc.frequency.exponentialRampToValueAtTime(800, audioCtx.currentTime + 0.3)
  gain.gain.setValueAtTime(0.15, audioCtx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4)
  osc.connect(gain)
  gain.connect(audioCtx.destination)
  osc.start()
  osc.stop(audioCtx.currentTime + 0.4)
})

export const playAlarm = soundGuard(() => {
  for (let i = 0; i < 4; i++) {
    setTimeout(() => playTone(440, 0.2, 'square', 0.2), i * 300)
  }
})

export const playBell = soundGuard(() => playTone(880, 1.5, 'sine', 0.3))

export const playCoinUp = soundGuard(() => {
  playTone(1318.5, 0.1, 'sine', 0.1)
  setTimeout(() => playTone(1568, 0.15, 'sine', 0.1), 100)
})

export const playSwoosh = soundGuard(() => {
  if (!audioCtx) return
  const bufferSize = audioCtx.sampleRate * 0.15
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.max(0, 1 - i / bufferSize) * 0.08
  }
  const source = audioCtx.createBufferSource()
  source.buffer = buffer
  source.connect(audioCtx.destination)
  source.start()
})
