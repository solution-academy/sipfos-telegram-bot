const mqtt = require('mqtt');

let client;

module.exports = {
    connect: () => new Promise((resolve, reject) => {
        client = mqtt.connect(process.env.MQTT_URL, {
            username: process.env.MQTT_USERNAME,
            password: process.env.MQTT_PASSWORD,
        });

        client.on('connect', () => resolve(client));
        client.on('error', e => reject(e));
    })
}