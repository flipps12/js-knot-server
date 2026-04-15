console.log("=======" + " Main test " + "=======");

const { KnotClient } = require("../dist/index");

const knot = new KnotClient();

knot.on('message', (msg) => {
    console.log("Llegó un mensaje genérico:", msg);
});



knot.send_json({ 
    "command": "newappname", 
    "name": "prueba", 
    "port": 1234 
});