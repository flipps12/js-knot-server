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

setTimeout(()=>{

knot.send_bytes('12D3KooWLXXDhgg3VuG1ZRXp5rQ8hZAUwtygB9kSeUUtuvd1cZGR', Buffer.from("Hola", 'utf-8'));
}, 1000)