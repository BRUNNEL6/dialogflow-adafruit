
const Stream = require('./stream');
const username = process.env.ADAFRUIT_USERNAME;
const key = process.env.ADAFRUIT_KEY;
const feedIdIn = process.env.ADAFRUIT_FEED_ID_IN;
const rxjs = require('rxjs');
const { logInfo, logSuccess, logErrorAndExit } = require('./logger');

const host = 'io.adafruit.com';
const port = 8883;



class IncomingStream {
    constructor() {
        this.messageStore = [];
        this.listenerStore = [];
        this.stream = new Stream({
            type: 'feeds',
            username,
            key,
            host,
            port,
            id: feedIdIn
        });
    }

    _getListeneterByRequestId(requestId) {
        return this.listenerStore.filter(listener => listener.requestId === requestId)
    }

    _emitToListeners() {
        this.messageStore.forEach((message, index) => {
            logInfo(`Message found for ${message.requestId}`);
            this._getListeneterByRequestId(message.requestId)
                .forEach(listener => listener.resolve(message));
            this.messageStore.splice(index, 1);
        });
    }

    connect() {
        setInterval(() => this._emitToListeners(), 1000);
        return new Promise((resolve, reject) => {
            this.stream.connect();
            this.stream.on('connected', () => {
                logSuccess(`Connected to stream`);
                logInfo(`Listening to stream`);
                this.listen().subscribe(() => this._emitToListeners());;
                resolve()
            });
        });
    }

    listen() {
        return rxjs.Observable.create(observer => {
            this.stream.on('message', data => {
                const parsedData = JSON.parse(data.toString('utf8'));
                logInfo('Received message ' + JSON.stringify(parsedData));
                this.messageStore.push(JSON.parse(parsedData.data.value));
                observer.next(JSON.parse(parsedData.data.value));
            });
        });
    }

    async waitForNextMessage(requestId) {
        return new Promise((resolve, reject) => {
            this.listenerStore.push({ requestId, resolve, reject });
        });

    }
}

module.exports = IncomingStream;


