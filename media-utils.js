/**
 * MigaBuilder's shared media helpers.
 *
 * Small, page-independent audio/video utilities that were previously
 * copy-pasted verbatim across several tools. Each page loads this file
 * and calls window.MediaUtils.<fn>(...) directly — no init/config step,
 * since none of these functions touch the DOM or page state.
 */
(function (window) {
  "use strict";

  // Picks the best MediaRecorder mimeType this browser actually supports,
  // preferring vp9 for smaller files, falling back to vp8, then plain webm.
  // Pages that name their download from the result can pass { allowMp4: true }
  // to fall back to MP4 as well, which is what Safari records.
  function pickMimeType(opts) {
    const candidates = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
    if (opts && opts.allowMp4) candidates.push('video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/mp4;codecs=avc1,mp4a', 'video/mp4');
    for (const c of candidates) { if (window.MediaRecorder && MediaRecorder.isTypeSupported(c)) return c; }
    return '';
  }

  // Encodes a decoded AudioBuffer as a 16-bit PCM .wav Blob.
  function audioBufferToWav(buffer) {
    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const bitDepth = 16;
    const bytesPerSample = bitDepth / 8;
    const blockAlign = numChannels * bytesPerSample;
    const numFrames = buffer.length;
    const dataSize = numFrames * blockAlign;
    const arrayBuffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(arrayBuffer);

    function writeString(offset, str) { for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i)); }

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);
    writeString(36, 'data');
    view.setUint32(40, dataSize, true);

    const channelData = [];
    for (let c = 0; c < numChannels; c++) channelData.push(buffer.getChannelData(c));

    let offset = 44;
    for (let i = 0; i < numFrames; i++) {
      for (let c = 0; c < numChannels; c++) {
        let sample = Math.max(-1, Math.min(1, channelData[c][i]));
        sample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
        view.setInt16(offset, sample, true);
        offset += 2;
      }
    }
    return new Blob([arrayBuffer], { type: 'audio/wav' });
  }

  // The four generated stock tracks shared by Merge Forge and Video Forge.
  // Each page still owns its own i18n dictionary for the labelKey strings.
  const STOCK_TRACKS = [
    { id: 'cheerful', labelKey: 'stockCheerful', notes: [261.63, 329.63, 392.00, 329.63, 440.00, 392.00, 329.63, 293.66], noteDur: 0.35, wave: 'triangle', duration: 16.8, bass: 130.81 },
    { id: 'calm', labelKey: 'stockCalm', notes: [220.00, 261.63, 329.63, 392.00], noteDur: 2.2, wave: 'sine', duration: 17.6, bass: 110.00 },
    { id: 'playful', labelKey: 'stockPlayful', notes: [392.00, 440.00, 523.25, 440.00, 392.00, 349.23, 392.00, 293.66], noteDur: 0.22, wave: 'square', duration: 14.08, bass: null },
    { id: 'cinematic', labelKey: 'stockCinematic', notes: [196.00, 233.08, 293.66, 233.08], noteDur: 2.6, wave: 'sawtooth', duration: 20.8, bass: 98.00 }
  ];

  // Procedurally renders one of the STOCK_TRACKS configs (or any config with
  // the same shape) to an AudioBuffer via an OfflineAudioContext.
  async function generateStockTrack(cfg) {
    const AC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    const sampleRate = 44100;
    const offlineCtx = new AC(2, Math.ceil(sampleRate * cfg.duration), sampleRate);
    let t = 0, i = 0;
    while (t < cfg.duration) {
      const freq = cfg.notes[i % cfg.notes.length];
      const osc = offlineCtx.createOscillator();
      osc.type = cfg.wave;
      osc.frequency.value = freq;
      const gain = offlineCtx.createGain();
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.28, t + Math.min(0.08, cfg.noteDur * 0.2));
      gain.gain.linearRampToValueAtTime(0, t + cfg.noteDur);
      osc.connect(gain).connect(offlineCtx.destination);
      osc.start(t);
      osc.stop(t + cfg.noteDur);
      t += cfg.noteDur;
      i++;
    }
    if (cfg.bass) {
      let bt = 0;
      const segDur = cfg.noteDur * 2;
      while (bt < cfg.duration) {
        const dur = Math.min(segDur, cfg.duration - bt);
        const osc = offlineCtx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = cfg.bass;
        const gain = offlineCtx.createGain();
        gain.gain.setValueAtTime(0, bt);
        gain.gain.linearRampToValueAtTime(0.18, bt + Math.min(0.1, dur * 0.2));
        gain.gain.linearRampToValueAtTime(0, bt + dur);
        osc.connect(gain).connect(offlineCtx.destination);
        osc.start(bt);
        osc.stop(bt + dur);
        bt += dur;
      }
    }
    return offlineCtx.startRendering();
  }

  window.MediaUtils = {
    pickMimeType: pickMimeType,
    audioBufferToWav: audioBufferToWav,
    STOCK_TRACKS: STOCK_TRACKS,
    generateStockTrack: generateStockTrack
  };
})(window);
