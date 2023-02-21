'use strict';
var util = require('util');

// Deps
const Path = require('path');
const JWT = require(Path.join(__dirname, '..', 'lib', 'jwtDecoder.js'));
var util = require('util');
var http = require('https');
let axios = require("axios");
const { Pool } = require('pg');

const connectionString = 'postgres://uv3bf39oboo6i:p17596604ecf6ea97e986f03bcb98f289de47a34cecc556e3703f27c088838798@ec2-52-197-48-67.ap-northeast-1.compute.amazonaws.com:5432/dadpcdirgrberd';
const databaseName = 'salesforceprod';

exports.logExecuteData = [];

function logData(req) {
    exports.logExecuteData.push({
        body: req.body,
        headers: req.headers,
        trailers: req.trailers,
        method: req.method,
        url: req.url,
        params: req.params,
        query: req.query,
        route: req.route,
        cookies: req.cookies,
        ip: req.ip,
        path: req.path,
        host: req.host,
        fresh: req.fresh,
        stale: req.stale,
        protocol: req.protocol,
        secure: req.secure,
        originalUrl: req.originalUrl
    });
    console.log("body: " + util.inspect(req.body));
    console.log("headers: " + req.headers);
    console.log("trailers: " + req.trailers);
    console.log("method: " + req.method);
    console.log("url: " + req.url);
    console.log("params: " + util.inspect(req.params));
    console.log("query: " + util.inspect(req.query));
    console.log("route: " + req.route);
    console.log("cookies: " + req.cookies);
    console.log("ip: " + req.ip);
    console.log("path: " + req.path);
    console.log("host: " + req.host);
    console.log("fresh: " + req.fresh);
    console.log("stale: " + req.stale);
    console.log("protocol: " + req.protocol);
    console.log("secure: " + req.secure);
    console.log("originalUrl: " + req.originalUrl);
}

/*
 * POST Handler for / route of Activity (this is the edit route).
 */
exports.edit = function (req, res) {
    // Data from the req and put it in an array accessible to the main app.
    //console.log( req.body );
    logData(req);
    res.send(200, 'Edit');
};

/*
 * POST Handler for /save/ route of Activity.
 */
exports.save = function (req, res) {
    // Data from the req and put it in an array accessible to the main app.
    //console.log( req.body );
    logData(req);
    res.send(200, 'Save');
};

/*
 * POST Handler for /execute/ route of Activity.
 */
exports.execute = function (req, res) {
    let responseType = '01010';  //The successful response for this is 1 

    console.log("EXECUTE HAS BEEN RUN");

    
    JWT(req.body, process.env.jwtSecret, (err, decoded) => {
        // verification error -> unauthorized request
        if (err) {
            console.error(err);
            return res.status(401).end();
        }

        if (decoded && decoded.inArguments && decoded.inArguments.length > 0) {
            console.log('##### decoded ####=>', decoded);
            
            // decoded in arguments
            var decodedArgs = decoded.inArguments[0];
            // console.log('DECODED ARGUMENTS >>> ', decodedArgs);

            logData(req);

            // This is the function that executes when a new user flows through the journey
            return res.status(200).json({branchResult: 'sell_item'});
        
        } else {
            console.error('inArguments invalid.');
            return res.status(400).end();
        }

    });
};


/*
 * POST Handler for /publish/ route of Activity.
 */
exports.publish = function (req, res) {
    
    // Data from the req and put it in an array accessible to the main app.
    //console.log( req.body );
    logData(req);
    res.send(200, 'Publish');
};

/*
 * POST Handler for /validate/ route of Activity.
 */
exports.validate = function (req, res) {
    // Data from the req and put it in an array accessible to the main app.
    //console.log( req.body );
    logData(req);
    res.send(200, 'Validate');
};

/*
 * POST Handler for /Stop/ route of Activity.
 */
exports.stop = function (req, res) {
    // Data from the req and put it in an array accessible to the main app.
    //console.log( req.body );
    logData(req);
    res.send(200, 'Stop');
};

/*
 * GET Handler for requesting the template type.
 */
exports.requestTemplate = function (req, res) {
    const tokenURL = 'https://mcrcd9q885yh55z97cmhf8r1hy80.auth.marketingcloudapis.com/v2/token';
    // const queryURL = 'https://mcrcd9q885yh55z97cmhf8r1hy80.rest.marketingcloudapis.com/asset/v1/content/categories';
    const queryURL = 'https://mcrcd9q885yh55z97cmhf8r1hy80.rest.marketingcloudapis.com/asset/v1/content/assets?$pageSize=2500&$page=1&$orderBy=name';
    
    axios.post(tokenURL, { // Retrieving of token
        grant_type: 'client_credentials',
        client_id: 'v0um1n6jfra7ipp1w3xf5fcm',
        client_secret: 'Q7CGYjWUsaJE8op6llSH0OTi'
    })
    .then(function (response) {
        let accessToken = response.data['access_token']; // After getting token, parse it through to grab the individual categories

        axios.get(queryURL, { //Query of Individual items
            headers: { Authorization: `Bearer ${accessToken}` } 
        }).then((response) => {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(response.data, null, 3));
        }).catch(function (error) {
            console.log(error);
        });

    }).catch(function (error) {
        console.log('TOKEN ERROR >>',error);
    });
};


/* 
 * Function to pull relevant data to be placed into the select field 
 * Data for this happens to be for list of field names from the table schema in salesforceprod.contact
 */
exports.requestTableColumn = function pullTableSchema (req, res) {
    const pool = new Pool({
        connectionString: connectionString
    });
    
    let queryTableSchema = `SELECT column_name,table_name FROM information_schema.COLUMNS WHERE TABLE_NAME = 'contact' AND table_schema = '${databaseName}'`;

    pool.query(queryTableSchema, (error, response) => {
        console.log('===== Querying table Schema =====');
        // console.log('RESPONSE QUERY >>',response.rows);
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(response.rows, null, 3));
        pool.end();
    });
}