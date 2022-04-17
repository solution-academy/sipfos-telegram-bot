require('dotenv').config();

const { Telegraf } = require('telegraf');
const mqtt = require('./services/mqtt');

const bot = new Telegraf(process.env.BOT_TOKEN);

let statusId = null;

const devices = process.env.DEVICE_IDS.toString().split(',').map(d => ({
    status: 'pending',
    id: d,
    isUpdated: false,
    data: []
}));

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

setInterval(() => {
    for (let i = 0; i < devices.length; i++) {
        if (devices[i].isUpdated) {
            devices[i].isUpdated = false;
            devices[i].status = 'Online';
        } else {
            devices[i].status = 'Offline';
        }
    }
}, 5 * 60 * 1000);

setInterval(() => {
    let text = '';

    for (let i = 0; i < devices.length; i++) {
        let icon = `${devices[i].status === 'Online' ? '🟢' : '🔴'}`;
        if (devices[i].status === 'pending') {
            icon = '🔃';
        }

        const dataDisp = Object.keys(devices[i].data).map(key => `${key}: ${devices[i].data[key]}`).join('\n');

        text += `${devices[i].id} ${icon}\n${dataDisp}\n\n`;
    }

    const d = new Date();
    bot.telegram.sendMessage('-1001621332233', `[${d.toDateString() + ' ' + d.toTimeString()}]\n\Device update\n\n${text}\n\n🔃 - Pending\n🟢 - Online\n🔴 - Offline`);
}, 1 * 60 * 60 * 1000);

const parseData = (payload) => {
    let res = {};

    payload.toString().split('&').forEach(item => {
        const [key, value] = item.split('=');
        res[key] = value;
    });

    return res;
};

(async () => {
    try {
        const client = await mqtt.connect(process.env.MQTT_URL);

        console.log('Connected to MQTT broker');
        
        client.subscribe('sasaqua/device/+/data');
        client.subscribe('dev/test');

        client.on('message', async (topic, message) => {
            const section = topic.split('/');

            if (section[1] === 'device') {
                const deviceId = section[2];

                const device = devices.find(d => d.id === deviceId);

                const data = parseData(message);

                if (device) {
                    device.isUpdated = true;
                    device.status = 'Online';
                    device.data = data;
                }

            }
        });
        
        bot.launch();
        
        // graceful shutdown
        const shutdown = sig => {
            subscribers = [];
        
            bot.stop(sig);
            
            process.exit(0);
        }
    
        process.on('SIGTERM', () => {
            shutdown('SIGTERM');
        });
        process.on('SIGINT', () => {
            shutdown('SIGINT');
        });
    } catch (e) {
        console.log(e);

        bot.stop();

        process.exit(0);
    }
    
})();


