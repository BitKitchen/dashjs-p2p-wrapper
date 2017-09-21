import SwitchRequest from 'dashjs/build/es5/src/streaming/rules/SwitchRequest';

function ThroughputRuleClassProvider(wrapper) {

    // SwitchRequest's interface has been modified in dash.js's development branch (at this date the latest release is 2.5.0).
    // Fortunately, the development branch also introduces dashjs.FactoryMaker, which allows us to get the correct ClassFactory for SwitchRequest.
    // The next blocks allows us to stay compatible with future versions, while ensuring compatibility with v2.5.0 and lower
    const factory = dashjs.FactoryMaker;
    let SwitchRequestClassFactory;
    if (factory) {
        SwitchRequestClassFactory = factory.getClassFactoryByName('SwitchRequest');
    } else {
        SwitchRequestClassFactory = SwitchRequest;
    }

    this.SRThroughputRule = function () {
        const parentGetMaxIndex = this.parent.getMaxIndex;
        const context = this.context;

        function getMaxIndex (rulesContext) {
            let switchRequest = parentGetMaxIndex(rulesContext);

            const type = rulesContext.getMediaInfo().type;
            const currentQuality = rulesContext.getAbrController().getQualityFor(type);

            if (type !== 'video' && type !== 'audio') {
                return switchRequest;
            }

            if (switchRequest.value < currentQuality && wrapper.peerAgentModule.nextSegmentPrebuffered && wrapper.peerAgentModule.nextSegmentPrebuffered[type]) {
                // If the default throughput rule was going to trigger a downswitch, but we already prebuffered the next fragment, prevent downswitch.
                switchRequest = SwitchRequestClassFactory(context).create(); // eslint-disable-line new-cap

                // Set value to currentQuality instead of default -1 (NO_CHANGE) which breaks the SwitchRequestHistoryRule: it would cause a downswitch in the very next abr decision in dash.js
                // The dash.js issue has been fixed in https://github.com/Dash-Industry-Forum/dash.js/commit/5463aa. At this time the fix is in development branch (unreleased), latest released version is 2.5.0
                switchRequest.value = currentQuality;
            };
            return switchRequest;
        }

        let instance = {
            getMaxIndex,
        };

        return instance;
    };
};

export default ThroughputRuleClassProvider;
