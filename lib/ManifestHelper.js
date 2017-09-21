import TrackView from './TrackView';
import SegmentsGetter from 'dashjs/build/es5/src/dash/utils/SegmentsGetter';
import SegmentsCache from './SegmentsCache';

class ManifestHelper {

    constructor (wrapper, dashjsInternals) {
        this._wrapper = wrapper;
        this._dashjsInternals = dashjsInternals;
        this._segmentsCache = new SegmentsCache(this._player);
    }

    get _player() {
        return this._wrapper.player;
    }

    get _manifest() {
        return this._wrapper.manifest;
    }

    _getSegmentsGetter() {
        if (!this._segmentsGetter) {
            let context = this._dashjsInternals.getContext();
            let config = this._dashjsInternals.getConfig();

            this._segmentsGetter = SegmentsGetter(context).create(config, this.isLive());
        }

        return this._segmentsGetter;
    }

    getSegmentList (trackView, beginTime, duration) {
        if (this._segmentsCache.hasSegments(trackView)) {
            return this._segmentsCache.getSegments(trackView);
        }

        var dashManifestModel = this._dashjsInternals.getDashManifestModel(),
            timelineConverter = this._dashjsInternals.getTimelineConverter();

        if (!dashManifestModel || !timelineConverter) {
            throw new Error("Tried to get representation before we could have access to dash.js manifest internals");
        }

        var mpd = dashManifestModel.getMpd(this._manifest);
        var period = dashManifestModel.getRegularPeriods(mpd)[trackView.periodId];
        var adaptation = dashManifestModel.getAdaptationsForPeriod(period)[trackView.adaptationSetId];
        var representation = dashManifestModel.getRepresentationsForAdaptation(adaptation)[trackView.representationId];
        var isDynamic = this.isLive();
        var index = 0;

        representation.segmentAvailabilityRange = timelineConverter.calcSegmentAvailabilityRange(representation, isDynamic);

        // getSegments doesn't return anything anymore, but can be passed a callback that will be executed synchronously (ugly though)
        var segments;
        this._getSegmentsGetter().getSegments(representation, beginTime, index, (rep, seg) => {
            segments = seg;
        }, duration);

        return segments;
    }

    isLive () {
        var dashManifestModel = this._dashjsInternals.getDashManifestModel();

        if (!dashManifestModel) {
            throw new Error("Tried to get representation before we could have access to dash.js manifest internals");
        }

        return dashManifestModel.getIsDynamic(this._manifest);
    }

    getCurrentTracks () {
        var tracks = {};
        for (let type of ["audio", "video"]) {
            let tracksForType = this._player.getTracksFor(type);
            if (tracksForType && tracksForType.length > 0) {
                let currentTrack = this._player.getCurrentTrackFor(type);
                let quality = this._player.getQualityFor(type);
                tracks[type] = new TrackView({
                    periodId: currentTrack.streamInfo.index,
                    adaptationSetId: currentTrack.index,
                    representationId: quality,
                    type,
                    bitrate: currentTrack.bitrateList[quality].bandwidth,
                });
            }
        }
        return tracks;
    }

    getAllTracks () {
        let tracks = {};

        let periods = this._player.getStreamsFromManifest(this._manifest);
        if (periods) {
            for (let period of periods) {
                for (let type of ["audio", "video"]) {

                    tracks[type] = [];

                    let adaptationSets = this._player.getTracksForTypeFromManifest(type, this._manifest, period);
                    if (!adaptationSets) {
                        continue;
                    }

                    for (let adaptationSet of adaptationSets) {
                        for (let i = 0; i < adaptationSet.representationCount; i++) {
                            tracks[type].push(
                                new TrackView({
                                    periodId: period.index,
                                    adaptationSetId: adaptationSet.index,
                                    representationId: i,
                                    type,
                                    bitrate: adaptationSet.bitrateList[i].bandwidth,
                                })
                            );
                        }
                    }
                }
            }
        }

        return tracks;
    }
}

export default ManifestHelper;
