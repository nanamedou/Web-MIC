/**
 * script.js
 */

import * as plt from './plot.js'

const FFT_SIZE = 2048
let volume = 1
let delay = 0
let DB_LIM = [-150, -30]

/* 再生状態フラグ類 */
let playbackNow

/* 音声インターフェース類 */
let audioCtx
let sourceNode

/* 基本エフェクト用変数 */
let sourceToEffectNode
let delayNode
let gainNode
let dynamicCompressorNode
let analyserNode

/* ホワイトノイズ用変数 */
let whiteNoiseBuffer
let whiteNoiseNode
let whiteNoiseGainNode

/* エコー用変数 */
let echoGainNode
let echoDelayNode

/* fftデータ */
let freqDatas
let freqMinDatas
let hzDatas

/* 音声ファイルデータ */
let audioFileBlob
let fileTypeAudio

let startBtn = document.getElementById('startBtn')
let fileInput = document.getElementById('fileInput')
let fileLoop = document.getElementById('fileLoop')

let volumeRng = document.getElementById('volumeRng')
let volumeVal = document.getElementById('volumeVal')

let delayRng = document.getElementById('delayRng')
let delayVal = document.getElementById('delayVal')

let vvMinRng = document.getElementById('vvminRng')
let vvMinVal = document.getElementById('vvminVal')
let vvMaxRng = document.getElementById('vvmaxRng')
let vvMaxVal = document.getElementById('vvmaxVal')

let whiteNoiseCbox = document.getElementById('whiteNoiseCbox')
let whiteNoiseGainRng = document.getElementById('whiteNoiseGainRng')
let whiteNoiseGainVal = document.getElementById('whiteNoiseGainVal')

let echoCbox = document.getElementById('echoCbox')
let echoGainRng = document.getElementById('echoGainRng')
let echoGainVal = document.getElementById('echoGainVal')
let echoDelayRng = document.getElementById('echoDelayRng')
let echoDelayVal = document.getElementById('echoDelayVal')


/**
 * オーディオインターフェースを準備する。
 */
function audioSetUp() {
  if (audioCtx == null) {
    audioCtx = new window.AudioContext();

    /* エフェクト設定 */
    sourceToEffectNode = audioCtx.createDelay()

    delayNode = audioCtx.createDelay(3)
    delayNode.delayTime.value = delay

    gainNode = audioCtx.createGain()
    gainNode.gain.value = volume

    dynamicCompressorNode = audioCtx.createDynamicsCompressor()

    analyserNode = audioCtx.createAnalyser()
    analyserNode.fftSize = FFT_SIZE
    freqDatas = new Float32Array(analyserNode.frequencyBinCount)
    freqMinDatas = new Array(analyserNode.frequencyBinCount)
    hzDatas = new Float32Array(analyserNode.frequencyBinCount)
    for (let i = 0; i < analyserNode.frequencyBinCount; i++) {
      hzDatas[i] = i * audioCtx.sampleRate / analyserNode.fftSize
    }

    sourceToEffectNode.connect(delayNode)
    delayNode.connect(gainNode)
    gainNode.connect(dynamicCompressorNode)
    dynamicCompressorNode.connect(analyserNode)
    analyserNode.connect(audioCtx.destination)

    /* ホワイトノイズエフェクト生成部 */
    whiteNoiseBuffer = audioCtx.createBuffer(1, 8000, 8000)
    let nowBuf = whiteNoiseBuffer.getChannelData(0)
    for (let i = 0; i < nowBuf.length; ++i) {
      nowBuf[i] = (Math.random() * 2 - 1)
    }
    whiteNoiseNode = audioCtx.createBufferSource()
    whiteNoiseNode.buffer = whiteNoiseBuffer
    whiteNoiseNode.loop = true
    whiteNoiseNode.start()
    whiteNoiseGainNode = audioCtx.createGain()
    whiteNoiseGainNode.gain.value = whiteNoiseGainRng.value / 100
    whiteNoiseNode.connect(whiteNoiseGainNode)
    setWhiteNoise(whiteNoiseCbox.checked)

    /* エコー生成部 */
    echoDelayNode = audioCtx.createDelay(3)
    echoDelayNode.delayTime.value = echoDelayRng.value
    echoGainNode = audioCtx.createGain()
    echoGainNode.gain.value = echoGainRng.value / 100
    sourceToEffectNode.connect(echoDelayNode)
    echoDelayNode.connect(echoGainNode)
    setEcho(echoCbox.checked)
  }
  if (sourceNode) {
    sourceNode.disconnect()
    sourceNode = null
  }
  if (audioFileBlob) {
    window.URL.revokeObjectURL(audioFileBlob)
    audioFileBlob = null
  }
  if (fileTypeAudio) {
    fileTypeAudio.pause()
    fileTypeAudio = null
  }
}


/**
 * ホワイトノイズの開始・停止を行う。
 */
function setWhiteNoise(isActive) {
  if (whiteNoiseGainNode) {
    whiteNoiseGainNode.disconnect()
    if (isActive) {
      whiteNoiseGainNode.connect(delayNode)
    }
  }
}


/**
 * エコーの開始・停止を行う。
 */
function setEcho(isActive) {
  if (echoGainNode) {
    echoGainNode.disconnect()
    if (isActive) {
      echoGainNode.connect(sourceToEffectNode)
    }
  }
}


/**
 * 録音を開始する関数。
 * この関数は常にユーザー操作イベント中に呼び出されなければならない。
 */
function beginMICMode() {
  /*
   * オーディオのあれこれを作成する。
   * ユーザー操作イベント中でないと失敗することがある。 
   */
  playbackNow = false

  audioSetUp()

  if (navigator.mediaDevices.getUserMedia) {
    // メディア使用権限取得
    navigator.mediaDevices.getUserMedia(
      {
        audio: true,
        video: false
      }).then((stream) => {

        /* ノードを作成する */
        sourceNode = audioCtx.createMediaStreamSource(stream)

        sourceNode.connect(sourceToEffectNode)

        playbackNow = true
      }).catch((err) => {
        console.log('メディア初期化に失敗しました。: ' + err)
      })
  } else {
    console.log('navigator.mediaDevices.getUserMedia がサポートされていません。')
  }
}


/**
 * ローカルにある音楽を再生する。
 * 
 * @argument {File} file 再生する対象
 */
function beginSoundFileMode(file) {
  /**
   * オーディオのあれこれを作成する。
   * ユーザー操作イベント中でないと失敗することがある。 
   */
  playbackNow = false

  audioSetUp()

  audioFileBlob = window.URL.createObjectURL(file)
  fileTypeAudio = new Audio(audioFileBlob)
  fileTypeAudio.loop = fileLoop.checked
  sourceNode = audioCtx.createMediaElementSource(fileTypeAudio)

  sourceNode.connect(sourceToEffectNode)

  fileTypeAudio.play()
  playbackNow = true
}


function main() {
  /* 
   * 描画関連設定
   */

  /* Canvas要素の定義など */
  let cs = document.getElementById('canvas')
  /**
   * @type {CanvasRenderingContext2D}
   */
  let ctx = cs.getContext('2d')

  /* 描画用データ宣言 */
  const rect = [0, 0, cs.width, cs.height]
  let fig = new plt.Figure(ctx, rect)

  let figStyle = ctx.createLinearGradient(0, 0, cs.width, 0)
  figStyle.addColorStop(0, 'red')
  figStyle.addColorStop(0.25, 'yellow')
  figStyle.addColorStop(0.5, 'green')
  figStyle.addColorStop(0.75, 'blue')
  figStyle.addColorStop(1, 'violet')
  fig.style = figStyle

  /* 描画関数 */
  let render = () => {
    if (playbackNow) {
      analyserNode.getFloatFrequencyData(freqDatas)
      fig.limY = DB_LIM
      for (let i = 0; i < analyserNode.frequencyBinCount; i++) {
        freqMinDatas[i] = DB_LIM[0]
      }
    }
    ctx.fillStyle = 'black'
    ctx.fillRect(rect[0], rect[1], rect[2], rect[3])
    if (playbackNow) {
      fig.fill_between(hzDatas, freqDatas, freqMinDatas)
    }

    setTimeout(render, 10)
  }

  render()

  /*
   * 音声関連設定
   */

  function setRangeAttribute(rangeElement, min, max, step, value) {
    rangeElement.min = min
    rangeElement.max = max
    rangeElement.value = value
    rangeElement.step = step
  }


  startBtn.onclick = () => {
    startBtn.setAttribute('disabled', 'disabled')
    beginMICMode()
  }

  fileInput.value = null
  fileInput.onchange = () => {
    // ボタンが押されたとき再生を開始する。
    startBtn.removeAttribute('disabled')
    beginSoundFileMode(fileInput.files[0])
  }

  fileLoop.checked = false
  fileLoop.onchange = () => {
    if (fileTypeAudio) {
      fileTypeAudio.loop = fileLoop.checked
    }
  }

  /* ボリューム設定 */
  setRangeAttribute(volumeRng, 0, 100, 1, 100)
  volumeRng.oninput = () => {
    volumeVal.innerHTML = volumeRng.value
    if (gainNode) {
      gainNode.gain.value = volumeRng.value / 100
    }
  }
  volumeRng.oninput()

  /* 遅延設定 */
  setRangeAttribute(delayRng, 0, 3, 0.1, 0)
  delayRng.oninput = () => {
    delayVal.innerHTML = delayRng.value
    if (playbackNow) {
      delayNode.delayTime.value = delayRng.value
    }
  }
  delayRng.oninput()

  /* スペクトル表示範囲設定 */
  setRangeAttribute(vvMinRng, -150, -30, 0.1, -150)
  const vvMinOnIn = () => {
    vvMinVal.innerHTML
      = DB_LIM[0]
      = vvMinRng.value
      = Math.min(vvMinRng.value, DB_LIM[1])
  }
  vvMinRng.oninput = vvMinOnIn
  vvMinOnIn()
  setRangeAttribute(vvMaxRng, -150, -30, 0.1, -30)
  const vvMaxOnIn = () => {
    vvMaxVal.innerHTML
      = DB_LIM[1]
      = vvMaxRng.value
      = Math.max(vvMaxRng.value, DB_LIM[0])
  }
  vvMaxRng.oninput = vvMaxOnIn
  vvMaxOnIn()

  /* ホワイトノイズの設定 */
  whiteNoiseCbox.onchange = () => {
    setWhiteNoise(whiteNoiseCbox.checked)
  }
  setRangeAttribute(whiteNoiseGainRng, 0, 100, 1, 100)
  whiteNoiseGainRng.oninput = () => {
    whiteNoiseGainVal.innerHTML = whiteNoiseGainRng.value
    if (whiteNoiseGainNode) {
      whiteNoiseGainNode.gain.value = whiteNoiseGainRng.value / 100
    }
  }
  whiteNoiseGainRng.oninput()

  /* エコーの設定 */
  echoCbox.onchange = () => {
    setEcho(echoCbox.checked)
  }
  setRangeAttribute(echoGainRng, 0, 100, 1, 100)
  echoGainRng.oninput = () => {
    echoGainVal.innerHTML = echoGainRng.value
    if (echoGainNode) {
      echoGainNode.gain.value = echoGainRng.value / 100
    }
  }
  echoGainRng.oninput()
  setRangeAttribute(echoDelayRng, 0, 3, 0.1, 0.5)
  echoDelayRng.oninput = () => {
    echoDelayVal.innerHTML = echoDelayRng.value
    if (echoDelayNode) {
      echoDelayNode.delayTime.value = echoDelayRng.value
    }
  }
  echoDelayRng.oninput()
}


main()
