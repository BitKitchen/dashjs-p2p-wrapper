import ManifestHelper from './ManifestHelper';
import MediaMap from './MediaMap';
import SegmentView from './SegmentView';
import SRFragmentLoader from './SRFragmentLoader';
import PlayerInterface from './PlayerInterface';

class DashjsWrapper {

    constructor (player, videoElement) {
        this._player = player;
        this._videoElement = videoElement;

        this._player.on(dashjs.MediaPlayer.events.MANIFEST_LOADED, this._onManifestLoaded, this);
    }

    _onManifestLoaded ({ data }) {

        //TODO: we don't know if this event may fire on live streams with same manifest url. if it doesn't, we should remove this check
        if (this._manifest && data.url === this._manifest.url) {
            return;
        }

        this._manifest = data;

        if (window.streamrootDownloader) {
            window.streamrootDownloader.dispose();
        }

        let manifestHelper = new ManifestHelper(this._player, this._manifest);
        let mediaMap = new MediaMap(manifestHelper);
        let playerInterface = new PlayerInterface(this._player, manifestHelper);

        let p2pConfig = {
            streamrootKey: "ry-yecv4ugi",
            debug: true
        };
        window.streamrootDownloader = new window.Streamroot.Downloader(playerInterface, this._manifest.url, mediaMap, p2pConfig, SegmentView, this._videoElement) // TODO: Remove this global definition

        this._player.extend("FragmentLoader", SRFragmentLoader, true);
    }
}

export default DashjsWrapper;
