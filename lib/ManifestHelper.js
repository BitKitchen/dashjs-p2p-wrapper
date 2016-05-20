import TrackView from './TrackView';
import SegmentsGetter from '../node_modules/dashjs/src/dash/utils/SegmentsGetter';
import SegmentsCache from './SegmentsCache';

class ManifestHelper {

    constructor (player, manifest, dashjsInternals) {
        this._player = player;
        this._manifest = manifest;
        this._dashjsInternals = dashjsInternals;
        this._segmentsCache = new SegmentsCache(player);

        this._getSegmentsGetter = function() {
            if (!this._segmentsGetter) {
                let context = this._dashjsInternals.getContext();
                let config = this._dashjsInternals.getConfig();

                this._segmentsGetter = SegmentsGetter(context).create(config, this.isLive());
            }

            return this._segmentsGetter;
        }
    }

    getSegmentList (trackView) {

        if (this._segmentsCache.hasSegments(trackView)) {
            return this._segmentsCache.getSegments(trackView);
        }

        var dashManifestModel = this._dashjsInternals.getDashManifestModel(),
            timelineConverter = this._dashjsInternals.getTimelineConverter();

        if (!dashManifestModel || !timelineConverter) throw new Error("Tried to get representation before we could have access to dash.js manifest internals");

        var mpd = dashManifestModel.getMpd(this._manifest);
        var period = dashManifestModel.getRegularPeriods(this._manifest, mpd)[trackView.periodId];
        var adaptation = dashManifestModel.getAdaptationsForPeriod(this._manifest, period)[trackView.adaptationSetId];
        var representation = dashManifestModel.getRepresentationsForAdaptation(this._manifest, adaptation)[trackView.representationId];
        var isDynamic = this.isLive();

        representation.segmentAvailabilityRange = timelineConverter.calcSegmentAvailabilityRange(representation, isDynamic);
        var segments = this._getSegmentsGetter().getSegments(representation, 0, 0, undefined, 1000000);

        return segments;
    }

    isLive () {
        var dashManifestModel = this._dashjsInternals.getDashManifestModel();

        if (!dashManifestModel) throw new Error("Tried to get representation before we could have access to dash.js manifest internals");

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
                    representationId: quality
                });
            }
        }
        return tracks;
    }

    getAllTracks () {
        let tracks = {};

        let periods = this._player.getStreamsFromManifest(this._manifest);
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
                                representationId: i
                            })
                        );
                    }
                }
            }
        }

        return tracks;
    }
}

export default ManifestHelper;
