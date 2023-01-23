import Effect from './effect.js';

import p5sound from './main';
var ac = p5sound.audiocontext;
var panner;
// Stereo panner
// if there is a stereo panner node use it
if (typeof ac.createStereoPanner !== 'undefined') {
  class Panner extends Effect {
    constructor() {
      super();
      this.stereoPanner = this.ac.createStereoPanner();

      this.input.connect(this.stereoPanner);
      this.stereoPanner.connect(this.wet);
    }

    pan(val, tFromNow) {
      if (typeof val === 'number') {
        let time = tFromNow || 0;
        this.stereoPanner.pan.linearRampToValueAtTime(
          val,
          this.ac.currentTime + 0.02 + time
        );
      } else if (typeof val !== 'undefined') {
        val.connect(this.stereoPanner.pan);
      }
    }

    getPan() {
      return this.stereoPanner.pan.value;
    }

    dispose() {
      super.dispose();
      if (this.stereoPanner) {
        this.stereoPanner.disconnect();
        delete this.stereoPanner;
      }
    }

    //not implemented because stereopanner
    //node does not require this and will automatically
    //convert single channel or multichannel to stereo.
    //tested with single and stereo, not with (>2) multichannel
    inputChannels() {}
  }

  panner = Panner;
} else {
  // if there is no createStereoPanner object
  // such as in safari 7.1.7 at the time of writing this
  // use this method to create the effect
  class Panner {
    constructor(input, output, numInputChannels) {
      this.input = ac.createGain();
      input.connect(this.input);

      this.panValue = 0;
      this.left = ac.createGain();
      this.right = ac.createGain();
      this.left.channelInterpretation = 'discrete';
      this.right.channelInterpretation = 'discrete';

      // if input is stereo
      if (numInputChannels > 1) {
        this.splitter = ac.createChannelSplitter(2);
        this.input.connect(this.splitter);

        this.splitter.connect(this.left, 1);
        this.splitter.connect(this.right, 0);
      } else {
        this.input.connect(this.left);
        this.input.connect(this.right);
      }

      this.output = ac.createChannelMerger(2);
      this.left.connect(this.output, 0, 1);
      this.right.connect(this.output, 0, 0);
      this.output.connect(output);
    }

    // -1 is left, +1 is right
    pan(val, tFromNow) {
      this.panValue = val;
      var time = tFromNow || 0;
      var t = ac.currentTime + time;
      var v = (val + 1) / 2;
      var rightVal = Math.cos((v * Math.PI) / 2);
      var leftVal = Math.sin((v * Math.PI) / 2);
      this.left.gain.linearRampToValueAtTime(leftVal, t);
      this.right.gain.linearRampToValueAtTime(rightVal, t);
    }

    getPan() {
      return this.panValue;
    }

    inputChannels(numChannels) {
      if (numChannels === 1) {
        this.input.disconnect();
        this.input.connect(this.left);
        this.input.connect(this.right);
      } else if (numChannels === 2) {
        if (typeof this.splitter === 'undefined') {
          this.splitter = ac.createChannelSplitter(2);
        }
        this.input.disconnect();
        this.input.connect(this.splitter);
        this.splitter.connect(this.left, 1);
        this.splitter.connect(this.right, 0);
      }
    }

    connect(obj) {
      this.output.connect(obj);
    }

    disconnect() {
      if (this.output) {
        this.output.disconnect();
      }
    }
  }
  panner = Panner;
}

export default panner;
