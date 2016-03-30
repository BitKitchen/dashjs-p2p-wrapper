class ManifestHelper {

    constructor (player) {

        let getManifestModel,
            getDashManifestModel,
            getIndexHandler,
            getTimelineConverter,
            getEventBus;

        function StreamSR () {
            let factory = this.factory,
                context = this.context,
                parent = this.parent,
                _indexHandler;

            getManifestModel = function () {
                return factory.getSingletonInstance(context, "ManifestModel");
            };

            getDashManifestModel = function () {
                return factory.getSingletonInstance(context, "DashManifestModel");
            };

            getIndexHandler = function () {
                if (!_indexHandler) {
                    _indexHandler = parent.createIndexHandler();
                }

                return _indexHandler;
            };

            getTimelineConverter = function () {
                return factory.getSingletonInstance(context, "TimelineConverter");
            };

            getEventBus = function () {
                return factory.getSingletonInstance(context, "EventBus");
            }
        }

        player.extend("Stream", StreamSR, true);

        this._getManifest = function () {
            return getManifestModel ? getManifestModel().getValue() : undefined;
        };

        this._getDashManifestModel = function () {
            return getDashManifestModel ? getDashManifestModel() : undefined;
        };

        this._getIndexHandler = function () {
            return getIndexHandler ? getIndexHandler() : undefined;
        };

        this._getTimelineConverter = function () {
            return getTimelineConverter ? getTimelineConverter() : undefined;
        };

        this.getEventBus = function () {
            return getEventBus ? getEventBus() : undefined;
        };
    }

    getSegmentList (trackView) {
        var manifest = this._getManifest(),
            dashManifestModel = this._getDashManifestModel(),
            indexHandler = this._getIndexHandler(),
            timelineConverter = this._getTimelineConverter();

        if (!manifest || !dashManifestModel || !indexHandler || !timelineConverter) throw new Error("Tried to get representation we could have access to dash.js manifest internals");

        var mpd = dashManifestModel.getMpd(manifest);
        var period = dashManifestModel.getRegularPeriods(manifest, mpd)[trackView.periodId];
        var adaptation = dashManifestModel.getAdaptationsForPeriod(manifest, period)[trackView.adaptationSetId];
        var representation = dashManifestModel.getRepresentationsForAdaptation(manifest, adaptation)[trackView.representationId];
        var isDynamic = this.isLive();
        representation.segmentAvailabilityRange = timelineConverter.calcSegmentAvailabilityRange(representation, isDynamic); //TODO: we might want to offset that range to get segments that go further than dash.js buffer zone
        return indexHandler.getSegments(representation);
    }

    getSegment (segmentView) {
        var representation = this.getRepresentation(segmentView.trackView);
        return representation.segments[segmentView.segmentId];
    }

    isLive () {
        var manifest = this._getManifest(),
            dashManifestModel = this._getDashManifestModel();

        if (!manifest || !dashManifestModel) throw new Error("Tried to get representation we could have access to dash.js manifest internals");

        return dashManifestModel.getIsDynamic(manifest);
    }

}

export default ManifestHelper;
