const { MongoClient } = require('mongodb');

const url = 'mongodb://127.0.0.1:27017';


let dbConnection;

module.exports = {
    connectToDb: (cb)=>{
        MongoClient.connect(url)
        .then((client)=>{
            dbConnection = client.db('Genealogy_App');
            return cb();
        })
        .catch(err=>{
            console.log(err);
            return cb(err);
        })
    },
    getDb: () => dbConnection
}