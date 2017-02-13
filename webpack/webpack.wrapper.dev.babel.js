import webpack from 'webpack';
import { baseConfig, ROOT_PATH } from './webpack.base';

const { version } = require(`${ROOT_PATH}/package.json`);

export default Object.assign(baseConfig, {
    entry: [`${ROOT_PATH}/lib/DashjsWrapper.js`],

    output: {
        library: [
            'DashjsWrapper'
        ],
        libraryTarget: 'umd',
        path: `${ROOT_PATH}/dist/wrapper`,
        filename: 'dashjs-p2p-wrapper.js',
    },

    devtool: 'source-map',

    plugins: [
        new webpack.DefinePlugin({
            _VERSION_: JSON.stringify(version),
        }),
    ]
});
