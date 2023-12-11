// utils/db.js

const { MongoClient } = require('mongodb');

const uri = 'mongodb://localhost:27017/videoConferenceApp'; // Replace your_database_name with the desired name
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

async function connectToDatabase() {
    try {
        await client.connect();
        console.log('Connected to the database');
        return client.db('videoConferenceApp'); // Change 'videoConferenceApp' to your desired database name
    } catch (error) {
        console.error('Error connecting to the database:', error);
        throw error;
    }
}

module.exports = connectToDatabase;
