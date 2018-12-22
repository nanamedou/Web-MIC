import * as plt from './plot.js'

const FFT_SIZE = 2048

/*
 * beginRecord呼び出し時に初期化される変数
 */

let gainNode
let analyserNode
let freqDatas
let hzDatas

/**
 * 録音を開始する関数。
 * この関数は常にユーザー操作イベント中に呼び出さあれなければならない。
 */
const beginRecord = () => {
  /**
   * オーディオのあれこれを作成する。
   * ユーザー操作イベント中でないと失敗することがある。 
   */
  /**
   * @type {AudioContext}
   */
  let audioCtx = new (window.AudioContext || window.webkitAudioContext)();

  if (navigator.mediaDevices.getUserMedia) {
    // メディア使用権限取得
    navigator.mediaDevices.getUserMedia (
    {
      audio: true,
      video: false
    }).then(function(stream) {

      /* ノードを作成する */
      let sourceNode = audioCtx.createMediaStreamSource(stream)

      analyserNode = audioCtx.createAnalyser()
      analyserNode.fftSize = FFT_SIZE
      freqDatas = new Float32Array(analyserNode.frequencyBinCount)
      hzDatas = new Float32Array(analyserNode.frequencyBinCount)
      for(let i = 0; i < analyserNode.frequencyBinCount; i++){
        hzDatas[i] = i * audioCtx.sampleRate / analyserNode.fftSize
      }

      gainNode = audioCtx.createGain()
      gainNode.gain.value = 1
      
      let dynamicCompressorNode = audioCtx.createDynamicsCompressor()
      
      let delayNode = audioCtx.createDelay(1)
      delayNode.delayTime.value = 0.5
      
      /* ノードを接続する */
      sourceNode.connect(analyserNode)
      analyserNode.connect(gainNode)
      gainNode.connect(dynamicCompressorNode)
      dynamicCompressorNode.connect(delayNode)
      delayNode.connect(audioCtx.destination)

    }).catch( (err) => {
      console.log('メディア初期化に失敗しました。: ' + err)
    })
  } else {
    console.log('navigator.mediaDevices.getUserMedia がサポートされていません。')
  }
}

const main  = () => {
  /* 
   * 描画関連設定
   */

   /* Canvas要素の定義など */
   let cs  = document.getElementById('canvas')
   let ctx = cs.getContext('2d')
 
   /* 描画用データ宣言 */
   const rect = [0, 0, cs.width, cs.height]
   let fig = new plt.Figure(ctx, rect)
   fig.maxY = 10
   fig.minY = -210
 
   /* 描画関数 */
   let render = ()=>{
    if(analyserNode){
      analyserNode.getFloatFrequencyData(freqDatas)
    }
    ctx.fillStyle='black'
    ctx.fillRect(rect[0], rect[1], rect[2], rect[3])

    ctx.strokeStyle='green'
    ctx.beginPath()
    if(hzDatas && freqDatas){
      fig.plot(hzDatas, freqDatas)
    }
    ctx.stroke()

    setTimeout(render, 10)
  }
 
   render()

  /*
   * 音声関連設定
   */

  let beginBtn = document.getElementById('startBtn')

  // ボタンが押されたとき録音を開始する。
  // このときボタンは無効化される。
  beginBtn.onclick = ()=>{
    beginBtn.setAttribute('disabled', 'disabled')
    beginRecord()
  }

  let volumeRng = document.getElementById('volRng')

  // ボリューム設定
  volumeRng.oninput = ()=>{
    if(gainNode){
      gainNode.gain.value = volumeRng.value
    }
  }

}

main()
