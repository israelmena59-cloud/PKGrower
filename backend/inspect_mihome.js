const miHome = require('node-mihome');
const cloud = miHome.miCloudProtocol;

console.log('--- MiCloud Protocol Exports ---');
console.log(Object.keys(cloud));
console.log(Object.getOwnPropertyNames(Object.getPrototypeOf(cloud)));

// Intento de llamar login para ver si devuelve objeto o promesa simple
console.log('--- Function Signatures ---');
console.log('login:', cloud.login.toString().split('\n')[0]);
if (cloud.submit2FA) console.log('submit2FA detected!');
