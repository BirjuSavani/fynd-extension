'use strict';

require("dotenv").config();
const app = require("./server");
const port = process.env.BACKEND_PORT || 8081;

app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`)
});