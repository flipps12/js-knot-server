console.log("=======" + " Main test " + "=======");

const { KnotClient } = require("../dist/index");
const readline = require('node:readline');

const knot = new KnotClient();

knot.on('message', (msg) => {
    console.log("Mensaje entrante:", msg);
});

knot.on('byte', (msg) => {
    console.log("Mensaje entrante:", msg);
});

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

knot.send_json({
    "command": "newappname",
    "name": "jstext",
    "port": 8124
});

// knot.send_json({ 
//     "command": "getpeers",
// });

// knot.send_json({ 
//     "command": "discover", 
//     "peer_id": "12D3KooWSpdzbhGJtCT6SeqmtUqtMWWrnNgHARa1WZ1WsCr5ehzs"
// });

// setTimeout(()=>{
// knot.send_bytes('12D3KooWLXXDhgg3VuG1ZRXp5rQ8hZAUwtygB9kSeUUtuvd1cZGR', Buffer.from("Hola", 'utf-8'));
// }, 1000)

rl.question('Connect to: ', (peer) => {
    console.log(`Sending command Connect ${peer}`);
    while (true) {
        rl.question('Connect to: ', (message) => {
            // console.log(`Sending command Connect ${mesage}`);
            knot.send_bytes(peer, Buffer.from(message, 'utf-8'));
            rl.close();
        });

    }
});

