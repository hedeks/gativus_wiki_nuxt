// Testing file upload approach in node fetch
const fs = require("fs");
const path = require("path");
const { Blob } = require("buffer");

const formData = new FormData();
const fileBuf = fs.readFileSync("package.json");
const fileBlob = new Blob([fileBuf], { type: "application/json" });
formData.append("file", fileBlob, "package.json");
console.log(formData);