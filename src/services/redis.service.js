'use strict';
import redis from 'redis';
import log from '../log';

const client = redis.createClient();

client.on('error', err => {
    log.critical('Error ' + err);
});

/**
 * Promisify the zadd command
 * @param {String} setName - The name of the sorted set 
 * @param {Number} start - The beginning of the sorted set
 * @param {String} prefix - The prefix of the string you want to check 
 * @returns {Promise} - Either the zrank command command succeeds or fails
 */
function zadd(setName, start, prefix) {
    return new Promise((resolve, reject) => {
        try {
            client.zadd(setName, start, prefix, (err, result) => {
                if (err) {
                    reject(err);
                }
                resolve(result);
            });
        } catch (e) {
            reject(e);
        }
    });
}

/**
 * Promisify the zrank command
 * @param {String} setName - The name of the sorted set 
 * @param {String} prefix - The prefix of the string you want to check 
 * @returns {Promise} - Either the zrank command command succeeds or fails
 */
function zrank(setName, prefix) {
    return new Promise((resolve, reject) => {
        try {
            client.zrank(setName, prefix, (err, result) => {
                if (err) {
                    reject(err);
                }
                resolve(result);
            });
        } catch (e) {
            reject(e);
        }
    });
}

/**
 * Promisify the zrange command
 * @param {String} setName - The name of the sorted set 
 * @param {Number} start - The beginning of the range
 * @param {Number} end - The end of the range 
 * @returns {Promise} Either the zrange commands succeeds or fails
 */
function zrange(setName, start, end) {
    return new Promise((resolve, reject) => {
        try {
            if(!setName || !start || !end) {
                log.info(setName);
                log.info(start);
                log.info(end);
                reject('Either the start or end is not defined');
            }
            client.zrange(setName, start, end, (err, range) => {
                if (err) {
                    reject(err);
                }
                resolve(range);
            });
        } catch (e) {
            reject(e);
        }
    });
}

const RedisService = {
    addNew: (word, setName) => {
        return new Promise((resolve, reject) => {
            let adds = [];
            for (let i = 0; i < word.length; i++) {
                const prefix = word.slice(0, i);
                adds.push(zadd(setName, 0, prefix));
            }
            adds.push(zadd(setName, 0, word + '*'));
            Promise.all(adds)
                .then(() => {
                    resolve({
                        status: 204,
                        data: ''
                    });
                })
                .catch((err) => {
                    reject({
                        actualError: err,
                        error: 'An error occured while trying to add a prefix to the database',
                        status: 400
                    });
                });
        })
    },
    getPrefixes: (prefix, count, setName) => {
        return new Promise(async (resolve, reject) => {
            try {
                const results = [];
                const rangeLen = 50;
                if (!prefix || !count) {
                    reject({
                        status: 400,
                        error: 'Prefix or count was not included in the body of the request'
                    });
                } else {
                    let start = await zrank(setName, prefix);
        
                    if (!start) {
                        start = await zrank(setName, prefix + "*");
                        if (!start) {
                            resolve({
                                status: 200,
                                data: results
                            });
                        }
                    }
        
                    while (results.length !== count) {
                        let range = await zrange(setName, start, start + rangeLen - 1)
                        start += rangeLen;
                        if (!range || range.length === 0) {
                            break;
                        }
                        // eslint-disable-next-line
                        range.forEach((entry, index) => {
                            const minLength = Math.min(entry.length, prefix.length);
                            if (entry.slice(0, minLength) !== prefix.slice(0, minLength)) {
                                count = results.length;
                                return;
                            }
                            if (entry.slice(-1) === '*' && results.length !== count) {
                                results.push(entry.slice(0, -1));
                            }
                        });
                    }
                    resolve({
                        status: 200,
                        data: results
                    });
                }
            } catch (e) {
                reject({
                    status: 500,
                    error: 'An error has occured: ' + e
                });
            }
        })
    } 
};

export default RedisService;