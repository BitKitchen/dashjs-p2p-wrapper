import DashjsWrapperPrivate from './DashjsWrapperPrivate';
import PeerAgentAPI from './PeerAgentAPI';

class DashjsWrapper {

    constructor(player, p2pConfig, liveDelay) {
        let wrapper = new DashjsWrapperPrivate(player, p2pConfig, liveDelay);

        this.peerAgent = PeerAgentAPI.get(wrapper);
    }

    get version() {
        return DashjsWrapper.version;
    }

    static get version() {
        return DashjsWrapperPrivate.version;
    }
}

export default DashjsWrapper;
