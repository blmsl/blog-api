'use strict';

import jwt from 'jsonwebtoken';
import {config} from '../config';

const sendJSONresponse = (res, status, content) => {
    res.status(status);
    res.json(content);
};

/**
 * ROUTE: jwt/expired
 */

const JwtController = {
    post: (req, res) => {
        if (!req.headers.authorization) {
            sendJSONresponse(res, 401, {
                message: 'Authorization header not included'
            });
            return;
        }
        const authorizationHeader = req.headers.authorization;
        if (authorizationHeader.startsWith('Bearer ')) {
            const token = authorizationHeader.slice(7);
            jwt.verify(token, config.secret, err => {
                if (err) {
                    sendJSONresponse(res, 401, {
                        message: 'JWT is expired'
                    });
                }
            });
        }
    }
};

export default JwtController;