// audio.js
// Sonidos sintetizados con Web Audio API, sin archivos externos.
// El AudioContext se crea o reanuda de forma perezosa dentro de playSound(),
// siempre tras un gesto del usuario (el clic en el boton Jugar).

let audioCtx = null; // AudioContext, creado en el primer gesto del usuario
let muted = false;
let wakaToggle = 0; // alterna los dos tonos del waka en cada dot comido

const SOUNDS = {
  dot: { freqs: [ 440, 330 ], duration: 0.06, type: 'square' }, // waka, alterna por dot
  power: { freq: 220, sweep: 660, duration: 0.3, type: 'square' },
  ghost: { freq: 880, duration: 0.15, type: 'square' }, // tono fijo
  death: { freq: 500, sweep: 100, duration: 0.8, type: 'square' },
};

function getAudioCtx() {
  if ( !audioCtx ) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if ( !AC ) return null; // navegador sin Web Audio: el juego sigue sin sonido
    audioCtx = new AC();
  }
  if ( audioCtx.state === 'suspended' ) audioCtx.resume();
  return audioCtx;
}

// Beep simple: OscillatorNode + envolvente de ganancia. sweep (opcional)
// desplaza la frecuencia linealmente durante la duracion del sonido.
function beep( ctx, freq, duration, type, sweep ) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime( freq, ctx.currentTime );
  if ( sweep ) {
    osc.frequency.linearRampToValueAtTime( sweep, ctx.currentTime + duration );
  }
  gain.gain.setValueAtTime( 0.15, ctx.currentTime );
  gain.gain.exponentialRampToValueAtTime( 0.001, ctx.currentTime + duration );
  osc.connect( gain );
  gain.connect( ctx.destination );
  osc.start();
  osc.stop( ctx.currentTime + duration );
}

function playSound( name ) {
  if ( muted ) return;
  const def = SOUNDS[ name ];
  if ( !def ) return;
  const ctx = getAudioCtx();
  if ( !ctx ) return;
  if ( def.freqs ) {
    beep( ctx, def.freqs[ wakaToggle ], def.duration, def.type );
    wakaToggle = 1 - wakaToggle; // alterna los dos tonos en cada dot
  } else {
    beep( ctx, def.freq, def.duration, def.type, def.sweep );
  }
}

function toggleMute() {
  muted = !muted;
  return muted;
}

window.playSound = playSound;
window.toggleMute = toggleMute;
