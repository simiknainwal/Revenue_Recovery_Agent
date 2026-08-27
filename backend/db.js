// This gives the rest of the application a function for connecting to Oracle.
const oracledb = require("oracledb");
oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;

async function getConnection() {
    return await oracledb.getConnection({
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        connectString: process.env.DB_CONNECT_STRING
    });
}


module.exports = { getConnection };