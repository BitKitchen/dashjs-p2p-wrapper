import Events from '../dashjs/src/core/events/Events.js';
import MediaPlayerModel from '../dashjs/src/streaming/models/MediaPlayerModel.js';
import ErrorHandler from '../dashjs/src/streaming/utils/ErrorHandler.js';
import { HTTPRequest } from '../dashjs/src/streaming/vo/metrics/HTTPRequest';

import SegmentView from './SegmentView';
import TrackView from './TrackView';

function FragmentLoaderClassProvider(wrapper) {

    const FRAGMENT_LOADER_ERROR_LOADING_FAILURE = 1;
    const FRAGMENT_LOADER_ERROR_NULL_REQUEST = 2;
    const FRAGMENT_LOADER_MESSAGE_NULL_REQUEST = 'request is null';

    this.SRFragmentLoader = function (config) {
        const context = this.context;
        const factory = this.factory;
        const parent = this.parent;
        const eventBus = factory.getSingletonInstance(context, "EventBus");

        const log = factory.getSingletonInstance(context, "Debug").log;
        const mediaPlayerModel = MediaPlayerModel(context).getInstance();
        const errHandler = config.errHandler;
        const requestModifier = config.requestModifier;
        const metricsModel = config.metricsModel;

        let instance,
            peerAgent,
            _loader,
            retryTimers,
            downloadErrorToRequestTypeMap;

        function setup() {
            peerAgent = wrapper.peerAgent;
            retryTimers = [];

            downloadErrorToRequestTypeMap = {
                [HTTPRequest.MPD_TYPE]:                         ErrorHandler.DOWNLOAD_ERROR_ID_MANIFEST,
                [HTTPRequest.XLINK_EXPANSION_TYPE]:             ErrorHandler.DOWNLOAD_ERROR_ID_XLINK,
                [HTTPRequest.INIT_SEGMENT_TYPE]:                ErrorHandler.DOWNLOAD_ERROR_ID_INITIALIZATION,
                [HTTPRequest.MEDIA_SEGMENT_TYPE]:               ErrorHandler.DOWNLOAD_ERROR_ID_CONTENT,
                [HTTPRequest.INDEX_SEGMENT_TYPE]:               ErrorHandler.DOWNLOAD_ERROR_ID_CONTENT,
                [HTTPRequest.BITSTREAM_SWITCHING_SEGMENT_TYPE]: ErrorHandler.DOWNLOAD_ERROR_ID_CONTENT,
                [HTTPRequest.OTHER_TYPE]:                       ErrorHandler.DOWNLOAD_ERROR_ID_CONTENT
            };
        }

        function _getSegmentViewForRequest(request) {
            if (request.type !== "InitializationSegment") {
                let trackView = new TrackView({
                    periodId: request.mediaInfo.streamInfo.index,
                    adaptationSetId: request.mediaInfo.index,
                    representationId: request.quality
                });

                return new SegmentView({
                    trackView,
                    timeStamp: request.startTime
                });
            }

            return null;
        }

        function _getHeadersForRequest(request) {
            // TODO: check custom headers list, probably `range` is not the only one
            let headers = {};
            if (request.range) {
                headers.Range = 'bytes=' + request.range;
            }

            return headers;
        }

        function _getSRRequest(request, headers) {
            return {
                url: requestModifier.modifyRequestURL(request.url),
                headers
            };
        }

        function load(request) {

            if (!request) {
                eventBus.trigger(Events.LOADING_COMPLETED, {
                    request: undefined,
                    error: new Error(
                        FRAGMENT_LOADER_ERROR_NULL_REQUEST,
                        FRAGMENT_LOADER_MESSAGE_NULL_REQUEST
                    )
                });

                return;
            }

            const headers = _getHeadersForRequest(request);
            const segmentView = _getSegmentViewForRequest(request);
            const srRequest = _getSRRequest(request, headers);

            const requestStartDate = new Date();
            let lastTraceDate = requestStartDate;
            const traces = [];
            let lastTraceReceivedCount = 0;
            let remainingAttempts = mediaPlayerModel.getRetryAttemptsForType(request.type);

            const sendHttpRequestMetric = function(isSuccess, responseCode) {

                request.requestStartDate = requestStartDate;
                request.firstByteDate = request.firstByteDate || requestStartDate;
                request.requestEndDate = new Date();

                metricsModel.addHttpRequest(
                    request.mediaType, // mediaType
                    null, // tcpId
                    request.type, // type
                    request.url, // url
                    null, // actualUrl
                    request.serviceLocation || null, // serviceLocation
                    request.range || null, // range
                    request.requestStartDate, // tRequest
                    request.firstByteDate, // tResponce
                    request.requestEndDate, // tFinish
                    responseCode, // responseCode
                    request.duration, // mediaDuration
                    null, // responseHeaders
                    isSuccess ? traces : null // traces
                );
            };

            // TODO: check if we should use stats here
            const onSuccess = function(segmentData/* , stats*/) {

                sendHttpRequestMetric(true, 200);

                eventBus.trigger(Events.LOADING_COMPLETED, {
                    request: request,
                    response: segmentData,
                    sender: parent
                });
            };

            const onProgress = function(stats) {

                let currentDate = new Date();

                request.firstByteDate = request.firstByteDate || currentDate;

                let bytesReceived = 0;
                if (stats.cdnDownloaded) {
                    bytesReceived += stats.cdnDownloaded;
                }
                if (stats.p2pDownloaded) {
                    bytesReceived += stats.p2pDownloaded;
                }

                traces.push({
                    s: lastTraceDate,
                    d: currentDate.getTime() - lastTraceDate.getTime(),
                    b: [bytesReceived ? bytesReceived - lastTraceReceivedCount : 0]
                });

                lastTraceDate = currentDate;
                lastTraceReceivedCount = bytesReceived;

                eventBus.trigger(Events.LOADING_PROGRESS, {
                    request: request
                });
            };

            const onError = function(xhrEvent) {
                sendHttpRequestMetric(false, xhrEvent.target.status);

                if (remainingAttempts > 0) {
                    log('Failed loading fragment: ' + request.mediaType + ':' + request.type + ':' + request.startTime + ', retry in ' + mediaPlayerModel.getRetryIntervalForType(request.type) + 'ms' + ' attempts: ' + remainingAttempts);

                    remainingAttempts--;
                    retryTimers.push(
                        setTimeout(function () {
                            load(request, remainingAttempts);
                        }, mediaPlayerModel.getRetryIntervalForType(request.type))
                    );
                } else {
                    log('Failed loading fragment: ' + request.mediaType + ':' + request.type + ':' + request.startTime + ' no retry attempts left');

                    errHandler.downloadError(
                        downloadErrorToRequestTypeMap[request.type],
                        request.url,
                        request
                    );

                    eventBus.trigger(Events.LOADING_COMPLETED, {
                        request: undefined,
                        error: new Error(
                            FRAGMENT_LOADER_ERROR_LOADING_FAILURE,
                            "failed loading fragment"
                        )
                    });
                }
            };

            _loader = peerAgent.getSegment(
                srRequest,
                {
                    onSuccess,
                    onProgress,
                    onError
                },
                segmentView
            );
        }

        function abort() {
            retryTimers.forEach(t => clearTimeout(t));
            retryTimers = [];

            if (_loader) {
                _loader.abort();
            }
            _loader = null;
        }

        // FIXME: why do we need two functions that do the exact same thing?
        function reset() {
            abort();
        }

        instance = {
            load,
            abort,
            reset
        };

        setup();

        return instance;
    };
}

export default FragmentLoaderClassProvider;
