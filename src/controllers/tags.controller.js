'use strict';

import log from '../log';
import mongoose from 'mongoose';
import redis from '../services/redis.service';

const SET_NAME = 'tags';

const sendJSONResponse = (res, status, content = {}) => {
    res.status(status);
    res.json(content);
};

/**
 * ROUTE: tags/
 */

const TagsController = {
    post: (req, res) => {
        const tag = req.body.tag;
        redis.addNew(tag, SET_NAME)
            .then((result) => {
                log.info(result);
                sendJSONResponse(res, result.status, {
                    data: result.data
                });
            }).catch((err) => {
                log.info(err);
                sendJSONResponse(res, err.status, {
                    error: err.error
                });
            });
    },
    getPrefixes: async (req, res) => {
        const prefix = req.body.prefix;
        const count = req.body.count;
        redis.getPrefixes(prefix, count, SET_NAME)
            .then((result) => {
                log.info(result);
                sendJSONResponse(res, result.status, {
                    data: result.data
                })
            }).catch((err) => {
                log.info(err);
                sendJSONResponse(res, err.status, {
                    error: err.error
                });
            });
    },
    getTagsByPopularity: (req, res) => {
        try {
            mongoose.model('BlogPost').find({}, {tags: 1, _id: 0}, (err, tagSet) => {
                if (err) {
                    sendJSONResponse(res, 404, {
                        error: err || 'Blog Post Not Found'
                    });
                } else {
                    const allTags = {};
                    tagSet.forEach((set) => {
                        const tags = set.tags;
                        tags.forEach((tag) => {
                            allTags[tag] = allTags[tag] ? allTags[tag] + 1 : 1;
                        });
                    });
                    // Potentially usable later if we want the top 100 tags
                    // allTags.sort((t1, t2) => {
                    //     return allTags[t1] < allTags[t1] ? 1 : -1;
                    // }).slice(0, 100);
                    sendJSONResponse(res, 200, {
                        data: allTags
                    });
                }
            });
        } catch (e) {
            sendJSONResponse(res, 500, {
                error: 'Error!' + e
            });
        }
    },
    getArticleByTag: (req, res) => {
        try {
            const tag = req.params.tag;
            mongoose.model('BlogPost').find({
                tags: tag
            }, (err, posts) => {
                if (err) {
                    sendJSONResponse(res, 404, {
                        error: err || 'Blog Post Not Found'
                    });
                } else {
                    sendJSONResponse(res, 200, {
                        data: posts
                    });
                }
            });
        } catch (e) {
            sendJSONResponse(res, 500, {
                error: 'Error!' + e
            });
        }
    }
};

export default TagsController;
