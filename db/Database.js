const mongoose = require("mongoose");
require("dotenv").config();
const connectDatabase = () => {
  mongoose
    .connect(process.env.DB_URL, {
      dbName: process.env.DB_NAME,
      useNewUrlParser: true,
      useUnifiedTopology: true,
    })
    .then((data) => {
      console.log(`mongod connected with server: ${data.connection.host} dbName: ${process.env.DB_NAME}`);
    });
};

module.exports = connectDatabase;
