# dashjs-p2p-wrapper

Streamroot p2p module wrapper for dash.js. It enables [Streamroot's p2p](http://streamroot.io) solution for [dash.js](https://github.com/Dash-Industry-Forum/dash.js).

## Quick start

1. Clone this repo `git clone https://github.com/streamroot/dashjs-p2p-wrapper.git`
1. Install library dependencies `npm install`
1. Build the library `grunt build`. The result will be here `dist/dashjs-wrapper.js`.
1. Include `streamroot-p2p` lib, `dashjs-wrapper.js` and `dash.js` in your web page:

  **The supported version of dash.js is v2.1+**

  ```html
  <head>
    <!-- path to dash.js build here -->
    <script src="http://cdn.dashjs.org/latest/dash.all.min.js"></script>

    <!-- Streamroot p2p lib -->
    <script src="http://lib.streamroot.io/3/p2p.js"></script>

    <!-- path to streamroot-dash build aka Streamroot p2p dash.js wrapper -->
    <script src="dashjs-wrapper.js"></script>
  </head>
  ```
1. Create dash.js MediaPlayer instance and initialize the wrapper

  ```javascript
  <body>

      <div>
          <video id="videoPlayer" width="480" height="360" controls muted></video>
      </div>

      <script>
          (function() {
              var videoElementId = "videoPlayer";
              var videoElement = document.getElementById(videoElementId);

              var player = dashjs.MediaPlayer().create();

              var p2pConfig = {
                  streamrootKey: YOUR_STREAMROOT_KEY_HERE,
                  debug: true //true if you want to see debug messages in browser console, false otherwise
              };

              var liveDelay = 30; //TODO: hardcoded value, will be fixed in future relases
              var dashjsWrapper = new DashjsWrapper(player, videoElement, p2pConfig, liveDelay);

              var manifestURL = "put MPEG-DASH manifest url here";
              var autoStart = true;
              player.initialize(videoElement, manifestURL, autoStart);
          })();
      </script>
  </body>
  ```

1. Specify your Streamroot key in the p2pConfig object. If you don't have it, go to [Streamroot's dashboard](http://dashboard.streamroot.io/) and sign up. It's free.

1. To see some p2p traffic open several browser tabs/windows playing the same manifest (so there will be peers to exchange p2p traffic).

You can check an example [here](http://streamroot.github.io/dashjs-p2p-wrapper/demo/demo.html)
