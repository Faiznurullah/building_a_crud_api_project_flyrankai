const express = require("express");

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("Hello, Task API!");
});

app.listen(PORT, () => {
  console.log(`Task API listening on http://localhost:${PORT}`);
});
